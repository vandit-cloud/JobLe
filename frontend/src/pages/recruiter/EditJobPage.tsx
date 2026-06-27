import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchJob, updateJob } from "../../api/recruiter";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { JobEditorForm } from "../../components/recruiter/JobEditorForm";
import type { JobFormValues } from "../../schemas/jobSchema";
import { useToast } from "../../context/ToastContext";

export function EditJobPage() {
  const { jobId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [initialValues, setInitialValues] = useState<Partial<JobFormValues> | null>(null);

  useEffect(() => {
    fetchJob(jobId).then((response) => {
      setInitialValues({
        title: response.job.title,
        department: response.job.department || "",
        openings: response.job.openings,
        employmentType: response.job.employmentType,
        workplaceType: response.job.workplaceType,
        location: response.job.location,
        summary: response.job.summary,
        responsibilities: response.job.responsibilities,
        requiredQualifications: response.job.requiredQualifications,
        preferredQualifications: response.job.preferredQualifications,
        requiredSkills: response.job.requiredSkills,
        preferredSkills: response.job.preferredSkills,
        minimumEducation: response.job.minimumEducation || "",
        minimumExperience: response.job.minimumExperience,
        maximumExperience: response.job.maximumExperience,
        certifications: response.job.certifications,
        languages: response.job.languages,
        salary: {
          minimum: response.job.salary.minimum ?? 0,
          maximum: response.job.salary.maximum ?? 0,
          currency: response.job.salary.currency,
          period: response.job.salary.period,
          showPublicly: response.job.salary.showPublicly,
        },
        applicationDeadline: response.job.applicationDeadline?.slice(0, 10),
        screeningQuestions: response.job.screeningQuestions,
        requireResume: response.job.requireResume,
        requireCoverLetter: response.job.requireCoverLetter,
        applicationInstructions: response.job.applicationInstructions || "",
      });
    });
  }, [jobId]);

  if (!initialValues) {
    return <LoadingSkeleton className="h-96" />;
  }

  return (
    <JobEditorForm
      title="Edit job"
      description="Update role details, candidate requirements, salary visibility, and application settings."
      initialValues={initialValues}
      submitLabel="Save changes"
      onSubmit={async (values) => {
        await updateJob(jobId, values);
        showToast("Job updated successfully.", "success");
        navigate(`/recruiter/jobs/${jobId}`);
      }}
    />
  );
}
