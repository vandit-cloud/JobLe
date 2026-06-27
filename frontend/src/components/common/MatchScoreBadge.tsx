import { cn } from "../../lib/utils";

export function MatchScoreBadge({ score = 0 }: { score?: number }) {
  const palette =
    score >= 80
      ? "border-emerald-200 bg-emerald-100/90 text-emerald-700"
      : score >= 60
        ? "border-amber-200 bg-amber-100/90 text-amber-700"
        : "border-rose-200 bg-rose-100/90 text-rose-700";

  return <span className={cn("inline-flex rounded-full border px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.16em] shadow-sm", palette)}>{score}% match</span>;
}
