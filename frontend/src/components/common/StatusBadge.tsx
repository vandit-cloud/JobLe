import { cn } from "../../lib/utils";

const STYLES: Record<string, string> = {
  Draft: "border-slate-200 bg-slate-100/90 text-slate-700",
  Published: "border-emerald-200 bg-emerald-100/90 text-emerald-700",
  Paused: "border-amber-200 bg-amber-100/90 text-amber-700",
  Closed: "border-red-200 bg-red-100/90 text-red-700",
  Expired: "border-rose-200 bg-rose-100/90 text-rose-700",
  Pending: "border-amber-200 bg-amber-100/90 text-amber-700",
  Verified: "border-emerald-200 bg-emerald-100/90 text-emerald-700",
  Rejected: "border-red-200 bg-red-100/90 text-red-700",
  Applied: "border-sky-200 bg-sky-100/90 text-sky-700",
  "Under Review": "border-indigo-200 bg-indigo-100/90 text-indigo-700",
  Shortlisted: "border-violet-200 bg-violet-100/90 text-violet-700",
  "Interview Scheduled": "border-cyan-200 bg-cyan-100/90 text-cyan-700",
  Selected: "border-emerald-200 bg-emerald-100/90 text-emerald-700",
  Withdrawn: "border-slate-200 bg-slate-100/90 text-slate-700",
  Scheduled: "border-sky-200 bg-sky-100/90 text-sky-700",
  Rescheduled: "border-amber-200 bg-amber-100/90 text-amber-700",
  Completed: "border-emerald-200 bg-emerald-100/90 text-emerald-700",
  Cancelled: "border-red-200 bg-red-100/90 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] shadow-sm", STYLES[status] || "border-slate-200 bg-slate-100/90 text-slate-700")}>
      {status}
    </span>
  );
}
