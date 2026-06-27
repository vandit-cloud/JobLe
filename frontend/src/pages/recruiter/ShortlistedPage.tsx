import { useEffect, useState } from "react";
import { compareCandidates, fetchShortlisted, removeShortlist, selectCandidate } from "../../api/recruiter";
import { ApplicantCard } from "../../components/recruiter/ApplicantCard";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { MatchScoreBadge } from "../../components/common/MatchScoreBadge";
import { PageHeader } from "../../components/common/PageHeader";
import { StatisticCard } from "../../components/common/StatisticCard";
import type { ApplicationRecord, Candidate, Job } from "../../types";
import { CalendarCheck2, Medal, MessageSquareMore, Trophy } from "lucide-react";
import { useToast } from "../../context/ToastContext";

export function ShortlistedPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<any[]>([]);

  useEffect(() => {
    fetchShortlisted()
      .then((response) => {
        setApplications(response.items);
        setSummary(response.summary);
      })
      .finally(() => setLoading(false));
  }, []);

  async function refresh() {
    const response = await fetchShortlisted();
    setApplications(response.items);
    setSummary(response.summary);
  }

  if (loading) {
    return <LoadingSkeleton className="h-80" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Shortlist"
        title="Shortlisted candidates"
        description="Stay focused on promising candidates, compare them fairly, and keep final decisions with recruiters."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatisticCard title="Total shortlisted" value={summary.totalShortlisted || 0} icon={Medal} />
        <StatisticCard title="Awaiting interview" value={summary.awaitingInterview || 0} icon={MessageSquareMore} accent="from-violet-200/35 to-white" />
        <StatisticCard title="Interview scheduled" value={summary.interviewScheduled || 0} icon={CalendarCheck2} accent="from-sky-200/35 to-white" />
        <StatisticCard title="Interview completed" value={summary.interviewCompleted || 0} icon={Trophy} accent="from-emerald-200/35 to-white" />
      </div>

      {applications.length === 0 ? (
        <EmptyState title="No shortlisted candidates yet" description="Shortlist candidates from the applicant pipeline to start comparison and interview planning." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">Select two to four candidates to compare skills, experience, education, and availability.</p>
            <button
              className="btn-secondary"
              disabled={selectedIds.length < 2}
              onClick={async () => {
                const response = await compareCandidates(selectedIds);
                setComparison(response.comparison);
              }}
              type="button"
            >
              Compare selected
            </button>
          </div>

          {comparison.length > 0 ? (
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold text-ink">Comparison</h2>
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {comparison.map((item) => {
                  const candidate = item.candidate as Candidate;
                  const job = item.job as Job;
                  return (
                    <div key={item.applicationId} className="rounded-3xl bg-slate-50 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-800">{candidate.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">{job.title}</p>
                        </div>
                        <MatchScoreBadge score={item.matchAnalysis?.overallScore} />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {candidate.skills.slice(0, 5).map((skill: string) => (
                          <span key={skill} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                      <p className="mt-4 text-sm text-slate-600">Availability: {item.availability}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4">
            {applications.map((application) => (
              <ApplicantCard
                key={application._id}
                application={application}
                action={
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                      <input
                        checked={selectedIds.includes(application._id)}
                        onChange={(event) => {
                          setSelectedIds((current) =>
                            event.target.checked ? [...current, application._id].slice(0, 4) : current.filter((id) => id !== application._id),
                          );
                        }}
                        type="checkbox"
                      />
                      Compare
                    </label>
                    <button
                      className="btn-secondary"
                      onClick={async () => {
                        const note = window.prompt("Optional internal note for removing from shortlist:");
                        await removeShortlist(application._id, { nextStatus: "Under Review", note: note || undefined });
                        showToast("Candidate removed from shortlist.", "success");
                        refresh();
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                    <button
                      className="btn-primary"
                      onClick={async () => {
                        await selectCandidate(application._id);
                        showToast("Candidate marked as selected.", "success");
                        refresh();
                      }}
                      type="button"
                    >
                      Mark selected
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

