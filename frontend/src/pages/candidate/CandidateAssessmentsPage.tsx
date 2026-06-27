import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCandidateAssessments } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { MatchScoreBadge } from "../../components/common/MatchScoreBadge";
import { PageHeader } from "../../components/common/PageHeader";
import type { AssessmentAttempt, Assessment } from "../../types";

export function CandidateAssessmentsPage() {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);

  useEffect(() => {
    fetchCandidateAssessments()
      .then((response) => setAttempts(response.items))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton className="m-6 h-80" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Candidate workspace"
        title="My assessments"
        description="Review submitted attempts, keep track of recruiter visibility rules, and open any results your assessment allows you to see."
      />

      {attempts.length === 0 ? (
        <EmptyState title="No assessments yet" description="Assessment attempts will appear here after you start or complete an invited test." />
      ) : (
        <div className="grid gap-4">
          {attempts.map((attempt) => {
            const assessment = attempt.assessmentId as Assessment;
            return (
              <div key={attempt._id} className="glass-panel p-6 transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.14)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{assessment.category}</p>
                    <h2 className="mt-2 text-2xl font-bold text-ink">{assessment.title}</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Submitted attempt #{attempt.attemptNumber}. Open the result to review the recruiter-visible scoring details for this assessment.</p>
                  </div>
                  <MatchScoreBadge score={attempt.totalScore} />
                </div>
                <div className="mt-6 flex justify-end">
                  <Link className="btn-primary" to={`/candidate/assessments/${attempt._id}/result`}>
                    View result
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
