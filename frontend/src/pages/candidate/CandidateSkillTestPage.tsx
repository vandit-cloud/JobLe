import { ArrowLeft, Camera, CheckCircle2, ClipboardCheck, Eye, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";
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
type AiDetectionState = {
  cameraActive: boolean;
  faceVisible: boolean;
  onlyOneFaceVisible: boolean;
  lighting: "Good" | "Low light" | "Too bright" | "Unknown";
  sharpness: "Clear" | "Blurry" | "Unknown";
  frozenFrame: boolean;
  cameraCovered: boolean;
  reviewSignals: string[];
  checkedAt?: string;
};

const ANGLES: Array<{ key: VerificationAngle; label: string; instruction: string }> = [
  { key: "front", label: "Front", instruction: "Look straight into the camera." },
  { key: "left", label: "Left", instruction: "Turn your face slightly to your left." },
  { key: "right", label: "Right", instruction: "Turn your face slightly to your right." },
];

const ANGLE_GUIDES: Record<VerificationAngle, { title: string; hint: string; markerClass: string }> = {
  front: {
    title: "Center your face inside the oval",
    hint: "Eyes forward, nose in the middle line",
    markerClass: "left-1/2 -translate-x-1/2",
  },
  left: {
    title: "Turn slightly to your left",
    hint: "Keep both eyes visible inside the oval",
    markerClass: "left-[38%] -translate-x-1/2",
  },
  right: {
    title: "Turn slightly to your right",
    hint: "Keep both eyes visible inside the oval",
    markerClass: "left-[62%] -translate-x-1/2",
  },
};

function getImageSignature(imageData: ImageData) {
  const blocks = Array.from({ length: 64 }, () => ({ total: 0, count: 0 }));
  let brightnessTotal = 0;
  let edgeTotal = 0;
  let edgeWeightedX = 0;
  let leftEdgeTotal = 0;
  let rightEdgeTotal = 0;
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
        const edge = Math.abs(luminance - previous);
        edgeTotal += edge;
        edgeWeightedX += edge * (x / imageData.width);
        if (x < imageData.width / 2) {
          leftEdgeTotal += edge;
        } else {
          rightEdgeTotal += edge;
        }
      }
    }
  }

  const blockAverages = blocks.map((block) => block.total / Math.max(block.count, 1));
  const average = blockAverages.reduce((sum, value) => sum + value, 0) / blockAverages.length;
  const brightness = brightnessTotal / Math.max(luminanceValues.length, 1);
  const variance = luminanceValues.reduce((sum, value) => sum + (value - brightness) ** 2, 0) / Math.max(luminanceValues.length, 1);
  let mirrorDifference = 0;
  let mirrorSamples = 0;
  const top = Math.floor(imageData.height * 0.18);
  const bottom = Math.floor(imageData.height * 0.82);
  const left = Math.floor(imageData.width * 0.28);
  const center = Math.floor(imageData.width * 0.5);
  const right = Math.floor(imageData.width * 0.72);

  for (let y = top; y < bottom; y += 2) {
    for (let x = left; x < center; x += 2) {
      const mirrorX = right - (x - left);
      const leftIndex = (y * imageData.width + x) * 4;
      const rightIndex = (y * imageData.width + mirrorX) * 4;
      const leftLuminance = 0.299 * imageData.data[leftIndex] + 0.587 * imageData.data[leftIndex + 1] + 0.114 * imageData.data[leftIndex + 2];
      const rightLuminance = 0.299 * imageData.data[rightIndex] + 0.587 * imageData.data[rightIndex + 1] + 0.114 * imageData.data[rightIndex + 2];
      mirrorDifference += Math.abs(leftLuminance - rightLuminance);
      mirrorSamples += 1;
    }
  }

  const faceSymmetry = Math.max(0, Math.min(100, Math.round(100 - mirrorDifference / Math.max(mirrorSamples, 1))));

  return {
    signature: blockAverages.map((value) => (value >= average ? 1 : 0)),
    metrics: {
      brightness: Math.round(brightness),
      contrast: Math.round(Math.sqrt(variance)),
      edgeScore: Math.round(edgeTotal / Math.max(luminanceValues.length, 1)),
      faceCenterX: Number((edgeWeightedX / Math.max(edgeTotal, 1)).toFixed(2)),
      faceSymmetry,
      horizontalBalance: Number(((rightEdgeTotal - leftEdgeTotal) / Math.max(rightEdgeTotal + leftEdgeTotal, 1)).toFixed(2)),
    },
  };
}

