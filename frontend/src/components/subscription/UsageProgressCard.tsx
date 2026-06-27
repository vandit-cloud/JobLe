import type { UsageOverview } from "../../types";
import { cn, titleCase } from "../../lib/utils";

export function UsageProgressCard({ usage }: { usage: UsageOverview }) {
  const color =
    usage.state === "Limit reached"
      ? "bg-rose-500"
      : usage.state === "Approaching limit"
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="glass-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{titleCase(usage.resourceType)}</p>
          <p className="mt-2 text-2xl font-extrabold text-ink">
            {usage.used}
            {usage.limit !== null ? ` / ${usage.limit}` : " / Unlimited"}
          </p>
          <p className="mt-2 text-sm text-slate-600">Reset date: {usage.resetDate ? new Date(usage.resetDate).toLocaleDateString() : "N/A"}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{usage.state}</span>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(usage.percentageUsed || 0, 100)}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-600">Additional credits remaining: {usage.additionalCreditsRemaining}</p>
    </div>
  );
}

