import { useNavigate } from "react-router-dom";
import { createDraftJob, createJob } from "../../api/recruiter";
import { JobEditorForm } from "../../components/recruiter/JobEditorForm";
import type { JobFormValues } from "../../schemas/jobSchema";
import { useToast } from "../../context/ToastContext";

export function PostJobPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  async function handlePublish(values: JobFormValues) {
    await createJob(values);
    showToast("Job published successfully.", "success");
    navigate("/recruiter/jobs");
  }

  async function handleDraft(values: JobFormValues) {
    await createDraftJob(values);
    showToast("Draft job saved successfully.", "success");
    navigate("/recruiter/jobs");
  }

  return (
    <JobEditorForm
      title="Post a new job"
      description="Build the role step by step, draft with AI if helpful, then publish only after manual review."
      submitLabel="Publish job"
      onSubmit={handlePublish}
      onSaveDraft={handleDraft}
    />
  );
}

