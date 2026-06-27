import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { cancelAssessmentInvitation, createAssessmentInvitations, fetchAssessment, fetchAssessmentInvitations, resendAssessmentInvitation } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/utils";
import type { AssessmentInvitation } from "../../types";

export function AssessmentInvitationsPage() {
  const { assessmentId = "" } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assessmentTitle, setAssessmentTitle] = useState("Assessment");
  const [invitations, setInvitations] = useState<AssessmentInvitation[]>([]);
  const [emails, setEmails] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const [assessment, invitationResponse] = await Promise.all([
        fetchAssessment(assessmentId),
        fetchAssessmentInvitations({ assessmentId, status, search }),
      ]);
      setAssessmentTitle(assessment.assessment.title);
      setInvitations(invitationResponse.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [assessmentId, search, status]);

  function buildInvitationLink(invitationToken: string) {
    return `${window.location.origin}/assessment/${invitationToken}`;
  }

  if (loading) return <LoadingSkeleton className="h-80" />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Invitations" title={`${assessmentTitle} invitations`} description="Generate secure invitation links, resend them, and monitor candidate progress by invitation status." />

      <div className="glass-panel p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2 xl:col-span-4">
            <label className="label">Candidate emails</label>
            <textarea className="input min-h-32" value={emails} onChange={(event) => setEmails(event.target.value)} />
          </div>
          <div>
            <label className="label">Expiry date</label>
            <input className="input" type="datetime-local" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
          </div>
          <div>
            <label className="label">Maximum attempts</label>
            <input className="input" min={1} type="number" value={maxAttempts} onChange={(event) => setMaxAttempts(Number(event.target.value) || 1)} />
          </div>
          <div>
            <label className="label">Search invitations</label>
            <input className="input" placeholder="Search by candidate email" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div>
            <label className="label">Status filter</label>
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {["Pending", "Sent", "Opened", "Resume Submitted", "Started", "Completed", "Expired", "Cancelled"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <label className="label">Import CSV or TXT email list</label>
            <input
              accept=".csv,.txt"
              className="input"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const content = await file.text();
                const parsed = content
                  .split(/[\r\n,;]+/)
                  .map((item) => item.trim())
                  .filter(Boolean);
                setEmails((current) => [current, ...parsed].filter(Boolean).join("\n"));
                event.target.value = "";
              }}
              type="file"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => {
            setSearch("");
            setStatus("");
          }} type="button">
            Reset filters
          </button>
          <button
            className="btn-primary"
            onClick={async () => {
              const candidateEmails = emails.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
              const response = await createAssessmentInvitations({
                assessmentId,
                candidateEmails,
                candidates: [],
                expiryDate: expiryDate || undefined,
                maxAttempts,
              });
              showToast(`${response.invitations.length} invitations created.`, "success");
              load();
            }}
            type="button"
          >
            Send invitations
          </button>
        </div>
      </div>

      {invitations.length === 0 ? (
        <EmptyState title="No invitations yet" description="Create invitations to start candidate assessment attempts." />
      ) : (
        <div className="grid gap-4">
          {invitations.map((invitation) => (
            <div key={invitation._id} className="glass-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-ink">{invitation.candidateName || invitation.candidateEmail}</h3>
                  <p className="mt-2 text-sm text-slate-600">{invitation.candidateEmail}</p>
                  <p className="mt-2 text-xs text-slate-500">Attempts: {invitation.attemptsUsed} / {invitation.maxAttempts}</p>
                  <p className="mt-1 text-xs text-slate-500">Expires: {formatDateTime(invitation.expiresAt)}</p>
                  {invitation.emailVerificationCode ? <p className="mt-1 text-xs text-slate-500">Verification code: {invitation.emailVerificationCode}</p> : null}
                </div>
                <StatusBadge status={invitation.status} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(buildInvitationLink(invitation.invitationToken));
                    showToast("Invitation link copied.", "success");
                  }}
                  type="button"
                >
                  Copy link
                </button>
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    await resendAssessmentInvitation(invitation._id);
                    showToast("Invitation resent.", "success");
                    load();
                  }}
                  type="button"
                >
                  Resend
                </button>
                <button
                  className="btn-danger"
                  onClick={async () => {
                    await cancelAssessmentInvitation(invitation._id);
                    showToast("Invitation cancelled.", "success");
                    load();
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
