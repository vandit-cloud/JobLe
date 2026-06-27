import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BriefcaseBusiness, CalendarDays, FileUser, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchDashboard } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { StatisticCard } from "../../components/common/StatisticCard";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = ["#0f766e", "#f97316", "#ef4444", "#0ea5e9", "#8b5cf6"];

export function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSkeleton className="h-80" />;
  }

  if (!data) {
    return <EmptyState title="Dashboard unavailable" description="We couldn't load recruiter dashboard metrics right now." />;
  }

  const totalApplicants = data.applicationSummary.reduce((sum: number, item: { count: number }) => sum + item.count, 0);
  const interviewsTotal = data.interviews.reduce((sum: number, item: { count: number }) => sum + item.count, 0);
  const shortlisted = data.applicationSummary.find((item: { _id: string }) => item._id === "Shortlisted")?.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Recruiter dashboard"
        description="Track hiring momentum across jobs, applications, shortlist movement, and interview scheduling from one place."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatisticCard title="Open and total jobs" value={`${data.jobs.activeJobs}/${data.jobs.totalJobs}`} caption="Published roles vs all roles" icon={BriefcaseBusiness} />
        <StatisticCard title="Applicants" value={totalApplicants} caption="Across your jobs" icon={FileUser} accent="from-tide/15 to-white" />
        <StatisticCard title="Shortlisted" value={shortlisted} caption="Ready for deeper review" icon={Target} accent="from-violet-200/35 to-white" />
        <StatisticCard title="Interviews" value={interviewsTotal} caption="Scheduled, completed, and cancelled" icon={CalendarDays} accent="from-sky-200/35 to-white" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Pipeline</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">Applicant trend</h2>
            </div>
          </div>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.jobsByMonth.map((item: { _id: number; applicants: number }) => ({ month: MONTHS[item._id - 1], applicants: item.applicants }))}>
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="applicants" fill="#0f766e" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Status mix</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Job distribution</h2>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.statusBreakdown} dataKey="value" nameKey="_id" innerRadius={58} outerRadius={92}>
                  {data.statusBreakdown.map((_: unknown, index: number) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {data.statusBreakdown.map((item: { _id: string; value: number }, index: number) => (
              <div key={item._id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm font-medium text-slate-700">{item._id}</span>
                </div>
                <span className="text-sm font-bold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

