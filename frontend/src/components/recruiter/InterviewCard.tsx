import type { ReactNode } from "react";
import type { Candidate, Interview, Job } from "../../types";
import { formatDateTime } from "../../lib/utils";
import { StatusBadge } from "../common/StatusBadge";

export function InterviewCard({
  interview,
  actions,
}: {
  interview: Interview;
  actions?: ReactNode;
}) {
  const candidate = interview.candidateId as Candidate;
  const job = interview.jobId as Job;

  return (
    <div className="glass-panel p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.14)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-ink">{candidate?.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{job?.title}</p>
        </div>
        <StatusBadge status={interview.status} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">When</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{formatDateTime(interview.startDateTime)}</p>
        </div>
        <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Type</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{interview.interviewType}</p>
        </div>
        <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Interviewer</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{interview.interviewerName}</p>
        </div>
        <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Link or location</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{interview.meetingLink || interview.location || "TBD"}</p>
        </div>
      </div>
      {actions ? <div className="mt-5">{actions}</div> : null}
    </div>
  );
}
