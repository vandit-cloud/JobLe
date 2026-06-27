import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Job } from "../../types";
import { formatDate, formatCurrency } from "../../lib/utils";
import { StatusBadge } from "../common/StatusBadge";

export function JobCard({
  job,
  actions,
}: {
  job: Job;
  actions?: ReactNode;
}) {
  return (
    <div className="glass-panel p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.14)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-ink">{job.title}</h3>
            <StatusBadge status={job.status} />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {job.department} • {job.location} • {job.employmentType} • {job.workplaceType}
          </p>
        </div>
        {actions}
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{job.summary}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Deadline</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{formatDate(job.applicationDeadline)}</p>
        </div>
        <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Applicants</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{job.applicantsCount ?? 0}</p>
        </div>
        <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Shortlisted</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{job.shortlistedCount ?? 0}</p>
        </div>
        <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Salary</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {job.salary.showPublicly
              ? `${formatCurrency(job.salary.minimum, job.salary.currency)} - ${formatCurrency(job.salary.maximum, job.salary.currency)}`
              : "Hidden publicly"}
          </p>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Link className="btn-secondary" to={`/recruiter/jobs/${job._id}`}>
          View job
        </Link>
      </div>
    </div>
  );
}
