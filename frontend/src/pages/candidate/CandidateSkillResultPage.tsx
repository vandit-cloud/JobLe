import { ArrowLeft, Award, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCandidateSkillPassport } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { MatchScoreBadge } from "../../components/common/MatchScoreBadge";
import { PageHeader } from "../../components/common/PageHeader";
import { StatisticCard } from "../../components/common/StatisticCard";
import { useToast } from "../../context/ToastContext";
import type { SkillPassport } from "../../types";

export function CandidateSkillResultPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [passport, setPassport] = useState<SkillPassport | null>(null);

  useEffect(() => {
    fetchCandidateSkillPassport()
      .then(setPassport)
      .catch(() => showToast("Unable to load your skill result.", "error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton className="h-[36rem]" />;

  if (!passport?.result?.overallScore) {
    return (
      <EmptyState
        title="No skill result yet"
        description="Complete and submit your standard skill test to generate a verified result."
        action={
          <Link className="btn-primary" to="/candidate/resume/skill-passport/test">
            Go to skill test
          </Link>
        }
      />
    );
  }

  const result = passport.result;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Verified result"
        title="Skill Test Result"
        description="Your standalone verified skill result page. Come back anytime from the sidebar to review your scores, badges, and improvement areas."
        action={
          <Link className="btn-secondary" to="/candidate/resume/skill-passport">
            <ArrowLeft className="h-4 w-4" />
            Back to resume passport
          </Link>
        }
      />

      <div className="glass-panel overflow-hidden p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Overall technical score</p>
            <h2 className="mt-3 text-5xl font-extrabold tracking-tight text-ink">{result.overallScore}%</h2>
            <p className="mt-2 text-lg font-semibold text-slate-700">{result.level}</p>
          </div>
          <MatchScoreBadge score={result.overallScore} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatisticCard title="Verified skills" value={result.verifiedSkills.length} icon={CheckCircle2} accent="from-emerald-200/35 to-white" />
        <StatisticCard title="Badges earned" value={result.badges.length} icon={Award} accent="from-sky-200/35 to-white" />
        <StatisticCard title="Needs improvement" value={result.needsImprovement.length} icon={TrendingUp} accent="from-amber-200/35 to-white" />
      </div>

      <div className="glass-panel p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Identity verification</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Baseline status</p>
            <p className="mt-2 text-lg font-bold text-ink">{passport.identityVerification?.status || "Not Started"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Submit check</p>
            <p className="mt-2 text-lg font-bold text-ink">{passport.identityVerification?.lastCheck?.status || "Not Checked"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Same-person confidence</p>
            <p className="mt-2 text-lg font-bold text-ink">
              {passport.identityVerification?.lastCheck ? `${passport.identityVerification.lastCheck.confidence}%` : "NA"}
            </p>
          </div>
        </div>
        {!result.publicVisible ? (
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            This result is visible to you, but it is not public for recruiters until the identity check is reviewed.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Skill scores</p>
          <div className="mt-5 grid gap-4">
            {result.skillScores.map((item) => (
              <div key={item.skill} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-ink">{item.skill}</p>
                  <span className="text-sm font-bold text-tide">{item.score}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-gradient-to-r from-tide to-emerald-400" style={{ width: `${Math.max(0, Math.min(item.score, 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="glass-panel p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Badges</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {result.badges.length ? (
                result.badges.map((badge) => (
                  <span key={badge.title} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {badge.title} - {badge.score}% - {badge.level}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-600">No badges earned yet. Scores above 40% award skill badges.</p>
              )}
            </div>
          </div>

          <div className="glass-panel p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Verified skills</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {result.verifiedSkills.length ? (
                result.verifiedSkills.map((skill) => (
                  <span key={skill} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-600">No skill crossed the verified threshold yet.</p>
              )}
            </div>
          </div>

          <div className="glass-panel p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Needs improvement</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {result.needsImprovement.length ? (
                result.needsImprovement.map((skill) => (
                  <span key={skill} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-600">Strong work. No low-score areas were detected in this test.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
