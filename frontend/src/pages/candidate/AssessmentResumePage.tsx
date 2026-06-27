import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { uploadCandidateResume } from "../../api/recruiter";
import { FileUpload } from "../../components/forms/FileUpload";
import { useToast } from "../../context/ToastContext";

export function AssessmentResumePage() {
  const { invitationToken = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="glass-panel p-8">
        <h1 className="text-3xl font-extrabold text-ink">Upload your resume</h1>
        <p className="mt-3 text-sm text-slate-600">Your resume is stored privately and used only for recruiter-reviewed, non-protected skill matching.</p>
        <div className="mt-6">
          <FileUpload label="Resume file" onChange={setFile} />
        </div>
        <div className="mt-6 flex justify-between gap-3">
          <Link className="btn-secondary" to={`/assessment/${invitationToken}/verify`}>
            Back
          </Link>
          <button
            className="btn-primary"
            disabled={!file}
            onClick={async () => {
              if (!file) return;
              const response = await uploadCandidateResume(invitationToken, file);
              localStorage.setItem(`assessment-profile-${invitationToken}`, JSON.stringify(response.profile));
              showToast("Resume uploaded and profile extracted.", "success");
              navigate(`/assessment/${invitationToken}/profile-review`);
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

