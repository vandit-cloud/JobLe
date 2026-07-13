import { Award, MailPlus, SearchCheck, Star, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchTalentPool, inviteTalentCandidate } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { FilterPanel } from "../../components/common/FilterPanel";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { MatchScoreBadge } from "../../components/common/MatchScoreBadge";
import { PageHeader } from "../../components/common/PageHeader";
import { SearchInput } from "../../components/common/SearchInput";
import { StatisticCard } from "../../components/common/StatisticCard";
import { useToast } from "../../context/ToastContext";
import type { TalentPoolCandidate } from "../../types";

const ACTIONS = ["Invite to Apply", "Send Message", "Shortlist to Talent Pool", "Schedule Interview", "Request Job-Specific Assessment"];

export function TalentPoolPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TalentPoolCandidate[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState({
    search: "",
    skill: "",
    minScore: "",
    location: "",
    availability: "",
    level: "",
  });

  useEffect(() => {
    setLoading(true);
    fetchTalentPool(filters)
      .then((response) => {
        setItems(response.items);
        setSummary(response.summary);
      })
      .catch(() => showToast("Unable to load verified candidates.", "error"))
      .finally(() => setLoading(false));
  }, [filters]);

  async function sendAction(candidateId: string, actionType: string) {
    await inviteTalentCandidate(candidateId, { actionType });
    showToast(`${actionType} sent to candidate.`, "success");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Talent Pool"
        title="Verified Candidates"
        description="Discover candidates with public Skill Passport results and invite them into your hiring flow."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatisticCard title="Candidates" value={summary.total || 0} icon={UsersRound} />
        <StatisticCard title="Advanced+" value={summary.advanced || 0} icon={Award} accent="from-emerald-200/35 to-white" />
        <StatisticCard title="Intermediate" value={summary.intermediate || 0} icon={Star} accent="from-sky-200/35 to-white" />
        <StatisticCard title="Average score" value={summary.averageScore ? `${summary.averageScore}%` : "0%"} icon={SearchCheck} accent="from-amber-200/35 to-white" />
      </div>

      <FilterPanel>
        <div>
          <label className="label">Search</label>
          <SearchInput value={filters.search} onChange={(value) => setFilters((current) => ({ ...current, search: value }))} placeholder="React developer, candidate, title" />
        </div>
        <div>
          <label className="label">Skill</label>
          <input className="input" onChange={(event) => setFilters((current) => ({ ...current, skill: event.target.value }))} placeholder="React" value={filters.skill} />
        </div>
        <div>
          <label className="label">Minimum score</label>
          <input className="input" onChange={(event) => setFilters((current) => ({ ...current, minScore: event.target.value }))} placeholder="75" type="number" value={filters.minScore} />
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))} placeholder="Ahmedabad" value={filters.location} />
        </div>
        <div>
          <label className="label">Availability</label>
          <input className="input" onChange={(event) => setFilters((current) => ({ ...current, availability: event.target.value }))} placeholder="Immediate" value={filters.availability} />
        </div>
        <div>
          <label className="label">Candidate level</label>
          <select className="input" onChange={(event) => setFilters((current) => ({ ...current, level: event.target.value }))} value={filters.level}>
            <option value="">All levels</option>
            {["Beginner", "Intermediate", "Advanced", "Expert"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      </FilterPanel>

      {loading ? (
        <LoadingSkeleton className="h-80" />
      ) : items.length === 0 ? (
        <EmptyState title="No verified candidates match" description="Try another skill, score, location, or level filter." />
      ) : (
        <div className="grid gap-4">
          {items.map((candidate) => (
            <div key={candidate.candidateId} className="glass-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{candidate.level || candidate.experienceLevel}</p>
                  <h2 className="mt-2 text-2xl font-bold text-ink">{candidate.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {[candidate.professionalTitle, candidate.location, candidate.availability].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <MatchScoreBadge score={candidate.overallScore} />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {candidate.skillScores.slice(0, 8).map((skill) => (
                  <div key={skill.skill} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-800">{skill.skill}</p>
                    <p className="mt-2 text-xl font-bold text-tide">{skill.score}%</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {candidate.badges.map((badge) => (
                  <span key={badge.title} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {badge.title}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {ACTIONS.map((action) => (
                  <button key={action} className={action === "Invite to Apply" ? "btn-primary" : "btn-secondary"} onClick={() => sendAction(candidate.candidateId, action)} type="button">
                    {action === "Invite to Apply" ? <MailPlus className="h-4 w-4" /> : null}
                    {action}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
