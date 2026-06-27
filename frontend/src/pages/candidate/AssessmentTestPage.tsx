import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchCandidateAssessmentContext,
  recordCandidateAssessmentIntegrity,
  runCandidateAssessmentCode,
  saveCandidateAssessmentAnswer,
  submitCandidateAssessment,
} from "../../api/recruiter";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { useToast } from "../../context/ToastContext";

type AnswerState = {
  answerText?: string;
  selectedOptionIds?: string[];
  code?: string;
  programmingLanguage?: string;
};

export function AssessmentTestPage() {
  const { invitationToken = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [draftSavedAt, setDraftSavedAt] = useState("");
  const attemptId = useMemo(() => localStorage.getItem(`attempt-${invitationToken}`) || "", [invitationToken]);
  const previousAnswerSnapshots = useRef<Record<string, string>>({});
  const localDraftKey = `assessment-answers-${invitationToken}`;

  useEffect(() => {
    fetchCandidateAssessmentContext(invitationToken).then((response) => {
      setData(response);
      setTimeLeft(response.assessment.settings.totalDuration * 60);
      const storedAnswers = localStorage.getItem(localDraftKey);
      if (storedAnswers) {
        setAnswers(JSON.parse(storedAnswers));
      }
    });
  }, [invitationToken, localDraftKey]);

  useEffect(() => {
    if (!timeLeft) return;
    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          submitCandidateAssessment(invitationToken).then(() => {
            localStorage.removeItem(localDraftKey);
            navigate(`/assessment/${invitationToken}/submitted`);
          });
          return 0;
        }
        if (current === 300) {
          showToast("Five minutes remaining.", "info");
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [invitationToken, localDraftKey, navigate, showToast, timeLeft]);

  useEffect(() => {
    localStorage.setItem(localDraftKey, JSON.stringify(answers));
    setDraftSavedAt(new Date().toLocaleTimeString());

    if (!data || !attemptId) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      const questionIndex = new Map<
        string,
        {
          sectionId: string;
          questionType: string;
        }
      >();

      for (const section of data.assessment.sections) {
        for (const question of section.questions) {
          questionIndex.set(question._id, {
            sectionId: section._id,
            questionType: question.questionType,
          });
        }
      }

      for (const [questionId, answer] of Object.entries(answers)) {
        const snapshot = JSON.stringify(answer);
        if (!snapshot || previousAnswerSnapshots.current[questionId] === snapshot) {
          continue;
        }

        const metadata = questionIndex.get(questionId);
        if (!metadata) {
          continue;
        }

        previousAnswerSnapshots.current[questionId] = snapshot;
        await saveCandidateAssessmentAnswer(invitationToken, {
          attemptId,
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
  }, [answers, attemptId, data, invitationToken, localDraftKey]);

  if (!data) return <LoadingSkeleton className="m-6 h-96" />;

  async function save(question: any, section: any) {
    await saveCandidateAssessmentAnswer(invitationToken, {
      attemptId,
      questionId: question._id,
      sectionId: section._id,
      questionType: question.questionType,
      answerText: answers[question._id]?.answerText,
      selectedOptionIds: answers[question._id]?.selectedOptionIds || [],
      code: answers[question._id]?.code,
      programmingLanguage: answers[question._id]?.programmingLanguage,
    });
    showToast("Answer saved.", "success");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="glass-panel sticky top-4 z-10 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sunrise">Assessment in progress</p>
          <h1 className="mt-1 text-xl font-bold text-ink">{data.assessment.title}</h1>
          <p className="mt-1 text-xs text-slate-500">Auto-save enabled. Latest local draft: {draftSavedAt || "Not yet saved"}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">
          Time left: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </div>
      </div>

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
                        {(question.allowedLanguages || ["JavaScript"]).map((language: string) => (
                          <option key={language}>{language}</option>
                        ))}
                      </select>
                      <textarea
                        className="input min-h-64 font-mono"
                        value={answers[question._id]?.code || question.starterCode?.JavaScript || ""}
                        onChange={(event) => setAnswers((state) => ({ ...state, [question._id]: { ...state[question._id], code: event.target.value } }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn-secondary"
                          onClick={async () => {
                            const result = await runCandidateAssessmentCode(invitationToken, {
                              attemptId,
                              sectionId: section._id,
                              questionId: question._id,
                              code: answers[question._id]?.code || "",
                              programmingLanguage: answers[question._id]?.programmingLanguage || question.allowedLanguages?.[0] || "JavaScript",
                            });
                            showToast(result.executionResults.compilerOutput, "info");
                          }}
                          type="button"
                        >
                          Run code
                        </button>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      className="input mt-4 min-h-28"
                      value={answers[question._id]?.answerText || ""}
                      onChange={(event) => setAnswers((state) => ({ ...state, [question._id]: { ...state[question._id], answerText: event.target.value } }))}
                    />
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => save(question, section)} type="button">
                      Save answer
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={async () => {
                        await recordCandidateAssessmentIntegrity(invitationToken, {
                          attemptId,
                          eventType: "Copy attempted",
                          severity: "low",
                          metadata: { questionId: question._id },
                        });
                        showToast("Integrity event recorded for recruiter review.", "info");
                      }}
                      type="button"
                    >
                      Simulate integrity event
                    </button>
                  </div>
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
            await submitCandidateAssessment(invitationToken);
            localStorage.removeItem(localDraftKey);
            navigate(`/assessment/${invitationToken}/submitted`);
          }}
          type="button"
        >
          Submit assessment
        </button>
      </div>
    </div>
  );
}