function signaturesMatch(left: number[] = [], right: number[] = []) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function analyzeFrame(signature: number[], metrics: { brightness: number; contrast: number; edgeScore: number }, previousSignature?: number[]): AiDetectionState {
  const cameraCovered = metrics.brightness < 18 || metrics.contrast < 5;
  const frozenFrame = Boolean(previousSignature?.length && signaturesMatch(signature, previousSignature));
  const lowLight = metrics.brightness < 32;
  const tooBright = metrics.brightness > 225;
  const blurry = metrics.contrast < 8 && metrics.edgeScore < 5;
  const faceVisible = !cameraCovered && metrics.brightness >= 25 && metrics.contrast >= 6;
  const reviewSignals = [
    cameraCovered ? "Camera covered or no usable frame" : "",
    frozenFrame ? "Frozen video frame" : "",
    !faceVisible ? "Face not clearly visible" : "",
    lowLight ? "Low light" : "",
    tooBright ? "Overexposed light" : "",
    blurry ? "Blurry or low contrast" : "",
  ].filter(Boolean);

  return {
    cameraActive: true,
    faceVisible,
    onlyOneFaceVisible: faceVisible,
    lighting: lowLight ? "Low light" : tooBright ? "Too bright" : "Good",
    sharpness: blurry ? "Blurry" : "Clear",
    frozenFrame,
    cameraCovered,
    reviewSignals,
    checkedAt: new Date().toISOString(),
  };
}

function scoreLocalPhotoQuality(image?: CandidateVerificationImage | null) {
  if (!image) return 0;
  const brightness = Number(image.metrics.brightness || 0);
  const contrast = Number(image.metrics.contrast || 0);
  const brightnessScore = brightness >= 35 && brightness <= 220 ? 45 : 25;
  const contrastScore = contrast >= 10 ? 35 : 20;
  const sharpnessScore = Number(image.metrics.edgeScore || 0) >= 5 ? 20 : 12;
  return Math.min(100, brightnessScore + contrastScore + sharpnessScore);
}

function getLocalPhotoIssues(image?: CandidateVerificationImage | null) {
  if (!image) return [];
  const issues = [...(image.metrics.reviewSignals || [])];
  if (scoreLocalPhotoQuality(image) < 55) issues.push("Image quality is too low.");
  return [...new Set(issues)];
}

function getAngleCaptureIssues(angle: VerificationAngle, image?: CandidateVerificationImage | null) {
  const issues = getLocalPhotoIssues(image);
  if (!image) return issues;

  if (angle === "front") {
    const faceCenterX = Number(image.metrics.faceCenterX || 0.5);
    const faceSymmetry = Number(image.metrics.faceSymmetry || 0);
    const horizontalBalance = Math.abs(Number(image.metrics.horizontalBalance || 0));
    if (faceCenterX < 0.42 || faceCenterX > 0.58) {
      issues.push("Move your face fully inside the front guide oval.");
    }
    if (horizontalBalance > 0.18 || faceSymmetry < 86) {
      issues.push("For Front, look straight into the camera. Side-looking photos are not accepted.");
    }
  }

  return [...new Set(issues)];
}

