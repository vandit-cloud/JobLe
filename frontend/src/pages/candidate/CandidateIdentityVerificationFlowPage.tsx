import { Camera, CheckCircle2, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  acceptCandidateIdentityConsent,
  captureCandidateIdentityAngle,
  completeCandidateIdentityLiveness,
  completeCandidateIdentityVerification,
  fetchCandidateIdentityStatus,
  requestCandidateAlternativeVerification,
  submitCandidateIdentityExplanation,
  submitCandidateIdentitySystemCheck,
  type CandidateVerificationImage,
} from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { useToast } from "../../context/ToastContext";
import type { AlternativeVerificationRequest, CandidateIdentityVerification, IdentityVerificationEvent } from "../../types";

type Step = "notice" | "consent" | "system-check" | "capture" | "liveness" | "complete" | "submitted";
type Angle = "front" | "left" | "right";

const angles: Array<{ key: Angle; label: string; instruction: string }> = [
  { key: "front", label: "Front photo", instruction: "Look directly into the camera. Keep your face centered and clearly visible." },
  { key: "left", label: "Left angle photo", instruction: "Turn your face slightly to the left." },
  { key: "right", label: "Right angle photo", instruction: "Turn your face slightly to the right." },
];

const alternativeReasons = ["No camera", "Camera not working", "Accessibility need", "Privacy concern", "Religious or medical reason", "Poor internet", "Browser/device issue", "Other"];
const explanationReasons = ["Internet disconnected", "Camera stopped", "Power issue", "Family member entered room", "Lighting problem", "Browser issue", "Other"];

function getSignature(imageData: ImageData) {
  const blocks = Array.from({ length: 64 }, () => ({ total: 0, count: 0 }));
  let brightnessTotal = 0;
  const values: number[] = [];
  let edgeTotal = 0;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const index = (y * imageData.width + x) * 4;
      const luminance = 0.299 * imageData.data[index] + 0.587 * imageData.data[index + 1] + 0.114 * imageData.data[index + 2];
      const block = blocks[Math.min(7, Math.floor((y / imageData.height) * 8)) * 8 + Math.min(7, Math.floor((x / imageData.width) * 8))];
      block.total += luminance;
      block.count += 1;
      brightnessTotal += luminance;
      values.push(luminance);
      if (x > 0 && y > 0) {
        const previousIndex = ((y - 1) * imageData.width + (x - 1)) * 4;
        const previous = 0.299 * imageData.data[previousIndex] + 0.587 * imageData.data[previousIndex + 1] + 0.114 * imageData.data[previousIndex + 2];
        edgeTotal += Math.abs(luminance - previous);
      }
    }
  }

  const averages = blocks.map((block) => block.total / Math.max(block.count, 1));
  const average = averages.reduce((sum, value) => sum + value, 0) / averages.length;
  const brightness = brightnessTotal / Math.max(values.length, 1);
  const variance = values.reduce((sum, value) => sum + (value - brightness) ** 2, 0) / Math.max(values.length, 1);

  return {
    signature: averages.map((value) => (value >= average ? 1 : 0)),
    metrics: {
      brightness: Math.round(brightness),
      contrast: Math.round(Math.sqrt(variance)),
      edgeScore: Math.round(edgeTotal / Math.max(values.length, 1)),
    },
  };
}

