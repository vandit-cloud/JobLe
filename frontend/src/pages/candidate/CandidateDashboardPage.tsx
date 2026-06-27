import {
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardList,
  FileSearch,
  ShieldCheck,
  Sparkles,
  Star,
  UserRoundCog,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCandidateDashboard, removeCandidateSavedJob, saveCandidateJob } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { MatchScoreBadge } from "../../components/common/MatchScoreBadge";
import { PageHeader } from "../../components/common/PageHeader";
import { StatisticCard } from "../../components/common/StatisticCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatDateTime, formatCurrency } from "../../lib/utils";
import type { CandidateDashboardResponse, Job } from "../../types";

function getJobFromUnknown(record: { job?: Job | null; jobId?: Job | string | null }) {
  if (record.job) {
    return record.job;
  }
  if (record.jobId && typeof record.jobId !== "string") {
    return record.jobId;
  }
  return null;
}

export function CandidateDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CandidateDashboardResponse | null>(null);
  const { showToast } = useToast();

  function loadDashboard() {
    setLoading(true);
    fetchCandidateDashboard()
      .then(setData)
      .catch(() => showToast("Unable to load the candidate dashboard right now.", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleToggleSave(jobId: string, isSaved: boolean) {
    try {
      if (isSaved) {
        await removeCandidateSavedJob(jobId);
        showToast("Job removed from saved list.", "success");
      } else {
        await saveCandidateJob(jobId);
        showToast("Job saved successfully.", "success");
      }
      loadDashboard();
    } catch {
      showToast("We couldn't update your saved jobs.", "error");
    }
  }

  if (loading) {
    return <LoadingSkeleton className="h-96" />;
  }

  if (!data) {
    return <EmptyState title="Dashboard unavailable" description="We couldn't load your dashboard right now. Please try again in a moment." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Candidate dashboard"
        description="Keep your profile, applications, interviews, assessments, and recommendations moving from one connected workspace."
        action={
          <Link className="btn-primary" to="/candidate/profile">
            Complete profile
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatisticCard title="Profile completion" value={`${data.statistics.profileCompletion}%`} icon={UserRoundCog} />
        <StatisticCard title="Resume score" value={`${data.statistics.resumeScore}%`} icon={Sparkles} accent="from-emerald-200/30 to-white" />
        <StatisticCard title="Applications" value={data.statistics.totalApplications} icon={ClipboardList} accent="from-sky-200/35 to-white" />
        <StatisticCard title="Assessments pending" value={data.statistics.pendingAssessments} icon={FileSearch} accent="from-amber-200/30 to-white" />
        <StatisticCard title="Unread notifications" value={data.statistics.unreadNotifications} icon={Bell} accent="from-rose-200/25 to-white" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Profile readiness</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">What still needs attention</h2>
            </div>
            <div className="rounded-3xl bg-emerald-50 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Completion</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-800">{data.statistics.profileCompletion}%</p>
            </div>
          </div>

          {data.profileMissingFields.length === 0 ? (
            <div className="mt-6 rounded-3xl bg-emerald-50 p-5 text-sm text-emerald-800">
              Your profile looks complete and recruiter-ready.
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap gap-2">
              {data.profileMissingFields.map((field) => (
                <span key={field} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  {field}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Shortlisted</p>
              <p className="mt-2 text-2xl font-bold text-slate-800">{data.statistics.shortlisted}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Upcoming interviews</p>
              <p className="mt-2 text-2xl font-bold text-slate-800">{data.statistics.upcomingInterviews}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Recommended</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">Jobs matched to your profile</h2>
            </div>
            <Link className="btn-secondary" to="/jobs">
              Browse all jobs
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {data.recommendedJobs.length === 0 ? (
              <EmptyState
                description="We don't have enough recommendation signals yet. Complete your profile and check back soon."
                title="No recommendations yet"
              />
            ) : (
              data.recommendedJobs.map((job) => (
                <div key={job._id} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-ink">{job.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {job.company?.name} • {job.location} • {job.workplaceType}
                      </p>
                    </div>
                    <MatchScoreBadge score={job.match?.overallScore} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {job.requiredSkills.slice(0, 5).map((skill) => (
                      <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                    <span>
                      {job.salary.showPublicly
                        ? `${formatCurrency(job.salary.minimum, job.salary.currency)} - ${formatCurrency(job.salary.maximum, job.salary.currency)}`
                        : "Salary hidden"}
                    </span>
                    <span>Deadline {formatDate(job.applicationDeadline)}</span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button className="btn-secondary" onClick={() => handleToggleSave(job._id, job.isSaved)} type="button">
                      {job.isSaved ? "Remove saved" : "Save job"}
                    </button>
                    <Link className="btn-primary" to={`/jobs/${job._id}`}>
                      View job
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink">Pending assessments</h2>
            <Link className="text-sm font-semibold text-tide" to="/candidate/assessments">
              View all
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {data.pendingAssessments.length === 0 ? (
              <p className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">No pending assessments right now.</p>
            ) : (
              data.pendingAssessments.map((invitation) => (
                <div key={invitation._id} className="rounded-3xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">{invitation.assessment?.title || "Assessment"}</h3>
                      <p className="mt-1 text-sm text-slate-600">{invitation.job?.title || "Related role"}</p>
                    </div>
                    <StatusBadge status={invitation.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {invitation.assessment?.sections?.length || 0} sections • {invitation.assessment?.totalDuration || 0} minutes
                  </p>
                  <div className="mt-4">
                    <Link className="btn-secondary" to={`/assessment/${invitation.invitationToken}`}>
                      {invitation.status === "Started" ? "Continue" : "Start"}
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink">Recent application updates</h2>
            <Link className="text-sm font-semibold text-tide" to="/candidate/applications">
              View all
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {data.recentApplicationUpdates.length === 0 ? (
              <p className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">Applications will appear here after you apply to jobs.</p>
            ) : (
              data.recentApplicationUpdates.map((application) => {
                const job = getJobFromUnknown(application);
                return (
                  <div key={application._id} className="rounded-3xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-800">{job?.title || "Application"}</h3>
                        <p className="mt-1 text-sm text-slate-600">{job?.company?.name || "Company"}</p>
                      </div>
                      <StatusBadge status={application.status} />
                    </div>
                    <p className="mt-3 text-sm text-slate-500">Updated {formatDate(application.updatedAt || application.appliedAt)}</p>
                    <Link className="mt-4 inline-flex text-sm font-semibold text-tide" to={`/candidate/applications/${application._id}`}>
                      View application
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink">Upcoming interviews</h2>
            <Link className="text-sm font-semibold text-tide" to="/candidate/interviews">
              View all
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {data.upcomingInterviews.length === 0 ? (
              <p className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">No interviews are scheduled yet.</p>
            ) : (
              data.upcomingInterviews.map((interview) => {
                const job = getJobFromUnknown(interview);
                return (
                  <div key={interview._id} className="rounded-3xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-800">{job?.title || interview.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{job?.company?.name || interview.interviewerName}</p>
                      </div>
                      <CalendarClock className="h-5 w-5 text-tide" />
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{formatDateTime(interview.startDateTime)}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {interview.interviewType} • {interview.timezone}
                    </p>
                    {interview.meetingLink ? (
                      <a className="mt-4 inline-flex text-sm font-semibold text-tide" href={interview.meetingLink} rel="noreferrer" target="_blank">
                        Join meeting
                      </a>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Inbox</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Latest notifications</h2>
          </div>
          <Link className="btn-secondary" to="/candidate/notifications">
            Open notifications
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {data.recentNotifications.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-5">
              <EmptyState title="No notifications yet" description="Application and interview updates will appear here as they happen." icon={ShieldCheck} />
            </div>
          ) : (
            data.recentNotifications.map((notification) => (
              <div key={notification._id} className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{notification.category}</span>
                  {!notification.read ? <Star className="h-4 w-4 text-amber-500" /> : null}
                </div>
                <h3 className="mt-4 font-semibold text-slate-800">{notification.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</p>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>{formatDateTime(notification.createdAt)}</span>
                  {notification.actionUrl ? (
                    <Link className="font-semibold text-tide" to={notification.actionUrl}>
                      Open
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
