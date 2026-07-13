import { ArrowLeft, Camera, CheckCircle2, ClipboardCheck, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchCandidateSkillPassport,
  recordCandidateSkillProctoringCheck,
  retakeCandidateSkillVerificationPhoto,
  startCandidateStandardSkillTest,
  submitCandidateSkillIdentityVerification,
  submitCandidateStandardSkillTest,
  type CandidateVerificationImage,
} from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { StatisticCard } from "../../components/common/StatisticCard";
import { useToast } from "../../context/ToastContext";
import type { SkillPassport } from "../../types";

type VerificationAngle = "front" | "left" | "right";

const ANGLES: Array<{ key: VerificationAngle; label: string; instruction: string }> = [
  { key: "front", label: "Front", instruction: "Look straight into the camera." },
  { key: "left", label: "Left", instruction: "Turn your face slightly to your left." },
  { key: "right", label: "Right", instruction: "Turn your face slightly to your right." },
];

function getImageSignature(imageData: ImageData) {
  const blocks = Array.from({ length: 64 }, () => ({ total: 0, count: 0 }));
  let brightnessTotal = 0;
  let edgeTotal = 0;
  const luminanceValues: number[] = [];

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const index = (y * imageData.width + x) * 4;
      const luminance = 0.299 * imageData.data[index] + 0.587 * imageData.data[index + 1] + 0.114 * imageData.data[index + 2];
      const blockX = Math.min(7, Math.floor((x / imageData.width) * 8));
      const blockY = Math.min(7, Math.floor((y / imageData.height) * 8));
      const block = blocks[blockY * 8 + blockX];
      block.total += luminance;
      block.count += 1;
      brightnessTotal += luminance;
      luminanceValues.push(luminance);
      if (x > 0 && y > 0) {
        const previousIndex = ((y - 1) * imageData.width + (x - 1)) * 4;
        const previous = 0.299 * imageData.data[previousIndex] + 0.587 * imageData.data[previousIndex + 1] + 0.114 * imageData.data[previousIndex + 2];
        edgeTotal += Math.abs(luminance - previous);
      }
    }
  }

  const blockAverages = blocks.map((block) => block.total / Math.max(block.count, 1));
  const average = blockAverages.reduce((sum, value) => sum + value, 0) / blockAverages.length;
  const brightness = brightnessTotal / Math.max(luminanceValues.length, 1);
  const variance = luminanceValues.reduce((sum, value) => sum + (value - brightness) ** 2, 0) / Math.max(luminanceValues.length, 1);

  return {
    signature: blockAverages.map((value) => (value >= average ? 1 : 0)),
    metrics: {
      brightness: Math.round(brightness),
      contrast: Math.round(Math.sqrt(variance)),
      edgeScore: Math.round(edgeTotal / Math.max(luminanceValues.length, 1)),
    },
  };
}

