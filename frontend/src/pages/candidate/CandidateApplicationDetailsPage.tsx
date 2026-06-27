import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchCandidateApplication, submitCandidateApplication, updateCandidateApplicationDraft, withdrawCandidateApplication } from "../../api/recruiter";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { MatchScoreBreakdown } from "../../components/common/MatchScoreBreakdown";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatDateTime, resolveAssetUrl } from "../../lib/utils";
import type { ApplicationRecord, AssessmentInvitation, Interview, Job } from "../../types";

interface ApplicationDetailState {
  application: ApplicationRecord;
  interviews: Interview[];
  assessmentInvitations: AssessmentInvitation[];
  timeline: Array<{ label: string; at: string }>;
}

function getJob(application: ApplicationRecord) {
  if (application.job) return application.job;
  return typeof application.jobId === "string" ? null : application.jobId;
}

export function CandidateApplicationDetailsPage() {
  const { applicationId = "" } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApplicationDetailState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [draftCoverLetter, setDraftCoverLetter] = useState("");
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  useEffect(() => {
    fetchCandidateApplication(applicationId)
      .then((response) => {
        setData(response);
        setDraftCoverLetter(response.application.coverLetter || "");
        setDraftAnswers(
          Object.fromEntries((response.application.screeningAnswers || []).map((item) => [item.question, item.answer])),
        );
      })
      .catch(() => showToast("Unable to load this application.", "error"))
      .finally(() => setLoading(false));
  }, [applicationId]);

  async function handleWithdraw() {
    try {
      await withdrawCandidateApplication(applicationId);
      showToast("Application withdrawn.", "success");
      navigate("/candidate/applications");
    } catch {
      showToast("We couldn't withdraw this application.", "error");
    }
  }

  async function handleSaveDraft() {
    try {
      setSavingDraft(true);
      await updateCandidateApplicationDraft(applicationId, {
        coverLetter: draftCoverLetter,
        screeningAnswers: Object.entries(draftAnswers).map(([question, answer]) => ({ question, answer })),
      });
      showToast("Draft application updated.", "success");
    } catch {
      showToast("We couldn't save this draft application.", "error");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleSubmitDraft() {
    try {
      setSubmittingDraft(true);
      const application = await submitCandidateApplication(applicationId);
      showToast("Draft application submitted.", "success");
      navigate(`/candidate/applications/${application._id}`);
    } catch {
      showToast("We couldn't submit this draft application.", "error");
    } finally {
      setSubmittingDraft(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton className="h-96" />;
  }

  if (!data) {
    return <EmptyState title="Application not found" description="We couldn't load this application record." />;
  }

  const job = getJob(data.application) as Job | null;

  return (
    <div className="space-y-6">
      <ConfirmationDialog
        cancelLabel="Keep application"
        confirmLabel="Withdraw"
        description="This will close out the application from your side and mark it as withdrawn."
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleWithdraw}
        open={confirmOpen}
        title="Withdraw this application?"
      />

      <PageHeader
        eyebrow="Application details"
        title={job?.title || "Application"}
        description={`Submitted to ${job?.company?.name || "the company"} on ${formatDate(data.application.appliedAt)}.`}
        action={
          <>
            <StatusBadge status={data.application.status} />
            {data.application.status === "Draft" ? (
              <button className="btn-primary" disabled={submittingDraft} onClick={handleSubmitDraft} type="button">
                {submittingDraft ? "Submitting..." : "Submit application"}
              </button>
            ) : null}
            {!["Selected", "Withdrawn"].includes(data.application.status) ? (
              <button className="btn-danger" onClick={() => setConfirmOpen(true)} type="button">
                Withdraw
              </button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">Submitted application</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Company</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{job?.company?.name || "Not available"}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Location</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{job?.location || "Not available"}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cover letter</p>
                {data.application.status === "Draft" ? (
                  <textarea className="input mt-3 min-h-28" onChange={(event) => setDraftCoverLetter(event.target.value)} value={draftCoverLetter} />
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-700">{data.application.coverLetter || "No cover letter submitted."}</p>
                )}
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resume</p>
                <a className="mt-2 inline-flex text-sm font-semibold text-tide" href={resolveAssetUrl(data.application.resumeUrl)} rel="noreferrer" target="_blank">
                  Open submitted resume
                </a>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-bold text-slate-800">Screening answers</h3>
              <div className="mt-4 space-y-4">
                {data.application.screeningAnswers.length === 0 ? (
                  <p className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">No screening answers were required.</p>
                ) : (
                  data.application.screeningAnswers.map((item, index) => (
                    <div key={`${item.question}-${index}`} className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800">{item.question}</p>
                      {data.application.status === "Draft" ? (
                        <textarea
                          className="input mt-3 min-h-24"
                          onChange={(event) => setDraftAnswers((current) => ({ ...current, [item.question]: event.target.value }))}
                          value={draftAnswers[item.question] || ""}
                        />
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
              {data.application.status === "Draft" ? (
                <div className="mt-5">
                  <button className="btn-secondary" disabled={savingDraft} onClick={handleSaveDraft} type="button">
                    {savingDraft ? "Saving..." : "Save draft"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <MatchScoreBreakdown analysis={data.application.matchAnalysis} />
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">Timeline</h2>
            <div className="mt-5 space-y-4">
              {data.timeline.map((event, index) => (
                <div key={`${event.label}-${index}`} className="flex gap-4">
                  <div className="mt-1 h-3 w-3 rounded-full bg-emerald-500" />
                  <div>
                    <p className="font-semibold text-slate-800">{event.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDateTime(event.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">Assessment and interview</h2>
            <div className="mt-5 space-y-4">
              {data.assessmentInvitations.map((invitation) => (
                <div key={invitation._id} className="rounded-3xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-800">{typeof invitation.assessmentId === "string" ? "Assessment" : invitation.assessmentId.title}</p>
                    <StatusBadge status={invitation.status} />
                  </div>
                  <Link className="mt-3 inline-flex text-sm font-semibold text-tide" to={`/assessment/${invitation.invitationToken}`}>
                    Open assessment flow
                  </Link>
                </div>
              ))}
              {data.interviews.map((interview) => (
                <div key={interview._id} className="rounded-3xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-800">{interview.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{formatDateTime(interview.startDateTime)}</p>
                  {interview.meetingLink ? (
                    <a className="mt-3 inline-flex text-sm font-semibold text-tide" href={interview.meetingLink} rel="noreferrer" target="_blank">
                      Join meeting
                    </a>
                  ) : null}
                </div>
              ))}
              {data.assessmentInvitations.length === 0 && data.interviews.length === 0 ? (
                <p className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">No assessments or interviews are linked to this application yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
