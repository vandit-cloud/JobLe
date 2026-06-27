import type { MatchAnalysis } from "../../types";

export function MatchScoreBreakdown({ analysis }: { analysis?: MatchAnalysis }) {
  if (!analysis) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        No AI analysis yet. Run analysis to generate recommendation details.
      </div>
    );
  }

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">AI recommendation</p>
          <h3 className="mt-2 text-2xl font-extrabold text-ink">{analysis.overallScore}% overall match</h3>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(analysis.scores).map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-700">Matched skills</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {analysis.matchedSkills.map((skill) => (
              <span key={skill} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">Missing skills</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {analysis.missingSkills.map((skill) => (
              <span key={skill} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-600">{analysis.explanation}</p>
    </div>
  );
}

