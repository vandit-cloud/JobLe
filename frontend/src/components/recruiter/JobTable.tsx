import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Job } from "../../types";
import { formatDate } from "../../lib/utils";
import { StatusBadge } from "../common/StatusBadge";

export function JobTable({
  jobs,
  actions,
}: {
  jobs: Job[];
  actions?: (job: Job) => ReactNode;
}) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="soft-table min-w-full text-left">
          <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Job</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Deadline</th>
              <th className="px-5 py-4">Applicants</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job._id}>
                <td className="px-5 py-4">
                  <Link className="font-semibold text-ink hover:text-tide" to={`/recruiter/jobs/${job._id}`}>
                    {job.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">{job.department}</p>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{job.location}</td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  {job.employmentType} • {job.workplaceType}
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{formatDate(job.applicationDeadline)}</td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-700">{job.applicantsCount ?? 0}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-5 py-4">{actions?.(job)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