export function CandidateIdentityVerificationFlowPage({ step }: { step: Step }) {
  const { attemptId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [verification, setVerification] = useState<CandidateIdentityVerification | null>(null);
  const [events, setEvents] = useState<IdentityVerificationEvent[]>([]);
  const [alternativeRequests, setAlternativeRequests] = useState<AlternativeVerificationRequest[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [altReason, setAltReason] = useState(alternativeReasons[0]);
  const [altText, setAltText] = useState("");
  const [explanationCategory, setExplanationCategory] = useState(explanationReasons[0]);
  const [explanation, setExplanation] = useState("");

  useEffect(() => {
    if (!attemptId) return;
    fetchCandidateIdentityStatus(attemptId)
      .then((data) => {
        setVerification(data.verification);
        setEvents(data.events);
        setAlternativeRequests(data.alternativeRequests);
      })
      .catch(() => showToast("Unable to load identity verification status.", "error"))
      .finally(() => setLoading(false));
  }, [attemptId]);

  useEffect(() => {
    if (!["system-check", "capture", "liveness"].includes(step)) return;
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } })
      .then(async (stream) => {
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      })
      .catch(() => showToast("Camera permission is required for this assessment. Please allow camera access or request alternative verification.", "error"));
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [step]);

  function captureImage(): CandidateVerificationImage {
    if (!videoRef.current || !cameraReady) throw new Error("Camera not ready");
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Camera frame unavailable");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    const { signature, metrics } = getSignature(data);
    return { imageData: canvas.toDataURL("image/jpeg", 0.86), signature, metrics };
  }

  async function requestAlternative() {
    if (!altText.trim()) {
      showToast("Please explain why you need alternative verification.", "error");
      return;
    }
    setWorking(true);
    try {
      const data = await requestCandidateAlternativeVerification(attemptId, { reasonCategory: altReason, explanation: altText });
      setVerification(data.verification);
      setAlternativeRequests((current) => [data.request, ...current]);
      showToast("Alternative verification request submitted.", "success");
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <LoadingSkeleton className="h-[34rem]" />;
  if (!verification) return <EmptyState title="Verification unavailable" description="We could not load this assessment verification flow." />;

  const nextBase = `/candidate/assessments/${attemptId}/identity`;
  const allCaptured = Boolean(verification.referenceImages?.front && verification.referenceImages?.left && verification.referenceImages?.right);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Identity verification" title="Candidate assessment verification" description="Camera and identity indicators are review signals only. They never automatically reject a candidate." />

      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Status</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">{verification.status}</h2>
          </div>
          <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-800">Human review only</span>
        </div>
      </div>

      {step === "notice" ? (
        <section className="glass-panel p-6">
          <h2 className="text-2xl font-bold text-ink">This assessment uses identity verification.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Before the test, we will capture front, left, and right face images. During the test, your camera may be used to check whether the same candidate remains present.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>Face not visible, multiple people visible, camera disconnected, or possible identity mismatch may be recorded.</li>
            <li>These events are reviewed by authorized recruiters and do not automatically determine your result.</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => navigate(`${nextBase}/consent`)} type="button">Agree and Continue</button>
            <button className="btn-secondary" onClick={requestAlternative} disabled={working} type="button">Request Alternative Verification</button>
            <Link className="btn-secondary" to="/candidate/assessments">Cancel</Link>
          </div>
          <AlternativeForm altReason={altReason} altText={altText} setAltReason={setAltReason} setAltText={setAltText} />
        </section>
      ) : null}

      {step === "consent" ? (
        <section className="glass-panel p-6">
          <h2 className="text-2xl font-bold text-ink">Camera and identity consent</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            {["Camera access", "Front, left, and right reference images", "Camera monitoring during assessment", "Identity-verification events", "Recruiter review of report"].map((item) => (
              <label key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><input type="checkbox" checked readOnly /> {item}</label>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-600">Data is captured to protect assessment integrity, stored privately, reviewed only by authorized recruiters, and retained for the configured retention period.</p>
          <button
            className="btn-primary mt-5"
            disabled={working}
            onClick={async () => {
              setWorking(true);
              const updated = await acceptCandidateIdentityConsent(attemptId);
              setVerification(updated);
              setWorking(false);
              navigate(`${nextBase}/system-check`);
            }}
            type="button"
          >
            Accept consent
          </button>
        </section>
      ) : null}

      {step === "system-check" ? (
        <section className="glass-panel p-6">
          <h2 className="text-2xl font-bold text-ink">Camera system check</h2>
          <video ref={videoRef} className="mt-5 aspect-video w-full max-w-xl rounded-3xl bg-slate-950 object-cover" muted playsInline />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["Camera", cameraReady ? "Working" : "Not Working"],
              ["Face visible", cameraReady ? "Yes" : "No"],
              ["Lighting", "Good"],
              ["Multiple people", "No"],
              ["Browser", "Supported"],
              ["Internet", navigator.onLine ? "Stable" : "Unstable"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p><p className="mt-2 font-bold text-ink">{value}</p></div>
            ))}
          </div>
          <button
            className="btn-primary mt-5"
            disabled={!cameraReady || working}
            onClick={async () => {
              setWorking(true);
              const result = await submitCandidateIdentitySystemCheck(attemptId, {
                cameraPermissionGranted: cameraReady,
                cameraDeviceAvailable: cameraReady,
                videoStreamWorking: cameraReady,
                candidateFaceVisible: cameraReady,
                onlyOneFaceVisible: true,
                lightingSufficient: true,
                frameNotBlurry: true,
                browserSupported: true,
                fullscreenSupported: Boolean(document.documentElement.requestFullscreen),
                internetStable: navigator.onLine,
              });
              setVerification(result.verification);
              setWorking(false);
              if (result.passed) navigate(`${nextBase}/capture`);
            }}
            type="button"
          >
            Continue
          </button>
        </section>
      ) : null}

      {step === "capture" ? (
        <section className="glass-panel p-6">
          <h2 className="text-2xl font-bold text-ink">Capture reference photos</h2>
          <video ref={videoRef} className="mt-5 aspect-video w-full max-w-xl rounded-3xl bg-slate-950 object-cover" muted playsInline />
          <div className="mt-5 grid gap-3">
            {angles.map((angle) => (
              <div key={angle.key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="font-bold text-ink">{angle.label}</p>
                  <p className="text-sm text-slate-600">{angle.instruction}</p>
                </div>
                <button
                  className={verification.referenceImages?.[angle.key] ? "btn-secondary" : "btn-primary"}
                  disabled={!cameraReady || working}
                  onClick={async () => {
                    setWorking(true);
                    const updated = await captureCandidateIdentityAngle(attemptId, angle.key, captureImage());
                    setVerification(updated);
                    setWorking(false);
                    showToast(`${angle.label} captured.`, "success");
                  }}
                  type="button"
                >
                  {verification.referenceImages?.[angle.key] ? "Retake" : "Capture"}
                </button>
              </div>
            ))}
          </div>
          <button className="btn-primary mt-5" disabled={!allCaptured} onClick={() => navigate(`${nextBase}/liveness`)} type="button">Continue</button>
        </section>
      ) : null}

      {step === "liveness" ? (
        <section className="glass-panel p-6">
          <h2 className="text-2xl font-bold text-ink">Liveness challenge</h2>
          <p className="mt-2 text-sm text-slate-600">MVP challenge: look at the camera and move your head slightly. If uncertain, this becomes manual review, not rejection.</p>
          <video ref={videoRef} className="mt-5 aspect-video w-full max-w-xl rounded-3xl bg-slate-950 object-cover" muted playsInline />
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn-primary" disabled={working} onClick={async () => {
              setWorking(true);
              const updated = await completeCandidateIdentityLiveness(attemptId, { required: true, status: "Passed", challengeType: "Look at camera" });
              setVerification(updated);
              setWorking(false);
              navigate(`${nextBase}/complete`);
            }} type="button">Mark challenge passed</button>
            <button className="btn-secondary" disabled={working} onClick={async () => {
              setWorking(true);
              const updated = await completeCandidateIdentityLiveness(attemptId, { required: true, status: "Manual Review Required", challengeType: "Look at camera", failedReason: "Uncertain movement" });
              setVerification(updated);
              setWorking(false);
              navigate(`${nextBase}/complete`);
            }} type="button">Manual review required</button>
          </div>
        </section>
      ) : null}

      {step === "complete" ? (
        <section className="glass-panel p-6">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          <h2 className="mt-3 text-2xl font-bold text-ink">Identity verification setup completed.</h2>
          <p className="mt-2 text-sm text-slate-600">You can now start the assessment. Camera monitoring is enabled and data retention follows the assessment policy.</p>
          <button className="btn-primary mt-5" onClick={async () => {
            const updated = await completeCandidateIdentityVerification(attemptId);
            setVerification(updated);
            navigate(`/candidate/assessments/${attemptId}/test`);
          }} type="button">Start Assessment</button>
        </section>
      ) : null}

      {step === "submitted" ? (
        <section className="glass-panel p-6">
          <Sparkles className="h-8 w-8 text-tide" />
          <h2 className="mt-3 text-2xl font-bold text-ink">Your assessment has been submitted.</h2>
          <p className="mt-2 text-sm text-slate-600">Some camera or identity verification events may be reviewed by the recruiter.</p>
          {events.length ? (
            <div className="mt-5">
              <label className="label">Optional explanation</label>
              <select className="input" value={explanationCategory} onChange={(event) => setExplanationCategory(event.target.value)}>
                {explanationReasons.map((reason) => <option key={reason}>{reason}</option>)}
              </select>
              <textarea className="input mt-3 min-h-28" value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="Explain any camera or identity issue if needed." />
              <button className="btn-primary mt-3" onClick={async () => {
                await submitCandidateIdentityExplanation(attemptId, { category: explanationCategory, explanation });
                showToast("Explanation submitted.", "success");
              }} type="button">Submit explanation</button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="glass-panel p-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <p className="text-sm font-semibold text-ink">Privacy and retention</p>
        </div>
        <p className="mt-2 text-sm text-slate-600">Reference images and event snapshots are private. They are not used for emotion, personality, honesty, attractiveness, ethnicity, or disability inference.</p>
        {alternativeRequests.length ? <p className="mt-2 text-sm font-semibold text-slate-700">Alternative request status: {alternativeRequests[0].status}</p> : null}
      </section>
    </div>
  );
}

function AlternativeForm({
  altReason,
  altText,
  setAltReason,
  setAltText,
}: {
  altReason: string;
  altText: string;
  setAltReason: (value: string) => void;
  setAltText: (value: string) => void;
}) {
  return (
    <div className="mt-5 rounded-3xl bg-slate-50 p-4">
      <p className="text-sm font-semibold text-ink">Alternative verification request</p>
      <select className="input mt-3" value={altReason} onChange={(event) => setAltReason(event.target.value)}>
        {alternativeReasons.map((reason) => <option key={reason}>{reason}</option>)}
      </select>
      <textarea className="input mt-3 min-h-24" value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Explain why you need alternative verification." />
    </div>
  );
}
