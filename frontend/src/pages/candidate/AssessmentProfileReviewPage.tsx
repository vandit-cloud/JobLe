import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { updateCandidateAssessmentProfile } from "../../api/recruiter";
import { useToast } from "../../context/ToastContext";

export function AssessmentProfileReviewPage() {
  const { invitationToken = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const initial = useMemo(() => {
    const stored = localStorage.getItem(`assessment-profile-${invitationToken}`);
    return stored
      ? JSON.parse(stored)
      : {
          name: "",
          email: "",
          phone: "",
          skills: [],
          education: [],
          experience: [],
          projects: [],
          certifications: [],
          resumeUrl: "",
        };
  }, [invitationToken]);
  const [profile, setProfile] = useState(initial);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="glass-panel p-8">
        <h1 className="text-3xl font-extrabold text-ink">Review your extracted profile</h1>
        <p className="mt-3 text-sm text-slate-600">Correct anything that looks wrong before you continue into the assessment flow.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input className="input" value={profile.name} onChange={(event) => setProfile((current: any) => ({ ...current, name: event.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={profile.email} onChange={(event) => setProfile((current: any) => ({ ...current, email: event.target.value }))} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={profile.phone || ""} onChange={(event) => setProfile((current: any) => ({ ...current, phone: event.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Skills (comma-separated)</label>
            <input
              className="input"
              value={(profile.skills || []).join(", ")}
              onChange={(event) => setProfile((current: any) => ({ ...current, skills: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-between gap-3">
          <Link className="btn-secondary" to={`/assessment/${invitationToken}/resume`}>
            Back
          </Link>
          <button
            className="btn-primary"
            onClick={async () => {
              await updateCandidateAssessmentProfile(invitationToken, profile);
              showToast("Profile confirmed.", "success");
              navigate(`/assessment/${invitationToken}/system-check`);
            }}
            type="button"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

