import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adjustAssessmentScore, fetchAssessmentIntegrity, fetchAssessmentResult } from "../../api/recruiter";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { MatchScoreBreakdown } from "../../components/common/MatchScoreBreakdown";
import { PageHeader } from "../../components/common/PageHeader";
import { ResumeViewer } from "../../components/common/ResumeViewer";
import { StatusBadge } from "../../components/common/StatusBadge";
import type { AssessmentAttempt, IntegrityEvent } from "../../types";
import { useToast } from "../../context/ToastContext";

export function AssessmentResultDetailPage() {
  const { attemptId = "" } = useParams();
  const { showToast } = useToast();
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [integrityEvents, setIntegrityEvents] = useState<IntegrityEvent[]>([]);

  async function load() {
    const [result, integrity] = await Promise.all([fetchAssessmentResult(attemptId), fetchAssessmentIntegrity(attemptId)]);
    setAttempt(result.attempt);
    setIntegrityEvents(integrity.events);
  }

  useEffect(() => {
    load();
  }, [attemptId]);

  if (!attempt) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Detailed result" title={attempt.candidateProfile.name} description={`Attempt ${attempt.attemptNumber} • ${attempt.recruiterRecommendation || "Recruiter review"}`} />

      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={attempt.recruiterReview.status} />
          <StatusBadge status={attempt.integritySummary.status} />
          <span className="text-sm text-slate-500">Overall score: {attempt.totalScore}</span>
          <span className="text-sm text-slate-500">Completion: {attempt.completionTimeMinutes} minutes</span>
          <Link className="btn-secondary ml-auto" to={`/recruiter/assessment-results/${attemptId}/identity-report`}>
            Identity report
          </Link>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold text-ink">Overview</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {attempt.sectionResults.map((section) => (
            <div key={section.sectionId} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{section.title}</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {section.score} / {section.totalMarks}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold text-ink">Resume match</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">{attempt.resumeMatch.status}</p>
            <p className="mt-2 text-sm text-slate-600">{attempt.resumeMatch.explanation}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Matched skills</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {attempt.resumeMatch.matchedSkills.map((skill) => (
                <span key={skill} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold text-ink">Answer review</h2>
        <div className="mt-5 space-y-4">
          {attempt.answers.map((answer) => (
            <div key={`${answer.sectionId}-${answer.questionId}`} className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-800">{answer.questionType}</p>
              <p className="mt-2 text-sm text-slate-600">{answer.answerText || answer.selectedOptionIds?.join(", ") || "Submission stored in coding section."}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">Score: {answer.score ?? 0}</span>
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    const nextScore = Number(window.prompt("New score", String(answer.score ?? 0)));
                    const reason = window.prompt("Reason for manual adjustment");
                    if (Number.isNaN(nextScore) || !reason) return;
                    await adjustAssessmentScore(attemptId, {
                      questionId: answer.questionId,
                      newScore: nextScore,
                      reason,
                    });
                    showToast("Score adjustment saved with audit metadata.", "success");
                    load();
                  }}
                  type="button"
                >
                  Adjust score
                </button>
              </div>
              {answer.codingSubmission ? (
                <div className="mt-4 rounded-2xl bg-white p-4">
                  <p className="text-sm font-semibold text-slate-800">{answer.codingSubmission.programmingLanguage} submission</p>
                  <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">{answer.codingSubmission.code}</pre>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold text-ink">Integrity report</h2>
        <p className="mt-2 text-sm text-slate-600">Integrity indicators are system-generated events for recruiter review. They do not prove misconduct and must not be used as the only reason for rejection.</p>
        <div className="mt-5 space-y-3">
          {integrityEvents.map((event) => (
            <div key={event._id} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-800">{event.eventType}</p>
              <p className="mt-1 text-sm text-slate-500">{new Date(event.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <ResumeViewer assessmentAttemptId={attemptId} resumeUrl={attempt.candidateProfile.resumeUrl} />
    </div>
  );
}
