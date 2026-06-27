import { Download, LogOut, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  deactivateCandidateAccount,
  deleteCandidateAccount,
  deleteCandidateSecuritySession,
  deleteOtherCandidateSecuritySessions,
  exportCandidateData,
  fetchCandidatePrivacy,
  fetchCandidateSecuritySessions,
  updateCandidatePrivacy,
} from "../../api/recruiter";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/utils";
import type { CandidatePrivacySettings, CandidateSecuritySession } from "../../types";

const DEFAULT_PRIVACY: CandidatePrivacySettings = {
  profileVisibility: "Visible only to companies I apply to",
  resumeVisibility: "Private",
  skillPassportVisibility: "Relevant company only",
  contactVisibility: {
    email: false,
    phone: false,
    location: true,
    socialLinks: true,
  },
  recruiterDiscovery: {
    discoverableByVerifiedRecruiters: true,
    recruitersCanSendOpportunities: true,
    blockedOrganizations: [],
    blockedRecruiters: [],
  },
  communicationPreferences: {
    applicationUpdates: true,
    assessmentReminders: true,
    interviewReminders: true,
    jobRecommendations: true,
    recruiterMessages: true,
    productAnnouncements: false,
    marketingMessages: false,
  },
  aiPreferences: {
    enableRecommendations: true,
    requestManualReview: false,
  },
};

