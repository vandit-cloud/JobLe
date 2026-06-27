import type { ReactNode } from "react";
import type { ApplicationRecord, Candidate, Job } from "../../types";
import { formatDate } from "../../lib/utils";
import { MatchScoreBadge } from "../common/MatchScoreBadge";
import { StatusBadge } from "../common/StatusBadge";

export function ApplicantTable({
  applications,
  actions,
}: {
  applications: ApplicationRecord[];
  actions?: (application: ApplicationRecord) => ReactNode;
}) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="soft-table min-w-full text-left">
          <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Candidate</th>
              <th className="px-5 py-4">Job</th>
              <th className="px-5 py-4">Skills</th>
              <th className="px-5 py-4">Applied</th>
              <th className="px-5 py-4">Score</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => {
              const candidate = application.candidateId as Candidate;
              const job = application.jobId as Job;
              return (
                <tr key={application._id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800">{candidate?.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{candidate?.professionalTitle}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{job?.title}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{candidate?.skills?.slice(0, 3).join(", ")}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{formatDate(application.appliedAt)}</td>
                  <td className="px-5 py-4">
                    <MatchScoreBadge score={application.matchAnalysis?.overallScore} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={application.status} />
                  </td>
                  <td className="px-5 py-4">{actions?.(application)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
