import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCandidateAssessments } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { MatchScoreBadge } from "../../components/common/MatchScoreBadge";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import type { AssessmentAttempt, Assessment, AssessmentInvitation, Job } from "../../types";

export function CandidateAssessmentsPage() {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<AssessmentInvitation[]>([]);

  useEffect(() => {
    fetchCandidateAssessments()
      .then((response) => {
        setAttempts(response.items);
        setPendingInvitations(response.pendingInvitations || []);
      })
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

      {pendingInvitations.length === 0 && attempts.length === 0 ? (
        <EmptyState title="No assessments yet" description="Assessment invitations and attempts will appear here when a recruiter invites you." />
      ) : null}

      {pendingInvitations.length ? (
        <section className="glass-panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Assessment center</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">Pending assessment invitations</h2>
              <p className="mt-2 text-sm text-slate-600">Start from here. After you start, the identity verification and protected test page will open.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
              {pendingInvitations.length} pending
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            {pendingInvitations.map((invitation) => {
              const assessment = invitation.assessmentId as Assessment;
              const job = invitation.jobId && typeof invitation.jobId !== "string" ? (invitation.jobId as Job) : null;
              return (
                <div key={invitation._id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{assessment?.category || "Assessment"}</p>
                      <h3 className="mt-2 text-xl font-bold text-ink">{assessment?.title || "Assessment invitation"}</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {job?.title || "Invited assessment"} - {assessment?.settings?.totalDuration || assessment?.totalDuration || 0} minutes
                      </p>
                    </div>
                    <StatusBadge status={invitation.status} />
                  </div>
                  <div className="mt-5 flex flex-wrap justify-end gap-3">
                    <Link className="btn-primary" to={`/assessment/${invitation.invitationToken}`}>
                      {invitation.status === "Started" ? "Continue assessment" : "Start assessment"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {attempts.length ? (
        <section className="grid gap-4">
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
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  {attempt.status === "In Progress" ? (
                    <Link className="btn-primary" to={`/candidate/assessments/${attempt._id}/identity/notice`}>
                      Continue verification
                    </Link>
                  ) : null}
                  <Link className="btn-secondary" to={`/candidate/assessments/${attempt._id}/result`}>
                    View result
                  </Link>
                </div>
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
