import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export function StatisticCard({
  title,
  value,
  caption,
  icon: Icon,
  accent = "from-sunrise/15 to-white",
}: {
  title: string;
  value: string | number;
  caption?: string;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <div className={cn("glass-panel bg-gradient-to-br p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.14)]", accent)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-ink">{value}</p>
          {caption ? <p className="mt-3 text-sm leading-6 text-slate-600">{caption}</p> : null}
        </div>
        <div className="rounded-[22px] border border-white/80 bg-white/90 p-3 shadow-lg shadow-slate-200/60">
          <Icon className="h-5 w-5 text-ink" />
        </div>
      </div>
    </div>
  );
}