export function CandidateSkillTestPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [passport, setPassport] = useState<SkillPassport | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [verificationPhotos, setVerificationPhotos] = useState<Partial<Record<VerificationAngle, CandidateVerificationImage>>>({});
  const [lastLiveCheck, setLastLiveCheck] = useState<NonNullable<SkillPassport["identityVerification"]>["lastCheck"] | null>(null);

  useEffect(() => {
    fetchCandidateSkillPassport()
      .then(setPassport)
      .catch(() => showToast("Unable to load your standard skill test.", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
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
        setCameraError("");
      } catch {
        setCameraError("Camera access is required for identity verification before and during the skill test.");
      }
    }

    startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function captureCameraImage(): CandidateVerificationImage {
    if (!videoRef.current || !cameraReady) {
      throw new Error("Camera is not ready yet.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to read camera frame.");
    }

    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const { signature, metrics } = getImageSignature(imageData);
    return {
      imageData: canvas.toDataURL("image/jpeg", 0.86),
      signature,
      metrics,
    };
  }

  useEffect(() => {
    if (!cameraReady || passport?.currentTest?.status !== "In Progress" || passport.identityVerification?.status !== "Verified") return;

    const interval = window.setInterval(() => {
      try {
        const image = captureCameraImage();
        recordCandidateSkillProctoringCheck(image)
          .then((check) => setLastLiveCheck(check || null))
          .catch(() => {
            setLastLiveCheck({
              status: "Review Required",
              confidence: 0,
              issues: ["Live identity check could not be completed."],
              checkedAt: new Date().toISOString(),
            });
          });
      } catch {
        setLastLiveCheck({
          status: "Review Required",
          confidence: 0,
          issues: ["Camera frame was unavailable during the live check."],
          checkedAt: new Date().toISOString(),
        });
      }
    }, 60000);

    return () => window.clearInterval(interval);
  }, [cameraReady, passport?.currentTest?.status, passport?.identityVerification?.status]);

  async function captureAngle(angle: VerificationAngle, saveImmediately = false) {
    try {
      const image = captureCameraImage();
      if (saveImmediately) {
        setVerificationPhotos((current) => ({ ...current, [angle]: image }));
        setVerifying(true);
        const updated = await retakeCandidateSkillVerificationPhoto(angle, image);
        setPassport(updated);
        showToast(`${angle} verification photo retaken and saved.`, "success");
        return;
      }
      setVerificationPhotos((current) => ({ ...current, [angle]: image }));
      showToast(`${angle} verification photo captured.`, "success");
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Camera is not ready. Please allow camera access and try again.", "error");
    } finally {
      setVerifying(false);
    }
  }

  async function submitIdentityVerification() {
    const front = verificationPhotos.front;
    const left = verificationPhotos.left;
    const right = verificationPhotos.right;
    if (!front || !left || !right) {
      showToast("Capture front, left, and right photos first.", "error");
      return;
    }

    try {
      setVerifying(true);
      const updated = await submitCandidateSkillIdentityVerification({ front, left, right });
      setPassport(updated);
      setVerificationPhotos({});
      if (updated.identityVerification?.status === "Verified") {
        showToast("Identity verification completed. You can start the test now.", "success");
      } else {
        showToast("Verification needs better photos. Improve lighting and capture again.", "error");
      }
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Unable to verify identity photos.", "error");
    } finally {
      setVerifying(false);
    }
  }

  async function startTest() {
    try {
      setStarting(true);
      const updated = await startCandidateStandardSkillTest();
      setPassport(updated);
      setAnswers({});
      showToast("Standard skill test started.", "success");
    } catch {
      showToast("Confirm at least one skill before starting the test.", "error");
    } finally {
      setStarting(false);
    }
  }

  async function submitTest() {
    try {
      setSubmitting(true);
      const identityCheckImage = captureCameraImage();
      await submitCandidateStandardSkillTest(answers, identityCheckImage);
      showToast("Skill passport verified.", "success");
      navigate("/candidate/skill-result", { replace: true });
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Unable to submit this test right now.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSkeleton className="h-[36rem]" />;

  if (!passport) {
    return <EmptyState title="Skill test unavailable" description="Confirm your resume skills first, then return to start the standard test." />;
  }

  const questions = passport.currentTest?.status === "In Progress" ? passport.currentTest.questions : [];
  const answeredCount = questions.filter((question) => (answers[question.questionId] || []).length > 0).length;
  const identityVerified = passport.identityVerification?.status === "Verified";
  const hasAnyRetakenPhoto = Boolean(verificationPhotos.front || verificationPhotos.left || verificationPhotos.right);
  const hasCompleteLocalVerification = Boolean(verificationPhotos.front && verificationPhotos.left && verificationPhotos.right);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Standard verification"
        title="Skill Test"
        description="Answer standardized questions selected from your confirmed skills. Your result will update the public Skill Passport after submission."
        action={
          <Link className="btn-secondary" to="/candidate/resume/skill-passport">
            <ArrowLeft className="h-4 w-4" />
            Back to passport
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatisticCard title="Duration" value={`${passport.testPlan.durationMinutes} min`} icon={ClipboardCheck} />
        <StatisticCard title="Questions" value={questions.length || passport.testPlan.sections.reduce((sum, section) => sum + section.questionCount, 0)} icon={ShieldCheck} accent="from-emerald-200/35 to-white" />
        <StatisticCard title="Answered" value={`${answeredCount}/${questions.length || 0}`} icon={ClipboardCheck} accent="from-sky-200/35 to-white" />
      </div>

      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Candidate verification</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Face check before test</h2>
            <p className="mt-2 text-sm text-slate-600">
              Capture front, left, and right photos. A live camera snapshot is checked again when you submit the test.
            </p>
          </div>
          <span className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] ${identityVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {passport.identityVerification?.status || "Not Started"}
          </span>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[24rem_1fr]">
          <div>
            <video ref={videoRef} className="aspect-video w-full rounded-3xl bg-slate-950 object-cover shadow-inner" muted playsInline />
            {cameraError ? (
              <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{cameraError}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-600">{cameraReady ? "Camera ready for verification." : "Starting camera..."}</p>
            )}
          </div>

          <div className="grid gap-3">
            {ANGLES.map((angle) => {
              const localPhoto = verificationPhotos[angle.key];
              const savedPhoto = passport.identityVerification?.photos?.find((photo) => photo.angle === angle.key);
              const captured = localPhoto || savedPhoto;
              const shouldSaveRetakeImmediately = Boolean(savedPhoto);
              return (
                <div key={angle.key} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-start gap-4">
                        {localPhoto ? (
                          <img alt={`${angle.label} retake preview`} className="h-20 w-28 rounded-2xl object-cover" src={localPhoto.imageData} />
                        ) : savedPhoto?.previewUrl ? (
                          <img alt={`${angle.label} saved preview`} className="h-20 w-28 rounded-2xl object-cover" src={`${apiBaseUrl}${savedPhoto.previewUrl.replace(/^\/api/, "")}?t=${savedPhoto.capturedAt || ""}`} />
                        ) : null}
                        <div>
                          <p className="font-bold text-ink">{angle.label} angle</p>
                          <p className="mt-1 text-sm text-slate-600">{angle.instruction}</p>
                        </div>
                      </div>
                      {localPhoto ? (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          {savedPhoto ? "Latest retake preview saved." : "New photo captured. Verify identity photos to save."}
                        </p>
                      ) : captured && "qualityScore" in captured ? (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          AI quality {captured.qualityScore}% - {captured.aiDecision}
                        </p>
                      ) : null}
                    </div>
                    <button className={captured ? "btn-secondary" : "btn-primary"} disabled={!cameraReady || verifying || questions.length > 0} onClick={() => void captureAngle(angle.key, shouldSaveRetakeImmediately)} type="button">
                      {captured ? <RotateCcw className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                      {captured ? "Retake" : "Capture"}
                    </button>
                  </div>
                </div>
              );
            })}

            {(!identityVerified || hasAnyRetakenPhoto) && !questions.length ? (
              <button className="btn-primary" disabled={!cameraReady || verifying || !hasCompleteLocalVerification} onClick={submitIdentityVerification} type="button">
                {verifying ? "Checking photos..." : identityVerified ? "Save retaken identity photos" : "Verify identity photos"}
              </button>
            ) : null}
            {hasAnyRetakenPhoto && !hasCompleteLocalVerification && !questions.length ? (
              <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                Retake all three angles before saving the updated verification photos.
              </p>
            ) : null}

            {passport.identityVerification?.lastCheck ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-ink">
                  {passport.identityVerification.lastCheck.status === "Passed" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-amber-600" />}
                  Last same-person check: {passport.identityVerification.lastCheck.status} ({passport.identityVerification.lastCheck.confidence}%)
                </div>
              </div>
            ) : null}
            {lastLiveCheck ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-ink">
                  {lastLiveCheck.status === "Passed" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-amber-600" />}
                  Live check: {lastLiveCheck.status} ({lastLiveCheck.confidence}%)
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {!identityVerified ? (
        <div className="glass-panel border border-amber-100 bg-amber-50/70 p-5 text-amber-900">
          <p className="text-sm font-semibold">Verification required before test start</p>
          <p className="mt-2 text-sm">Complete the three-angle identity capture above. The test start button unlocks after verification passes.</p>
        </div>
      ) : !questions.length ? (
        <div className="glass-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Ready to begin</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">{passport.testPlan.testType}</h2>
          <p className="mt-2 text-sm text-slate-600">
            This test verifies your confirmed resume skills using approved question-bank items where available and standardized fallback questions when needed.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {passport.testPlan.sections.map((section) => (
              <div key={`${section.title}-${section.skill}`} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-ink">{section.title}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {section.questionCount} {section.questionType} questions - {section.durationMinutes} min
                </p>
              </div>
            ))}
          </div>
          <button className="btn-primary mt-5" disabled={starting} onClick={startTest} type="button">
            <ClipboardCheck className="h-4 w-4" />
            {starting ? "Starting..." : "Start test now"}
          </button>
        </div>
      ) : (
        <div className="glass-panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">In progress</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">Standard skill test</h2>
            </div>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700">
              {answeredCount} of {questions.length} answered
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {questions.map((question, index) => (
              <div key={question.questionId} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">{question.sectionTitle}</p>
                <h3 className="mt-2 text-base font-bold text-ink">
                  {index + 1}. {question.questionText}
                </h3>
                <div className="mt-3 grid gap-2">
                  {question.options.map((option) => (
                    <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        checked={(answers[question.questionId] || []).includes(option.id)}
                        name={question.questionId}
                        onChange={() => setAnswers((current) => ({ ...current, [question.questionId]: [option.id] }))}
                        type="radio"
                      />
                      {option.text}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button className="btn-primary mt-5" disabled={submitting || answeredCount === 0} onClick={submitTest} type="button">
            {submitting ? "Submitting..." : "Submit skill test"}
          </button>
        </div>
      )}
    </div>
  );
}
