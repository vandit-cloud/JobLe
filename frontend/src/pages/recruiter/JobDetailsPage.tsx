import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchJob } from "../../api/recruiter";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { formatCurrency, formatDate } from "../../lib/utils";
import type { Job } from "../../types";

export function JobDetailsPage() {
  const { jobId = "" } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [applicantCount, setApplicantCount] = useState(0);

  useEffect(() => {
    fetchJob(jobId).then((response) => {
      setJob(response.job);
      setApplicantCount(response.applicantCount);
    });
  }, [jobId]);

  if (!job) {
    return <LoadingSkeleton className="h-96" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Job details"
        title={job.title}
        description={job.summary}
        action={
          <Link className="btn-primary" to={`/recruiter/jobs/${job._id}/edit`}>
            Edit job
          </Link>
        }
      />

      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={job.status} />
          <span className="text-sm text-slate-500">{job.department}</span>
          <span className="text-sm text-slate-500">{job.location}</span>
          <span className="text-sm text-slate-500">{job.employmentType}</span>
          <span className="text-sm text-slate-500">{job.workplaceType}</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Application deadline</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{formatDate(job.applicationDeadline)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Applicants</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{applicantCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Experience range</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {job.minimumExperience} - {job.maximumExperience} years
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Salary</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {job.salary.showPublicly
                ? `${formatCurrency(job.salary.minimum, job.salary.currency)} - ${formatCurrency(job.salary.maximum, job.salary.currency)}`
                : "Hidden publicly"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-slate-800">Responsibilities</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {job.responsibilities.map((item) => (
              <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {item}
              </span>
            ))}
          </div>
          <h2 className="mt-8 text-xl font-bold text-slate-800">Required skills</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {job.requiredSkills.map((item) => (
              <span key={item} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {item}
              </span>
            ))}
          </div>
          <h2 className="mt-8 text-xl font-bold text-slate-800">Preferred skills</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {job.preferredSkills.map((item) => (
              <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-slate-800">Application requirements</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Education</p>
              <p className="mt-2 text-sm text-slate-700">{job.minimumEducation}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Screening questions</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {job.screeningQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Instructions</p>
              <p className="mt-2 text-sm text-slate-700">{job.applicationInstructions || "No additional instructions."}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

