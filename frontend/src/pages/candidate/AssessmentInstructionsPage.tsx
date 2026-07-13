import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchCandidateAssessmentContext, startCandidateAssessment } from "../../api/recruiter";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function AssessmentInstructionsPage() {
  const { invitationToken = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchCandidateAssessmentContext(invitationToken).then(setData);
  }, [invitationToken]);

  if (!data) return <LoadingSkeleton className="m-6 h-80" />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="glass-panel p-8">
        <h1 className="text-3xl font-extrabold text-ink">Assessment instructions</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{data.assessment.candidateInstructions}</p>
        <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm text-slate-600">
          <p>Auto-save is enabled. Temporary connection loss should not erase saved answers.</p>
          <p className="mt-2">Integrity indicators are for human recruiter review only.</p>
          <p className="mt-2">Final submission requires confirmation.</p>
        </div>
        <div className="mt-6 flex justify-between gap-3">
          <Link className="btn-secondary" to={`/assessment/${invitationToken}/system-check`}>
            Back
          </Link>
          <button
            className="btn-primary"
            onClick={async () => {
              const response = await startCandidateAssessment(invitationToken);
              localStorage.setItem(`attempt-${invitationToken}`, response.attempt._id);
              showToast("Assessment started.", "success");
              const verificationPath = `/candidate/assessments/${response.attempt._id}/identity/notice`;
              if (user?.role === "candidate") {
                navigate(verificationPath);
                return;
              }
              navigate("/login", { state: { from: verificationPath } });
            }}
            type="button"
          >
            Start assessment
          </button>
        </div>
      </div>
    </div>
  );
}
