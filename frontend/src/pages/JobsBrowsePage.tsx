import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchPublicJobs, fetchSavedJobs, removeCandidateSavedJob, saveCandidateJob } from "../api/recruiter";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { PageHeader } from "../components/common/PageHeader";
import { Pagination } from "../components/common/Pagination";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate } from "../lib/utils";
import type { Job, PaginatedResponse, SavedJobRecord } from "../types";

export function JobsBrowsePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaginatedResponse<Job> | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJobRecord[]>([]);
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || "1");
  const employmentType = searchParams.get("employmentType") || "";
  const workplaceType = searchParams.get("workplaceType") || "";
  const sort = searchParams.get("sort") || "newest";

  function loadJobs() {
    setLoading(true);
    Promise.all([
      fetchPublicJobs({
        page,
        search: search || undefined,
        employmentType: employmentType || undefined,
        workplaceType: workplaceType || undefined,
        sort,
        verifiedOnly: "true",
      }),
      user?.role === "candidate" ? fetchSavedJobs() : Promise.resolve([]),
    ])
      .then(([jobs, saved]) => {
        setData(jobs);
        setSavedJobs(saved as SavedJobRecord[]);
      })
      .catch(() => showToast("Unable to load public jobs right now.", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadJobs();
  }, [page, search, employmentType, workplaceType, sort, user?.role]);

  async function handleToggleSave(jobId: string, isSaved: boolean) {
    try {
      if (isSaved) {
        await removeCandidateSavedJob(jobId);
        showToast("Job removed from saved list.", "success");
      } else {
        await saveCandidateJob(jobId);
        showToast("Job saved successfully.", "success");
      }
      loadJobs();
    } catch {
      showToast("We couldn't update your saved jobs.", "error");
    }
  }

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== "page") {
      next.set("page", "1");
    }
    setSearchParams(next);
  }

  const savedJobIds = new Set(savedJobs.map((item) => item.job._id));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Public jobs"
        title="Browse open roles"
        description="Search verified public openings, compare job details, and save roles for later if you're signed in as a candidate."
      />

      <div className="glass-panel grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <label className="label" htmlFor="job-search">
            Search
          </label>
          <input className="input" defaultValue={search} id="job-search" onBlur={(event) => updateParam("search", event.target.value)} placeholder="Job title, company, skill, keyword" />
        </div>
        <div>
          <label className="label" htmlFor="employmentType">
            Employment type
          </label>
          <select className="input" id="employmentType" onChange={(event) => updateParam("employmentType", event.target.value)} value={employmentType}>
            <option value="">All</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Internship">Internship</option>
            <option value="Contract">Contract</option>
            <option value="Temporary">Temporary</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="workplaceType">
            Workplace type
          </label>
          <select className="input" id="workplaceType" onChange={(event) => updateParam("workplaceType", event.target.value)} value={workplaceType}>
            <option value="">All</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-600">{data?.pagination.total || 0} jobs found</p>
        <select className="input max-w-[220px]" onChange={(event) => updateParam("sort", event.target.value)} value={sort}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highestSalary">Highest salary</option>
          <option value="applicationDeadline">Application deadline</option>
        </select>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-96" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No jobs found" description="Try broadening your search or changing filters." />
      ) : (
        <div className="space-y-4">
          {data.items.map((job) => {
            const isSaved = savedJobIds.has(job._id);
            return (
              <div key={job._id} className="glass-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-ink">{job.title}</h2>
                      {job.company?.verificationStatus === "Verified" ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Verified company</span>
                      ) : null}
                      {job.hasAssessment ? <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Assessment required</span> : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {job.company?.name} • {job.location} • {job.workplaceType} • {job.employmentType}
                    </p>
                  </div>
                  {user?.role === "candidate" ? (
                    <button className="btn-secondary" onClick={() => handleToggleSave(job._id, isSaved)} type="button">
                      {isSaved ? "Remove saved" : "Save job"}
                    </button>
                  ) : null}
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{job.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.requiredSkills.slice(0, 6).map((skill) => (
                    <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Salary</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {job.salary.showPublicly
                        ? `${formatCurrency(job.salary.minimum, job.salary.currency)} - ${formatCurrency(job.salary.maximum, job.salary.currency)}`
                        : "Hidden publicly"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Experience</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {job.minimumExperience} - {job.maximumExperience} years
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Deadline</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{formatDate(job.applicationDeadline)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Match</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{user?.role === "candidate" ? "Open job to see match" : "Login to view match"}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link className="btn-primary" to={`/jobs/${job._id}`}>
                    View details
                  </Link>
                  <Link className="btn-secondary" to={`/companies/${job.company?._id}`}>
                    View company
                  </Link>
                </div>
              </div>
            );
          })}
          <Pagination onPageChange={(nextPage) => updateParam("page", String(nextPage))} page={page} totalPages={data.pagination.totalPages} />
        </div>
      )}
    </div>
  );
}
