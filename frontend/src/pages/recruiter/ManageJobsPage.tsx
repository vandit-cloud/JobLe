import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteJob, duplicateJob, fetchJobs, updateJobStatus } from "../../api/recruiter";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { FilterPanel } from "../../components/common/FilterPanel";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/common/Pagination";
import { SearchInput } from "../../components/common/SearchInput";
import { StatisticCard } from "../../components/common/StatisticCard";
import { JobCard } from "../../components/recruiter/JobCard";
import { JobTable } from "../../components/recruiter/JobTable";
import type { Job } from "../../types";
import { BriefcaseBusiness, CirclePause, FileStack, Lock, PenSquare } from "lucide-react";
import { useToast } from "../../context/ToastContext";

export function ManageJobsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [stats, setStats] = useState<Array<{ _id: string; count: number }>>([]);
  const [query, setQuery] = useState({
    search: "",
    status: "",
    employmentType: "",
    workplaceType: "",
    sort: "newest",
    page: 1,
  });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchJobs(query)
      .then((response) => {
        setJobs(response.items);
        setPagination({ page: response.pagination.page, totalPages: response.pagination.totalPages });
        setStats(response.stats);
      })
      .finally(() => setLoading(false));
  }, [query]);

  const statMap = useMemo(() => Object.fromEntries(stats.map((item) => [item._id, item.count])), [stats]);

  async function refresh() {
    const response = await fetchJobs(query);
    setJobs(response.items);
    setPagination({ page: response.pagination.page, totalPages: response.pagination.totalPages });
    setStats(response.stats);
  }

  async function handleStatus(jobId: string, status: string) {
    await updateJobStatus(jobId, status);
    showToast(`Job status changed to ${status}.`, "success");
    refresh();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const message = await deleteJob(confirmDelete);
    showToast(message, "success");
    setConfirmDelete(null);
    refresh();
  }

  async function handleDuplicate(jobId: string) {
    await duplicateJob(jobId);
    showToast("Job duplicated as a draft.", "success");
    refresh();
  }

  return (
    <div className="space-y-6">
      <ConfirmationDialog
        open={!!confirmDelete}
        title="Delete or archive this job?"
        description="Jobs with existing applications will be archived instead of permanently deleted."
        confirmLabel="Continue"
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />

      <PageHeader
        eyebrow="Jobs"
        title="Manage jobs"
        description="Search, filter, sort, and act on all of your recruiter-owned jobs from a single management view."
        action={
          <Link className="btn-primary" to="/recruiter/jobs/create">
            Create job
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatisticCard title="All jobs" value={jobs.length} icon={BriefcaseBusiness} caption="Current page result count" />
        <StatisticCard title="Active jobs" value={statMap.Published || 0} icon={PenSquare} accent="from-emerald-200/40 to-white" />
        <StatisticCard title="Draft jobs" value={statMap.Draft || 0} icon={FileStack} accent="from-slate-200/40 to-white" />
        <StatisticCard title="Paused jobs" value={statMap.Paused || 0} icon={CirclePause} accent="from-amber-200/40 to-white" />
        <StatisticCard title="Closed jobs" value={statMap.Closed || 0} icon={Lock} accent="from-rose-200/40 to-white" />
      </div>

      <FilterPanel
        actions={
          <button className="btn-secondary" onClick={() => setQuery({ search: "", status: "", employmentType: "", workplaceType: "", sort: "newest", page: 1 })} type="button">
            Reset
          </button>
        }
      >
        <div>
          <label className="label">Search</label>
          <SearchInput value={query.search} onChange={(value) => setQuery((current) => ({ ...current, search: value, page: 1 }))} placeholder="Search by title, department, or location" />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={query.status} onChange={(event) => setQuery((current) => ({ ...current, status: event.target.value, page: 1 }))}>
            <option value="">All statuses</option>
            {["Draft", "Published", "Paused", "Closed", "Expired"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Employment type</label>
          <select className="input" value={query.employmentType} onChange={(event) => setQuery((current) => ({ ...current, employmentType: event.target.value, page: 1 }))}>
            <option value="">All types</option>
            {["Full-time", "Part-time", "Internship", "Contract", "Temporary"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sort by</label>
          <select className="input" value={query.sort} onChange={(event) => setQuery((current) => ({ ...current, sort: event.target.value, page: 1 }))}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="mostApplicants">Most applicants</option>
            <option value="deadline">Application deadline</option>
          </select>
        </div>
      </FilterPanel>

      {loading ? (
        <LoadingSkeleton className="h-72" />
      ) : jobs.length === 0 ? (
        <EmptyState title="No jobs found" description="Try broadening your filters or create a new job posting." action={<Link className="btn-primary" to="/recruiter/jobs/create">Create job</Link>} />
      ) : (
        <>
          <div className="hidden lg:block">
            <JobTable
              jobs={jobs}
              actions={(job) => (
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary" onClick={() => navigate(`/recruiter/jobs/${job._id}/edit`)} type="button">
                    Edit
                  </button>
                  <button className="btn-secondary" onClick={() => navigate(`/recruiter/applicants?jobId=${job._id}`)} type="button">
                    Applicants
                  </button>
                  {job.status === "Draft" ? <button className="btn-secondary" onClick={() => handleStatus(job._id, "Published")} type="button">Publish</button> : null}
                  {job.status === "Published" ? <button className="btn-secondary" onClick={() => handleStatus(job._id, "Paused")} type="button">Pause</button> : null}
                  {job.status === "Paused" || job.status === "Closed" || job.status === "Expired" ? <button className="btn-secondary" onClick={() => handleStatus(job._id, "Published")} type="button">Reopen</button> : null}
                  {(job.status === "Published" || job.status === "Paused") ? <button className="btn-secondary" onClick={() => handleStatus(job._id, "Closed")} type="button">Close</button> : null}
                  <button className="btn-secondary" onClick={() => handleDuplicate(job._id)} type="button">
                    Duplicate
                  </button>
                  <button className="btn-danger" onClick={() => setConfirmDelete(job._id)} type="button">
                    Delete
                  </button>
                </div>
              )}
            />
          </div>
          <div className="grid gap-4 lg:hidden">
            {jobs.map((job) => (
              <JobCard
                key={job._id}
                job={job}
                actions={
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => navigate(`/recruiter/jobs/${job._id}/edit`)} type="button">
                      Edit
                    </button>
                    <button className="btn-secondary" onClick={() => handleDuplicate(job._id)} type="button">
                      Duplicate
                    </button>
                    <button className="btn-danger" onClick={() => setConfirmDelete(job._id)} type="button">
                      Delete
                    </button>
                  </div>
                }
              />
            ))}
          </div>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setQuery((current) => ({ ...current, page }))} />
        </>
      )}
    </div>
  );
}

