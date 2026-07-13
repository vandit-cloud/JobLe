import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchCandidateAssessmentResult, fetchCandidateIdentityStatus } from "../../api/recruiter";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import type { Assessment, AssessmentAttempt, CandidateIdentityVerification } from "../../types";

export function CandidateAssessmentResultPage() {
  const { attemptId = "" } = useParams();
  const [result, setResult] = useState<{ attempt: AssessmentAttempt; visibleResult: Record<string, boolean> } | null>(null);
  const [verification, setVerification] = useState<CandidateIdentityVerification | null>(null);

  useEffect(() => {
    fetchCandidateAssessmentResult(attemptId).then(setResult);
    fetchCandidateIdentityStatus(attemptId)
      .then((data) => setVerification(data.verification))
      .catch(() => setVerification(null));
  }, [attemptId]);

  if (!result) return <LoadingSkeleton className="m-6 h-80" />;

  const assessment = result.attempt.assessmentId as Assessment;
  const isInProgress = result.attempt.status === "In Progress";

  if (isInProgress) {
    const verified = verification?.status === "VERIFIED";
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Assessment workspace"
          title={assessment?.title || "Assessment in progress"}
          description="Complete identity verification first, then continue to the protected assessment page."
          action={<StatusBadge status={verification?.status || "CONSENT_REQUIRED"} />}
        />

        <section className="glass-panel p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Current step</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">{verified ? "Ready to continue test" : "Identity verification required"}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Camera and identity events are only review indicators. They do not automatically reject or fail your attempt.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="btn-secondary" to={`/candidate/assessments/${attemptId}/identity/notice`}>
                Verification flow
              </Link>
              <Link className={verified ? "btn-primary" : "btn-secondary"} to={verified ? `/candidate/assessments/${attemptId}/test` : `/candidate/assessments/${attemptId}/identity/notice`}>
                {verified ? "Continue test" : "Start verification"}
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="glass-panel p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Attempt</p>
            <p className="mt-2 text-2xl font-extrabold text-ink">#{result.attempt.attemptNumber}</p>
          </div>
          <div className="glass-panel p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Assessment status</p>
            <p className="mt-2 text-lg font-bold text-ink">{result.attempt.status}</p>
          </div>
          <div className="glass-panel p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Verification</p>
            <p className="mt-2 text-lg font-bold text-ink">{verification?.status || "Not started"}</p>
          </div>
        </section>
      </div>
    );
  }

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