export function CandidateSkillTestPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previousSignatureRef = useRef<number[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [passport, setPassport] = useState<SkillPassport | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [verificationPhotos, setVerificationPhotos] = useState<Partial<Record<VerificationAngle, CandidateVerificationImage>>>({});
  const [retakingAngles, setRetakingAngles] = useState<Partial<Record<VerificationAngle, boolean>>>({});
  const [activeCaptureAngle, setActiveCaptureAngle] = useState<VerificationAngle>("front");
  const [lastLiveCheck, setLastLiveCheck] = useState<NonNullable<SkillPassport["identityVerification"]>["lastCheck"] | null>(null);
  const [latestFrameMetrics, setLatestFrameMetrics] = useState<CandidateVerificationImage["metrics"] | null>(null);
  const [aiDetection, setAiDetection] = useState<AiDetectionState>({
    cameraActive: false,
    faceVisible: false,
    onlyOneFaceVisible: false,
    lighting: "Unknown",
    sharpness: "Unknown",
    frozenFrame: false,
    cameraCovered: false,
    reviewSignals: [],
  });

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

  function captureCameraImage(options: { updateDetection?: boolean; includeFrozenSignal?: boolean } = {}): CandidateVerificationImage {
    const { updateDetection = true, includeFrozenSignal = false } = options;
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
    const detection = analyzeFrame(signature, metrics, includeFrozenSignal ? previousSignatureRef.current || undefined : undefined);
    previousSignatureRef.current = signature;
    if (updateDetection) {
      setAiDetection(detection);
      setLatestFrameMetrics({
        ...metrics,
        cameraCovered: detection.cameraCovered,
        faceVisible: detection.faceVisible,
        faceCenterX: metrics.faceCenterX,
        faceSymmetry: metrics.faceSymmetry,
        frozenFrame: detection.frozenFrame,
        horizontalBalance: metrics.horizontalBalance,
        onlyOneFaceVisible: detection.onlyOneFaceVisible,
        reviewSignals: detection.reviewSignals,
      });
    }
    return {
      imageData: canvas.toDataURL("image/jpeg", 0.86),
      signature,
      metrics: {
        ...metrics,
        cameraCovered: detection.cameraCovered,
        faceVisible: detection.faceVisible,
        faceCenterX: metrics.faceCenterX,
        faceSymmetry: metrics.faceSymmetry,
        frozenFrame: detection.frozenFrame,
        horizontalBalance: metrics.horizontalBalance,
        onlyOneFaceVisible: detection.onlyOneFaceVisible,
        reviewSignals: detection.reviewSignals,
      },
    };
  }

  useEffect(() => {
    if (!cameraReady || passport?.currentTest?.status !== "In Progress" || passport.identityVerification?.status !== "Verified") return;

    const interval = window.setInterval(() => {
      try {
        const image = captureCameraImage({ includeFrozenSignal: true });
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

  useEffect(() => {
    if (!cameraReady) return;
    const interval = window.setInterval(() => {
      try {
        captureCameraImage({ updateDetection: true, includeFrozenSignal: true });
      } catch {
        setAiDetection((current) => ({
          ...current,
          cameraActive: false,
          faceVisible: false,
          onlyOneFaceVisible: false,
          reviewSignals: ["Camera frame unavailable"],
          checkedAt: new Date().toISOString(),
        }));
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [cameraReady]);

  async function captureAngle(angle: VerificationAngle) {
    try {
      if (!cameraReady) {
        showToast("Camera is still starting. Please wait a moment and try again.", "error");
        return;
      }
      const image = captureCameraImage();
      const issues = getAngleCaptureIssues(angle, image);
      setRetakingAngles((current) => ({ ...current, [angle]: true }));
      if (issues.length) {
        setVerificationPhotos((current) => {
          const next = { ...current };
          delete next[angle];
          return next;
        });
        showToast(`${angle} photo was not captured: ${issues[0]}`, "error");
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

  function selectAngleForCapture(angle: VerificationAngle, clearCurrentPhoto = false) {
    setActiveCaptureAngle(angle);
    if (clearCurrentPhoto) {
      setRetakingAngles((current) => ({ ...current, [angle]: true }));
      setVerificationPhotos((current) => {
        const next = { ...current };
        delete next[angle];
        return next;
      });
    }
  }

  async function saveRetakenAngle(angle: VerificationAngle) {
    const image = verificationPhotos[angle];
    if (!image) {
      showToast(`Capture a new ${angle} photo first.`, "error");
      return;
    }
    const issues = getAngleCaptureIssues(angle, image);
    if (issues.length) {
      showToast(`${angle} photo is not good enough. Please capture again.`, "error");
      return;
    }

    try {
      setVerifying(true);
      const updated = await retakeCandidateSkillVerificationPhoto(angle, image);
      setPassport(updated);
      setVerificationPhotos((current) => {
        const next = { ...current };
        delete next[angle];
        return next;
      });
      setRetakingAngles((current) => ({ ...current, [angle]: false }));
      showToast(`${angle} verification photo saved.`, "success");
    } catch (error: any) {
      showToast(error?.response?.data?.message || `Unable to save ${angle} photo.`, "error");
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
      setRetakingAngles({});
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
      const identityCheckImage = captureCameraImage({ includeFrozenSignal: true });
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
  const hasCompleteGoodLocalVerification =
    hasCompleteLocalVerification && ANGLES.every((angle) => getAngleCaptureIssues(angle.key, verificationPhotos[angle.key]).length === 0);
  const activeAngle = ANGLES.find((angle) => angle.key === activeCaptureAngle) || ANGLES[0];
  const activeGuide = ANGLE_GUIDES[activeCaptureAngle];
  const activeGuideReady =
    activeCaptureAngle !== "front" ||
    (aiDetection.faceVisible &&
      Number(latestFrameMetrics?.faceCenterX || 0.5) >= 0.42 &&
      Number(latestFrameMetrics?.faceCenterX || 0.5) <= 0.58 &&
      Math.abs(Number(latestFrameMetrics?.horizontalBalance || 0)) <= 0.18 &&
      Number(latestFrameMetrics?.faceSymmetry || 0) >= 86);

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
            <div className="relative overflow-hidden rounded-3xl">
              <video ref={videoRef} className="aspect-video w-full rounded-3xl bg-slate-950 object-cover shadow-inner" muted playsInline />
              <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/40">
                <div className={`absolute top-[13%] h-[66%] w-[34%] rounded-[48%] border-2 border-emerald-300/95 shadow-[0_0_0_999px_rgba(15,23,42,0.08)] ${activeGuide.markerClass}`}>
                  <div className="absolute left-[18%] right-[18%] top-[34%] border-t-2 border-dashed border-white/85" />
                  <div className="absolute left-[28%] top-[31%] h-3 w-3 rounded-full border-2 border-white/90" />
                  <div className="absolute right-[28%] top-[31%] h-3 w-3 rounded-full border-2 border-white/90" />
                  <div className="absolute left-1/2 top-[18%] h-[62%] -translate-x-1/2 border-l-2 border-dashed border-white/85" />
                  <div className="absolute left-[28%] right-[28%] top-[73%] border-t-2 border-dashed border-emerald-200/90" />
                </div>
                <div className={`absolute top-[13%] h-[66%] border-l-2 border-dashed border-emerald-200/80 ${activeCaptureAngle === "front" ? "left-1/2" : activeCaptureAngle === "left" ? "left-[38%]" : "left-[62%]"}`} />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-emerald-300 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-950">
                  {activeAngle.label} guide
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-slate-950/85 px-4 py-3 text-white">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold">{activeGuide.title}</p>
                <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ${activeGuideReady ? "bg-emerald-300 text-slate-950" : "bg-amber-300 text-slate-950"}`}>
                  {activeGuideReady ? "Ready" : "Align face"}
                </span>
              </div>
              <p className="mt-1 text-xs text-white/80">{activeGuide.hint}</p>
              {activeCaptureAngle === "front" ? (
                <p className="mt-2 text-[11px] font-semibold text-white/75">
                  Center {Math.round(Number(latestFrameMetrics?.faceCenterX || 0.5) * 100)}% - Symmetry {Math.round(Number(latestFrameMetrics?.faceSymmetry || 0))}%
                </p>
              ) : null}
            </div>
            {cameraError ? (
              <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{cameraError}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-600">{cameraReady ? "Camera ready for verification." : "Starting camera..."}</p>
            )}
            <div className="mt-4 rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Capture target</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ANGLES.map((angle) => (
                  <button
                    className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${activeCaptureAngle === angle.key ? "bg-[#10203f] text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
                    disabled={verifying}
                    key={angle.key}
                    onClick={() => selectAngleForCapture(angle.key)}
                    type="button"
                  >
                    {angle.label}
                  </button>
                ))}
              </div>
              <button
                className="btn-primary mt-4 w-full"
                disabled={!cameraReady || verifying}
                onClick={() => void captureAngle(activeCaptureAngle)}
                type="button"
              >
                <Camera className="h-4 w-4" />
                Take photo for {activeAngle.label}
              </button>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Select the angle, then click the big camera or this button. The captured image appears in that angle section.
              </p>
              {activeCaptureAngle === "front" && !activeGuideReady ? (
                <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                  Front capture needs your face centered, eyes forward, and nose near the dashed middle line.
                </p>
              ) : null}
            </div>
            <div className="mt-4 rounded-3xl border border-white/70 bg-white/75 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-tide" />
                <p className="text-sm font-bold text-ink">AI camera detection</p>
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                {[
                  ["Camera", aiDetection.cameraActive ? "Active" : "Unavailable"],
                  ["Face", aiDetection.faceVisible ? "Visible" : "Review"],
                  ["People", aiDetection.onlyOneFaceVisible ? "One person" : "Review"],
                  ["Lighting", aiDetection.lighting],
                  ["Sharpness", aiDetection.sharpness],
                  ["Frozen frame", aiDetection.frozenFrame ? "Review" : "No"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                    <p className={`mt-1 font-bold ${String(value).includes("Review") || value === "Unavailable" || value === "Low light" || value === "Too bright" || value === "Blurry" ? "text-amber-700" : "text-emerald-700"}`}>{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                AI detection creates review flags only. It never automatically rejects your test.
              </p>
              {aiDetection.reviewSignals.length ? (
                <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                  Review signals: {aiDetection.reviewSignals.join(", ")}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3">
            {ANGLES.map((angle) => {
              const localPhoto = verificationPhotos[angle.key];
              const savedPhoto = passport.identityVerification?.photos?.find((photo) => photo.angle === angle.key);
              const isRetaking = Boolean(retakingAngles[angle.key]);
              const localIssues = getAngleCaptureIssues(angle.key, localPhoto);
              const localQuality = scoreLocalPhotoQuality(localPhoto);
              const savedNeedsRetake = Boolean(savedPhoto && savedPhoto.aiDecision !== "Passed" && !localPhoto);
              const localNeedsRetake = Boolean(localPhoto && localIssues.length);
              const canSaveRetake = Boolean(savedPhoto && localPhoto && !localNeedsRetake);
              const isActive = activeCaptureAngle === angle.key;
              const primaryAction = () => selectAngleForCapture(angle.key, Boolean(savedPhoto || localPhoto));
              const buttonLabel = localPhoto ? "Retake" : isActive ? "Selected" : "Select";
              const angleHelp =
                angle.key === "front"
                  ? "Front accepts only a centered, straight-facing photo."
                  : "Keep your face visible and centered while turning slightly.";
              return (
                <div key={angle.key} className={`rounded-2xl p-4 ${isActive ? "ring-2 ring-[#10203f]" : savedNeedsRetake || localNeedsRetake ? "bg-amber-50 ring-1 ring-amber-200" : "bg-slate-50"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-start gap-4">
                        {localPhoto ? (
                          <img alt={`${angle.label} retake preview`} className="h-20 w-28 rounded-2xl object-cover" src={localPhoto.imageData} />
                        ) : isRetaking || savedPhoto ? (
                          <div className="flex h-20 w-28 items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-white text-center text-xs font-semibold text-amber-700">
                            Fresh photo needed
                          </div>
                        ) : (
                          <div className="flex h-20 w-28 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center text-xs font-semibold text-slate-500">
                            No photo yet
                          </div>
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-ink">{angle.label} angle</p>
                            {isActive ? <span className="rounded-full bg-[#10203f] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">Active</span> : null}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{angle.instruction}</p>
                          <p className="mt-1 text-xs text-slate-500">{angleHelp}</p>
                        </div>
                      </div>
                      {localPhoto ? (
                        <div className="mt-2 space-y-1">
                          <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${localNeedsRetake ? "text-amber-700" : "text-emerald-700"}`}>
                            AI quality {localQuality}% - {localNeedsRetake ? "Retake required" : savedPhoto ? "Retake ready to save" : "Good photo"}
                          </p>
                          {localIssues.length ? <p className="text-xs text-amber-800">{localIssues.join(" ")}</p> : null}
                        </div>
                      ) : savedPhoto ? (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                          Old saved photo hidden. Take a fresh photo for this session.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                    <button className={isActive ? "btn-primary" : "btn-secondary"} disabled={!cameraReady || verifying} onClick={primaryAction} type="button">
                      {localPhoto ? <RotateCcw className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                      {buttonLabel}
                    </button>
                      {canSaveRetake ? (
                        <button className="btn-primary" disabled={verifying || questions.length > 0} onClick={() => void saveRetakenAngle(angle.key)} type="button">
                          Use photo
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            {!identityVerified && !questions.length ? (
              <button className="btn-primary" disabled={!cameraReady || verifying || !hasCompleteGoodLocalVerification} onClick={submitIdentityVerification} type="button">
                {verifying ? "Checking photos..." : "Verify identity photos"}
              </button>
            ) : null}
            {!identityVerified && hasAnyRetakenPhoto && !hasCompleteLocalVerification && !questions.length ? (
              <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                Retake all three angles before saving the updated verification photos.
              </p>
            ) : null}
            {!identityVerified && hasCompleteLocalVerification && !hasCompleteGoodLocalVerification && !questions.length ? (
              <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                One or more photos are not good enough. Please retake the highlighted front, left, or right photo before verification.
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
