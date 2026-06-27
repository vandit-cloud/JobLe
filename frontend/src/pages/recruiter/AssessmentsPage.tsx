import { ClipboardCheck, Flag, ListChecks, Send, TimerReset, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteAssessment, duplicateAssessment, fetchAssessments, publishAssessment, updateAssessmentStatus } from "../../api/recruiter";
import { AssessmentCard } from "../../components/recruiter/AssessmentCard";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { FilterPanel } from "../../components/common/FilterPanel";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/common/Pagination";
import { SearchInput } from "../../components/common/SearchInput";
import { StatisticCard } from "../../components/common/StatisticCard";
import type { Assessment } from "../../types";
import { useToast } from "../../context/ToastContext";

export function AssessmentsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    category: "",
    sort: "newest",
    page: 1,
  });
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetchAssessments(filters);
      setAssessments(response.items);
      setSummary(response.summary);
      setPagination({ page: response.pagination.page, totalPages: response.pagination.totalPages });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filters]);

  const statusMap = useMemo(
    () => Object.fromEntries((summary?.statuses || []).map((item: { _id: string; count: number }) => [item._id, item.count])),
    [summary],
  );

  return (
    <div className="space-y-6">
      <ConfirmationDialog
        open={!!pendingDelete}
        title="Archive this assessment?"
        description="This keeps historical results available while removing the assessment from active workflows."
        confirmLabel="Archive"
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const message = await deleteAssessment(pendingDelete);
          showToast(message, "success");
          setPendingDelete(null);
          load();
        }}
      />

      <PageHeader
        eyebrow="Assessments"
        title="Assessment dashboard"
        description="Create, manage, publish, and review organization-owned candidate assessments with real invitations and results."
        action={
          <Link className="btn-primary" to="/recruiter/assessments/create">
            Create assessment
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatisticCard title="Total assessments" value={assessments.length} icon={ClipboardCheck} />
        <StatisticCard title="Active assessments" value={statusMap.Published || 0} icon={Trophy} accent="from-emerald-200/40 to-white" />
        <StatisticCard title="Draft assessments" value={statusMap.Draft || 0} icon={ListChecks} accent="from-slate-200/40 to-white" />
        <StatisticCard title="Invitations sent" value={summary?.totalInvitations || 0} icon={Send} accent="from-sky-200/40 to-white" />
        <StatisticCard title="Integrity flags" value={summary?.candidatesWithIntegrityFlags || 0} icon={Flag} accent="from-rose-200/40 to-white" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatisticCard title="Tests started" value={summary?.testsStarted || 0} icon={TimerReset} accent="from-violet-200/40 to-white" />
        <StatisticCard title="Tests completed" value={summary?.testsCompleted || 0} icon={Trophy} accent="from-amber-200/40 to-white" />
        <StatisticCard title="Awaiting review" value={summary?.candidatesAwaitingReview || 0} icon={ListChecks} accent="from-indigo-200/40 to-white" />
      </div>

      <FilterPanel>
        <div>
          <label className="label">Search</label>
          <SearchInput value={filters.search} onChange={(value) => setFilters((current) => ({ ...current, search: value, page: 1 }))} placeholder="Search by title, job, or skill" />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}>
            <option value="">All statuses</option>
            {["Draft", "Published", "Paused", "Archived"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value, page: 1 }))}>
            <option value="">All categories</option>
            {["Technical", "Aptitude", "General screening", "Role-specific", "Coding", "Mixed assessment"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sort</label>
          <select className="input" value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value, page: 1 }))}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="mostAttempts">Most attempts</option>
            <option value="highestCompletionRate">Highest completion rate</option>
          </select>
        </div>
      </FilterPanel>

      {loading ? (
        <LoadingSkeleton className="h-80" />
      ) : assessments.length === 0 ? (
        <EmptyState title="No assessments found" description="Create your first assessment or broaden your dashboard filters." action={<Link className="btn-primary" to="/recruiter/assessments/create">Create assessment</Link>} />
      ) : (
        <>
          <div className="grid gap-4">
            {assessments.map((assessment) => (
              <AssessmentCard
                key={assessment._id}
                assessment={assessment}
                actions={
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => navigate(`/recruiter/assessments/${assessment._id}/edit`)} type="button">
                      Edit
                    </button>
                    <button className="btn-secondary" onClick={() => navigate(`/recruiter/assessments/${assessment._id}/preview`)} type="button">
                      Preview
                    </button>
                    <button className="btn-secondary" onClick={() => navigate(`/recruiter/assessments/${assessment._id}/invitations`)} type="button">
                      Invitations
                    </button>
                    <button className="btn-secondary" onClick={() => navigate(`/recruiter/assessments/${assessment._id}/results`)} type="button">
                      Results
                    </button>
                    {assessment.status === "Draft" ? (
                      <button className="btn-secondary" onClick={async () => {
                        await publishAssessment(assessment._id);
                        showToast("Assessment published.", "success");
                        load();
                      }} type="button">
                        Publish
                      </button>
                    ) : null}
                    {assessment.status === "Published" ? (
                      <button className="btn-secondary" onClick={async () => {
                        await updateAssessmentStatus(assessment._id, "Paused");
                        showToast("Assessment paused.", "success");
                        load();
                      }} type="button">
                        Pause
                      </button>
                    ) : null}
                    <button className="btn-secondary" onClick={async () => {
                      await duplicateAssessment(assessment._id);
                      showToast("Assessment duplicated as a draft.", "success");
                      load();
                    }} type="button">
                      Duplicate
                    </button>
                    <button className="btn-danger" onClick={() => setPendingDelete(assessment._id)} type="button">
                      Archive
                    </button>
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

