import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchCandidateAssessmentContext, verifyCandidateInvitation } from "../../api/recruiter";
import { useToast } from "../../context/ToastContext";

export function AssessmentVerifyPage() {
  const navigate = useNavigate();
  const { invitationToken = "" } = useParams();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    fetchCandidateAssessmentContext(invitationToken)
      .then((context) => setEmail(context.invitation.candidateEmail || ""))
      .catch(() => {});
  }, [invitationToken]);

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="glass-panel p-8">
        <h1 className="text-3xl font-extrabold text-ink">Verify your email</h1>
        <p className="mt-3 text-sm text-slate-600">Confirm your invitation with the OTP or magic-link code sent by email.</p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div>
            <label className="label">Verification code</label>
            <input className="input" value={code} onChange={(event) => setCode(event.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex justify-between gap-3">
          <Link className="btn-secondary" to={`/assessment/${invitationToken}`}>
            Back
          </Link>
          <button
            className="btn-primary"
            onClick={async () => {
              await verifyCandidateInvitation(invitationToken, { email, code });
              const context = await fetchCandidateAssessmentContext(invitationToken);
              showToast("Invitation verified.", "success");
              navigate(context.assessment.settings.requireResume ? `/assessment/${invitationToken}/resume` : `/assessment/${invitationToken}/system-check`);
            }}
            type="button"
          >
            Verify
          </button>
        </div>
      </div>
    </div>
  );
}
