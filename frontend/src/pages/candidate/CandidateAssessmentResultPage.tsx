import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchCandidateAssessmentResult } from "../../api/recruiter";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import type { AssessmentAttempt } from "../../types";

export function CandidateAssessmentResultPage() {
  const { attemptId = "" } = useParams();
  const [result, setResult] = useState<{ attempt: AssessmentAttempt; visibleResult: Record<string, boolean> } | null>(null);

  useEffect(() => {
    fetchCandidateAssessmentResult(attemptId).then(setResult);
  }, [attemptId]);

  if (!result) return <LoadingSkeleton className="m-6 h-80" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assessment result"
        title="Assessment result"
        description="This view respects the recruiter visibility settings for your submitted assessment attempt."
        action={
          <div className="flex flex-wrap gap-3">
            <StatusBadge status={result.attempt.passingStatus ? "Selected" : "Under Review"} />
            <StatusBadge status={result.attempt.recruiterReview.status} />
          </div>
        }
      />

      <div className="glass-panel p-6 md:p-7">
        {result.visibleResult.hideResultUntilRecruiterReview && result.attempt.recruiterReview.status === "Awaiting Review" ? (
          <p className="text-sm text-slate-600">Your result is currently hidden until recruiter review is complete.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {result.visibleResult.showOverallScoreOnly || result.visibleResult.showCompleteResult ? (
              <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Overall score</p>
                <p className="mt-2 text-2xl font-extrabold text-ink">{result.attempt.totalScore}</p>
              </div>
            ) : null}
            {result.visibleResult.showPassFailOnly || result.visibleResult.showCompleteResult ? (
              <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pass / fail</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{result.attempt.passingStatus ? "Pass" : "Fail"}</p>
              </div>
            ) : null}
            {result.visibleResult.showSectionScores || result.visibleResult.showCompleteResult ? (
              result.attempt.sectionResults.map((section) => (
                <div key={section.sectionId} className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{section.title}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {section.score} / {section.totalMarks}
                  </p>
                </div>
              ))
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