export function CandidatePrivacyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [privacy, setPrivacy] = useState<CandidatePrivacySettings>(DEFAULT_PRIVACY);
  const [sessions, setSessions] = useState<CandidateSecuritySession[]>([]);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<CandidateSecuritySession | null>(null);
  const [password, setPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const { logout } = useAuth();
  const { showToast } = useToast();

  function loadPage() {
    setLoading(true);
    Promise.all([fetchCandidatePrivacy(), fetchCandidateSecuritySessions()])
      .then(([privacyResponse, sessionsResponse]) => {
        setPrivacy(privacyResponse || DEFAULT_PRIVACY);
        setSessions(sessionsResponse);
      })
      .catch(() => showToast("Unable to load privacy settings right now.", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      const updated = await updateCandidatePrivacy(privacy);
      setPrivacy(updated);
      showToast("Privacy settings updated.", "success");
    } catch {
      showToast("We couldn't save privacy settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  function toggle<K extends keyof CandidatePrivacySettings>(key: K, nestedKey?: string) {
    if (!nestedKey) return;
    setPrivacy((current) => ({
      ...current,
      [key]: {
        ...(current[key] as Record<string, boolean | string[]>),
        [nestedKey]: !(current[key] as Record<string, boolean>)[nestedKey],
      },
    }));
  }

  async function handleExport() {
    try {
      const data = await exportCandidateData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "candidate-data-export.json";
      anchor.click();
      URL.revokeObjectURL(url);
      showToast("Candidate data export downloaded.", "success");
    } catch {
      showToast("We couldn't export your data.", "error");
    }
  }

  async function handleDeactivate() {
    try {
      const response = await deactivateCandidateAccount({ password });
      showToast(response.message, "success");
      setDeactivateOpen(false);
      setPassword("");
      logout();
    } catch {
      showToast("We couldn't deactivate your account.", "error");
    }
  }

  async function handleDelete() {
    try {
      const response = await deleteCandidateAccount({ password: deletePassword, confirmationText: "DELETE" });
      showToast(response.message, "success");
      setDeleteOpen(false);
      setDeletePassword("");
      setConfirmationText("");
      logout();
    } catch {
      showToast("We couldn't process account deletion.", "error");
    }
  }

  async function handleDeleteSession() {
    if (!sessionToDelete) return;
    try {
      const response = await deleteCandidateSecuritySession(sessionToDelete.sessionId);
      showToast(response.message, "success");
      setSessionToDelete(null);
      if (response.logoutRequired) {
        logout();
        return;
      }
      loadPage();
    } catch {
      showToast("We couldn't revoke that session.", "error");
    }
  }

  async function handleDeleteOthers() {
    try {
      const response = await deleteOtherCandidateSecuritySessions();
      showToast(`${response.revokedSessions} other session(s) revoked.`, "success");
      loadPage();
    } catch {
      showToast("We couldn't revoke other sessions.", "error");
    }
  }

  if (loading) {
    return <LoadingSkeleton className="h-[40rem]" />;
  }

  return (
    <div className="space-y-6">
      <ConfirmationDialog
        cancelLabel="Cancel"
        confirmLabel="Deactivate"
        description="Deactivating your account will immediately hide your profile from recruiter discovery and revoke your active sessions."
        onClose={() => {
          setDeactivateOpen(false);
          setPassword("");
        }}
        onConfirm={handleDeactivate}
        open={deactivateOpen}
        title="Deactivate account?"
      />
      <ConfirmationDialog
        cancelLabel="Cancel"
        confirmLabel="Delete account"
        description="Deleting your account is intended for permanent exit. Type DELETE in the field below before confirming."
        onClose={() => {
          setDeleteOpen(false);
          setDeletePassword("");
          setConfirmationText("");
        }}
        onConfirm={handleDelete}
        open={deleteOpen && confirmationText === "DELETE"}
        title="Delete account?"
      />
      <ConfirmationDialog
        cancelLabel="Keep session"
        confirmLabel="Revoke session"
        description="This will immediately revoke the selected session. If it's the current one, you'll be logged out."
        onClose={() => setSessionToDelete(null)}
        onConfirm={handleDeleteSession}
        open={Boolean(sessionToDelete)}
        title="Revoke session?"
      />

      <PageHeader
        eyebrow="Privacy"
        title="Privacy, security, and data controls"
        description="Control profile discovery, contact visibility, AI preferences, data export, account state, and active sign-in sessions."
        action={
          <button className="btn-primary" disabled={saving} onClick={handleSave} type="button">
            {saving ? "Saving..." : "Save settings"}
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">Profile visibility</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="profileVisibility">
                Profile visibility
              </label>
              <select className="input" id="profileVisibility" onChange={(event) => setPrivacy((current) => ({ ...current, profileVisibility: event.target.value }))} value={privacy.profileVisibility}>
                <option>Private</option>
                <option>Visible only to companies I apply to</option>
                <option>Discoverable by verified recruiters</option>
                <option>Public professional profile</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="resumeVisibility">
                Resume visibility
              </label>
              <select className="input" id="resumeVisibility" onChange={(event) => setPrivacy((current) => ({ ...current, resumeVisibility: event.target.value }))} value={privacy.resumeVisibility}>
                <option>Private</option>
                <option>Visible only for submitted applications</option>
                <option>Discoverable by verified recruiters</option>
                <option>Disabled from recruiter search</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="skillPassportVisibility">
                Skill passport visibility
              </label>
              <select
                className="input"
                id="skillPassportVisibility"
                onChange={(event) => setPrivacy((current) => ({ ...current, skillPassportVisibility: event.target.value }))}
                value={privacy.skillPassportVisibility}
              >
                <option>Relevant company only</option>
                <option>Candidate only</option>
                <option>Verified recruiters only</option>
                <option>Public badges</option>
              </select>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">Contact visibility</h2>
          <div className="mt-5 space-y-3">
            {[
              ["email", "Show email to recruiters"],
              ["phone", "Show phone number to recruiters"],
              ["location", "Show location to recruiters"],
              ["socialLinks", "Show LinkedIn, GitHub, and portfolio links"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-3xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                {label}
                <input checked={privacy.contactVisibility[key as keyof typeof privacy.contactVisibility]} onChange={() => toggle("contactVisibility", key)} type="checkbox" />
              </label>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">Recruiter discovery</h2>
          <div className="mt-5 space-y-3">
            {[
              ["discoverableByVerifiedRecruiters", "Allow verified recruiters to discover my profile"],
              ["recruitersCanSendOpportunities", "Allow recruiters to send opportunities"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-3xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                {label}
                <input checked={privacy.recruiterDiscovery[key as keyof typeof privacy.recruiterDiscovery] as boolean} onChange={() => toggle("recruiterDiscovery", key)} type="checkbox" />
              </label>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">Communication preferences</h2>
          <div className="mt-5 space-y-3">
            {[
              ["applicationUpdates", "Application email updates"],
              ["assessmentReminders", "Assessment reminders"],
              ["interviewReminders", "Interview reminders"],
              ["jobRecommendations", "Job recommendations"],
              ["recruiterMessages", "Recruiter messages"],
              ["productAnnouncements", "Product announcements"],
              ["marketingMessages", "Marketing messages"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-3xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                {label}
                <input
                  checked={privacy.communicationPreferences[key as keyof typeof privacy.communicationPreferences]}
                  onChange={() => toggle("communicationPreferences", key)}
                  type="checkbox"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold text-ink">AI processing controls</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            ["enableRecommendations", "Enable optional AI job recommendations"],
            ["requestManualReview", "Request manual review when AI output looks incomplete"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-3xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              {label}
              <input checked={privacy.aiPreferences[key as keyof typeof privacy.aiPreferences]} onChange={() => toggle("aiPreferences", key)} type="checkbox" />
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-ink">Security sessions</h2>
            <button className="btn-secondary" onClick={handleDeleteOthers} type="button">
              <LogOut className="h-4 w-4" />
              Log out others
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {sessions.map((session) => (
              <div key={session.sessionId} className="rounded-3xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">{session.userAgent || "Unknown device"}</p>
                      {session.isCurrent ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Current</span> : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{session.approximateLocation}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Started {formatDateTime(session.createdAt)} • Last active {formatDateTime(session.lastActivityAt)}
                    </p>
                  </div>
                  <button className="btn-danger" onClick={() => setSessionToDelete(session)} type="button">
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-tide" />
              <h2 className="text-xl font-bold text-ink">Data export</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Download a JSON export containing your profile, resumes, applications, interviews, notifications, and privacy settings.
            </p>
            <button className="btn-primary mt-5" onClick={handleExport} type="button">
              Download export
            </button>
          </div>

          <div className="glass-panel p-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <h2 className="text-xl font-bold text-ink">Deactivate account</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Deactivate your candidate account to immediately hide your profile and revoke active sessions.</p>
            <input className="input mt-4" onChange={(event) => setPassword(event.target.value)} placeholder="Confirm password" type="password" value={password} />
            <button className="btn-secondary mt-4" onClick={() => setDeactivateOpen(true)} type="button">
              Deactivate account
            </button>
          </div>

          <div className="glass-panel p-6">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-red-600" />
              <h2 className="text-xl font-bold text-ink">Delete account</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              For permanent removal, enter your password and type <span className="font-semibold text-slate-800">DELETE</span> before continuing.
            </p>
            <input className="input mt-4" onChange={(event) => setDeletePassword(event.target.value)} placeholder="Confirm password" type="password" value={deletePassword} />
            <input className="input mt-4" onChange={(event) => setConfirmationText(event.target.value)} placeholder="Type DELETE to confirm" value={confirmationText} />
            <button className="btn-danger mt-4" disabled={confirmationText !== "DELETE"} onClick={() => setDeleteOpen(true)} type="button">
              Delete account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
