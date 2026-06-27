import { BriefcaseBusiness, ClipboardList, SearchCheck, Trophy, UserRoundCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCandidateApplications, withdrawCandidateApplication } from "../../api/recruiter";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { MatchScoreBadge } from "../../components/common/MatchScoreBadge";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/common/Pagination";
import { StatisticCard } from "../../components/common/StatisticCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../lib/utils";
import type { ApplicationRecord, CandidateApplicationsResponse, Job } from "../../types";

function getApplicationJob(application: ApplicationRecord) {
  if (application.job) {
    return application.job;
  }
  return typeof application.jobId === "string" ? null : application.jobId;
}

export function CandidateApplicationsPage() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<CandidateApplicationsResponse | null>(null);
  const [selected, setSelected] = useState<ApplicationRecord | null>(null);
  const { showToast } = useToast();

  function loadApplications(nextPage = page, nextStatus = status, nextSearch = search) {
    setLoading(true);
    fetchCandidateApplications({
      page: nextPage,
      status: nextStatus || undefined,
      search: nextSearch || undefined,
      sort: "recentlyUpdated",
    })
      .then(setData)
      .catch(() => showToast("Unable to load applications right now.", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadApplications(page, status, search);
  }, [page, status]);

  async function handleWithdraw() {
    if (!selected) return;
    try {
      await withdrawCandidateApplication(selected._id);
      setSelected(null);
      showToast("Application withdrawn.", "success");
      loadApplications(page, status, search);
    } catch {
      showToast("We couldn't withdraw this application.", "error");
    }
  }

  return (
    <div className="space-y-6">
      <ConfirmationDialog
        cancelLabel="Keep application"
        confirmLabel="Withdraw"
        description="This will mark the application as withdrawn. Recruiters will still retain the original application record."
        onClose={() => setSelected(null)}
        onConfirm={handleWithdraw}
        open={Boolean(selected)}
        title="Withdraw application?"
      />

      <PageHeader
        eyebrow="Applications"
        title="My applications"
        description="Review current application stages, match scores, and next steps across the jobs you've applied to."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatisticCard title="Total applications" value={data?.summary.totalApplications || 0} icon={BriefcaseBusiness} />
        <StatisticCard title="Under review" value={data?.summary.underReview || 0} icon={SearchCheck} accent="from-sky-200/35 to-white" />
        <StatisticCard title="Shortlisted" value={data?.summary.shortlisted || 0} icon={ClipboardList} accent="from-violet-200/30 to-white" />
        <StatisticCard title="Assessment pending" value={data?.summary.assessmentPending || 0} icon={UserRoundCheck} accent="from-amber-200/30 to-white" />
        <StatisticCard title="Selected" value={data?.summary.selected || 0} icon={Trophy} accent="from-emerald-200/30 to-white" />
      </div>

      <div className="glass-panel grid gap-4 p-5 md:grid-cols-3">
        <div>
          <label className="label" htmlFor="application-search">
            Search
          </label>
          <input className="input" id="application-search" onChange={(event) => setSearch(event.target.value)} placeholder="Job title or company" value={search} />
        </div>
        <div>
          <label className="label" htmlFor="application-status">
            Status
          </label>
          <select className="input" id="application-status" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Applied">Applied</option>
            <option value="Under Review">Under Review</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Interview Scheduled">Interview Scheduled</option>
            <option value="Selected">Selected</option>
            <option value="Rejected">Rejected</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" onClick={() => loadApplications(1, status, search)} type="button">
            Apply filters
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-96" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No applications found" description="You haven't applied to any roles for the current filters." />
      ) : (
        <div className="space-y-4">
          {data.items.map((application) => {
            const job = getApplicationJob(application) as Job | null;
            return (
              <div key={application._id} className="glass-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-ink">{job?.title || "Application"}</h2>
                      <StatusBadge status={application.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {job?.company?.name || "Company"} • Applied {formatDate(application.appliedAt)}
                    </p>
                  </div>
                  <MatchScoreBadge score={application.matchAnalysis?.overallScore} />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Location</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{job?.location || "Not available"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Workplace</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{job?.workplaceType || "Not available"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Employment type</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{job?.employmentType || "Not available"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Last updated</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{formatDate(application.updatedAt || application.appliedAt)}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link className="btn-primary" to={`/candidate/applications/${application._id}`}>
                    View application
                  </Link>
                  {job ? (
                    <Link className="btn-secondary" to={`/jobs/${job._id}`}>
                      View job
                    </Link>
                  ) : null}
                  {!["Selected", "Withdrawn"].includes(application.status) ? (
                    <button className="btn-danger" onClick={() => setSelected(application)} type="button">
                      Withdraw
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          <Pagination onPageChange={setPage} page={page} totalPages={data.pagination.totalPages} />
        </div>
      )}
    </div>
  );
}
