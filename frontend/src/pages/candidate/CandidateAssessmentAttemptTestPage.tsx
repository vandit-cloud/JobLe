import { ShieldCheck, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchCandidateAttemptTestContext,
  recordCandidateIdentityEvent,
  saveCandidateAttemptAnswer,
  submitCandidateAttemptAssessment,
} from "../../api/recruiter";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { useToast } from "../../context/ToastContext";

type AnswerState = {
  answerText?: string;
  selectedOptionIds?: string[];
  code?: string;
  programmingLanguage?: string;
};

function getCameraFrameQuality(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 120;
  const context = canvas.getContext("2d");
  if (!context) return { brightness: 0, contrast: 0 };
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  let total = 0;
  const values: number[] = [];
  for (let index = 0; index < data.data.length; index += 4) {
    const luminance = 0.299 * data.data[index] + 0.587 * data.data[index + 1] + 0.114 * data.data[index + 2];
    total += luminance;
    values.push(luminance);
  }
  const brightness = total / Math.max(values.length, 1);
  const variance = values.reduce((sum, value) => sum + (value - brightness) ** 2, 0) / Math.max(values.length, 1);
  return { brightness: Math.round(brightness), contrast: Math.round(Math.sqrt(variance)) };
}

export function CandidateAssessmentAttemptTestPage() {
  const { attemptId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previousAnswerSnapshots = useRef<Record<string, string>>({});
  const [data, setData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [cameraStatus, setCameraStatus] = useState("Starting camera");
  const draftKey = useMemo(() => `candidate-attempt-answers-${attemptId}`, [attemptId]);

  useEffect(() => {
    fetchCandidateAttemptTestContext(attemptId).then((response) => {
      setData(response);
      setTimeLeft(response.assessment.settings.totalDuration * 60);
      const stored = localStorage.getItem(draftKey);
      if (stored) setAnswers(JSON.parse(stored));
    });
  }, [attemptId, draftKey]);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } } })
      .then(async (stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraStatus("Camera active");
      })
      .catch(async () => {
        setCameraStatus("Camera unavailable");
        await recordCandidateIdentityEvent(attemptId, {
          eventType: "CAMERA_PERMISSION_DENIED",
          severity: "REVIEW_REQUIRED",
          metadata: { page: "candidate-attempt-test" },
        });
      });

    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, [attemptId]);

  useEffect(() => {
    if (!videoRef.current) return;
    const interval = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.readyState < 2) {
        await recordCandidateIdentityEvent(attemptId, {
          eventType: "CAMERA_STREAM_STOPPED",
          severity: "REVIEW_REQUIRED",
          metadata: { cameraStatus },
        });
        return;
      }
      const quality = getCameraFrameQuality(videoRef.current);
      if (quality.brightness < 35) {
        await recordCandidateIdentityEvent(attemptId, {
          eventType: "LOW_LIGHT",
          severity: "LOW",
          confidence: 70,
          metadata: quality,
        });
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [attemptId, cameraStatus]);

  useEffect(() => {
    if (!timeLeft) return;
    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          submitCandidateAttemptAssessment(attemptId).then(() => {
            localStorage.removeItem(draftKey);
            navigate(`/candidate/assessments/${attemptId}/submitted`);
          });
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [attemptId, draftKey, navigate, timeLeft]);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(answers));
    if (!data) return;

    const timeout = window.setTimeout(async () => {
      const questionIndex = new Map<string, { sectionId: string; questionType: string }>();
      for (const section of data.assessment.sections) {
        for (const question of section.questions) {
          questionIndex.set(question._id, { sectionId: section._id, questionType: question.questionType });
        }
      }
      for (const [questionId, answer] of Object.entries(answers)) {
        const snapshot = JSON.stringify(answer);
        if (previousAnswerSnapshots.current[questionId] === snapshot) continue;
        const metadata = questionIndex.get(questionId);
        if (!metadata) continue;
        previousAnswerSnapshots.current[questionId] = snapshot;
        await saveCandidateAttemptAnswer(attemptId, {
          questionId,
          sectionId: metadata.sectionId,
          questionType: metadata.questionType,
          answerText: answer.answerText,
          selectedOptionIds: answer.selectedOptionIds || [],
          code: answer.code,
          programmingLanguage: answer.programmingLanguage,
        });
      }
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [answers, attemptId, data, draftKey]);

  if (!data) return <LoadingSkeleton className="m-6 h-96" />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="glass-panel sticky top-4 z-10 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-tide">Verified assessment in progress</p>
          <h1 className="mt-1 text-xl font-bold text-ink">{data.assessment.title}</h1>
          <p className="mt-1 text-xs text-slate-500">{data.warning}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">
            Time left: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
          </span>
          <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <Video className="h-4 w-4" />
            {cameraStatus}
          </span>
        </div>
      </div>

      <video ref={videoRef} className="fixed bottom-5 right-5 z-20 h-28 w-40 rounded-3xl border border-white bg-slate-950 object-cover shadow-2xl" muted playsInline />

      <div className="grid gap-6">
        {data.assessment.sections.map((section: any) => (
          <div key={section._id} className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">{section.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{section.description}</p>
            <div className="mt-5 space-y-6">
              {section.questions.map((question: any, index: number) => (
                <div key={question._id} className="rounded-3xl bg-slate-50 p-5">
                  <p className="font-semibold text-slate-800">
                    {index + 1}. {question.questionText}
                  </p>
                  {question.questionType === "MCQ" ? (
                    <div className="mt-4 space-y-3">
                      {question.options.map((option: any) => {
                        const current = answers[question._id]?.selectedOptionIds || [];
                        return (
                          <label key={option.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                            <input
                              checked={current.includes(option.id)}
                              onChange={(event) => {
                                const next = event.target.checked ? [...current, option.id] : current.filter((value: string) => value !== option.id);
                                setAnswers((state) => ({ ...state, [question._id]: { ...state[question._id], selectedOptionIds: next } }));
                              }}
                              type="checkbox"
                            />
                            {option.text}
                          </label>
                        );
                      })}
                    </div>
                  ) : question.questionType === "Coding Test" ? (
                    <div className="mt-4 space-y-4">
                      <select
                        className="input"
                        value={answers[question._id]?.programmingLanguage || question.allowedLanguages?.[0] || "JavaScript"}
                        onChange={(event) => setAnswers((state) => ({ ...state, [question._id]: { ...state[question._id], programmingLanguage: event.target.value } }))}
                      >
                        {(question.allowedLanguages || ["JavaScript"]).map((language: string) => <option key={language}>{language}</option>)}
                      </select>
                      <textarea
                        className="input min-h-64 font-mono"
                        value={answers[question._id]?.code || question.starterCode?.JavaScript || ""}
                        onChange={(event) => setAnswers((state) => ({ ...state, [question._id]: { ...state[question._id], code: event.target.value } }))}
                      />
                    </div>
                  ) : (
                    <textarea
                      className="input mt-4 min-h-28"
                      value={answers[question._id]?.answerText || ""}
                      onChange={(event) => setAnswers((state) => ({ ...state, [question._id]: { ...state[question._id], answerText: event.target.value } }))}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          className="btn-primary"
          onClick={async () => {
            if (!window.confirm("Submit assessment now?")) return;
            await submitCandidateAttemptAssessment(attemptId);
            localStorage.removeItem(draftKey);
            showToast("Assessment submitted for recruiter review.", "success");
            navigate(`/candidate/assessments/${attemptId}/submitted`);
          }}
          type="button"
        >
          <ShieldCheck className="h-4 w-4" />
          Submit assessment
        </button>
      </div>
    </div>
  );
}
