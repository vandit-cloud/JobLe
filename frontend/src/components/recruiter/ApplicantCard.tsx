import type { ReactNode } from "react";
import type { ApplicationRecord, Candidate, Job } from "../../types";
import { formatDate } from "../../lib/utils";
import { MatchScoreBadge } from "../common/MatchScoreBadge";
import { StatusBadge } from "../common/StatusBadge";

export function ApplicantCard({
  application,
  action,
}: {
  application: ApplicationRecord & { candidate?: Candidate; job?: Job };
  action?: ReactNode;
}) {
  const candidate = (application.candidateId as Candidate) || application.candidate;
  const job = (application.jobId as Job) || application.job;

  return (
    <div className="glass-panel p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.14)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-ink">{candidate?.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{candidate?.professionalTitle}</p>
          <p className="mt-2 text-sm text-slate-500">Applied for {job?.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <MatchScoreBadge score={application.matchAnalysis?.overallScore} />
          <StatusBadge status={application.status} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {candidate?.skills?.slice(0, 5).map((skill) => (
          <span key={skill} className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>{candidate?.location || "Location unavailable"}</span>
        <span>Applied {formatDate(application.appliedAt)}</span>
      </div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
