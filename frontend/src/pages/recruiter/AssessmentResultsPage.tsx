import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchAssessmentResults, reviewAssessmentResult } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { MatchScoreBadge } from "../../components/common/MatchScoreBadge";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import type { AssessmentAttempt } from "../../types";
import { useToast } from "../../context/ToastContext";

export function AssessmentResultsPage() {
  const { assessmentId = "" } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<(AssessmentAttempt & { recommendation: string })[]>([]);

  async function load() {
    setLoading(true);
    try {
      const response = await fetchAssessmentResults({ assessmentId, sort: "highestTotalScore" });
      setAttempts(response.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [assessmentId]);

  if (loading) return <LoadingSkeleton className="h-80" />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Results" title="Assessment results" description="Review scores, integrity flags, coding performance, and recruiter review status before moving candidates forward." />

      {attempts.length === 0 ? (
        <EmptyState title="No results yet" description="Results will appear here once candidates submit this assessment." />
      ) : (
        <div className="grid gap-4">
          {attempts.map((attempt) => (
            <div key={attempt._id} className="glass-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-ink">{attempt.candidateProfile.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">{attempt.candidateProfile.email}</p>
                  <p className="mt-2 text-sm text-slate-500">{attempt.recommendation}</p>
                </div>
                <div className="flex items-center gap-2">
                  <MatchScoreBadge score={attempt.totalScore} />
                  <StatusBadge status={attempt.integritySummary.status} />
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total score</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{attempt.totalScore}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Passing</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{attempt.passingStatus ? "Pass" : "Fail"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resume match</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{attempt.resumeMatch.status}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Review status</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{attempt.recruiterReview.status}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Completion time</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{attempt.completionTimeMinutes} min</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link className="btn-secondary" to={`/recruiter/assessment-results/${attempt._id}`}>
                  View detailed result
                </Link>
                <button className="btn-secondary" onClick={async () => {
                  await reviewAssessmentResult(attempt._id, { status: "Shortlisted", note: "Shortlisted from assessment results." });
                  showToast("Candidate shortlisted from assessment results.", "success");
                  load();
                }} type="button">
                  Shortlist
                </button>
                <button className="btn-secondary" onClick={async () => {
                  await reviewAssessmentResult(attempt._id, { status: "Interview Scheduled", note: "Interview scheduling initiated." });
                  showToast("Assessment review marked for interview scheduling.", "success");
                  load();
                }} type="button">
                  Schedule interview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

