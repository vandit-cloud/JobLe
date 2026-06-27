import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { analyzeApplication, fetchApplications, updateApplicationStatus } from "../../api/recruiter";
import { ApplicantCard } from "../../components/recruiter/ApplicantCard";
import { ApplicantTable } from "../../components/recruiter/ApplicantTable";
import { CandidateProfileDrawer } from "../../components/recruiter/CandidateProfileDrawer";
import { EmptyState } from "../../components/common/EmptyState";
import { FilterPanel } from "../../components/common/FilterPanel";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/common/Pagination";
import { SearchInput } from "../../components/common/SearchInput";
import { StatisticCard } from "../../components/common/StatisticCard";
import type { ApplicationRecord } from "../../types";
import { CircleGauge, FileUser, ListFilter, SearchCheck, UserRoundCheck } from "lucide-react";
import { useToast } from "../../context/ToastContext";

export function ApplicantsPage() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [summary, setSummary] = useState<Array<{ _id: string; count: number }>>([]);
  const [jobs, setJobs] = useState<Array<{ _id: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApplicationRecord | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({
    search: "",
    jobId: searchParams.get("jobId") || "",
    status: "",
    minScore: "",
    location: "",
    page: 1,
  });

  useEffect(() => {
    setLoading(true);
    fetchApplications(filters)
      .then((response) => {
        setApplications(response.items);
        setSummary(response.summary);
        setJobs(response.jobs);
        setPagination({ page: response.pagination.page, totalPages: response.pagination.totalPages });
      })
      .finally(() => setLoading(false));
  }, [filters]);

  const summaryMap = useMemo(() => Object.fromEntries(summary.map((item) => [item._id, item.count])), [summary]);

  async function refresh() {
    const response = await fetchApplications(filters);
    setApplications(response.items);
    setSummary(response.summary);
    setJobs(response.jobs);
    setPagination({ page: response.pagination.page, totalPages: response.pagination.totalPages });
  }

  return (
    <div className="space-y-6">
      <CandidateProfileDrawer open={!!selected} application={selected} onClose={() => setSelected(null)} />

      <PageHeader
        eyebrow="Applicants"
        title="Applicant pipeline"
        description="Review all job applications, inspect AI recommendations, and move candidates through recruiter-controlled stages."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatisticCard title="Total applicants" value={applications.length} icon={FileUser} caption="Current page result count" />
        <StatisticCard title="New applicants" value={summaryMap.Applied || 0} icon={SearchCheck} accent="from-sky-200/35 to-white" />
        <StatisticCard title="Under review" value={summaryMap["Under Review"] || 0} icon={ListFilter} accent="from-indigo-200/35 to-white" />
        <StatisticCard title="Shortlisted" value={summaryMap.Shortlisted || 0} icon={UserRoundCheck} accent="from-violet-200/35 to-white" />
        <StatisticCard title="Average match intent" value="AI-assisted" icon={CircleGauge} caption="Recommendations only" accent="from-amber-200/35 to-white" />
      </div>

      <FilterPanel>
        <div>
          <label className="label">Search</label>
          <SearchInput value={filters.search} onChange={(value) => setFilters((current) => ({ ...current, search: value, page: 1 }))} placeholder="Search by candidate or job" />
        </div>
        <div>
          <label className="label">Job</label>
          <select className="input" value={filters.jobId} onChange={(event) => setFilters((current) => ({ ...current, jobId: event.target.value, page: 1 }))}>
            <option value="">All jobs</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}>
            <option value="">All statuses</option>
            {["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Selected", "Rejected", "Withdrawn"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Minimum AI score</label>
          <input className="input" type="number" value={filters.minScore} onChange={(event) => setFilters((current) => ({ ...current, minScore: event.target.value, page: 1 }))} placeholder="e.g. 70" />
        </div>
      </FilterPanel>

      {loading ? (
        <LoadingSkeleton className="h-72" />
      ) : applications.length === 0 ? (
        <EmptyState title="No applicants match these filters" description="Try widening your search or changing the selected job and status filters." />
      ) : (
        <>
          <div className="hidden lg:block">
            <ApplicantTable
              applications={applications}
              actions={(application) => (
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary" onClick={() => setSelected(application)} type="button">
                    Quick view
                  </button>
                  <Link className="btn-secondary" to={`/recruiter/applicants/${application._id}`}>
                    Details
                  </Link>
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      await analyzeApplication(application._id);
                      showToast("AI analysis updated for this application.", "success");
                      refresh();
                    }}
                    type="button"
                  >
                    Analyze
                  </button>
                  <button className="btn-secondary" onClick={async () => {
                    await updateApplicationStatus(application._id, { status: "Under Review" });
                    showToast("Candidate moved to under review.", "success");
                    refresh();
                  }} type="button">Review</button>
                  <button className="btn-secondary" onClick={async () => {
                    await updateApplicationStatus(application._id, { status: "Shortlisted" });
                    showToast("Candidate shortlisted.", "success");
                    refresh();
                  }} type="button">Shortlist</button>
                  <button className="btn-danger" onClick={async () => {
                    await updateApplicationStatus(application._id, { status: "Rejected" });
                    showToast("Candidate rejected.", "success");
                    refresh();
                  }} type="button">Reject</button>
                </div>
              )}
            />
          </div>

          <div className="grid gap-4 lg:hidden">
            {applications.map((application) => (
              <ApplicantCard
                key={application._id}
                application={application}
                action={
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => setSelected(application)} type="button">
                      Quick view
                    </button>
                    <Link className="btn-secondary" to={`/recruiter/applicants/${application._id}`}>
                      Details
                    </Link>
                  </div>
                }
              />
            ))}
          </div>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />
        </>
      )}
    </div>
  );
}

