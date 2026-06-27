import { Ban, CalendarClock, CheckCircle2, Download, Landmark } from "lucide-react";
import { useEffect, useState } from "react";
import {
  confirmCandidateInterview,
  downloadCandidateInterviewCalendarInvite,
  fetchCandidateInterviews,
  requestCandidateInterviewReschedule,
} from "../../api/recruiter";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/common/Pagination";
import { StatisticCard } from "../../components/common/StatisticCard";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/utils";
import type { CandidateInterviewsResponse, Interview, Job } from "../../types";

function getInterviewJob(interview: Interview) {
  if (interview.job) return interview.job;
  return typeof interview.jobId === "string" ? null : interview.jobId;
}

export function CandidateInterviewsPage() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("all");
  const [data, setData] = useState<CandidateInterviewsResponse | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [preferredDates, setPreferredDates] = useState("");
  const [preferredRanges, setPreferredRanges] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");
  const { showToast } = useToast();

  function loadInterviews(nextPage = page, nextTab = tab) {
    setLoading(true);
    fetchCandidateInterviews({ page: nextPage, tab: nextTab })
      .then(setData)
      .catch(() => showToast("Unable to load interviews right now.", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadInterviews(page, tab);
  }, [page, tab]);

  async function handleConfirm(interviewId: string) {
    try {
      await confirmCandidateInterview(interviewId);
      showToast("Interview attendance confirmed.", "success");
      loadInterviews(page, tab);
    } catch {
      showToast("We couldn't confirm this interview.", "error");
    }
  }

  async function handleRescheduleRequest() {
    if (!selectedInterview) return;
    try {
      await requestCandidateInterviewReschedule(selectedInterview._id, {
        reason: rescheduleReason,
        preferredDates: preferredDates.split(",").map((item) => item.trim()).filter(Boolean),
        preferredTimeRanges: preferredRanges.split(",").map((item) => item.trim()).filter(Boolean),
        additionalNote,
      });
      setSelectedInterview(null);
      setRescheduleReason("");
      setPreferredDates("");
      setPreferredRanges("");
      setAdditionalNote("");
      showToast("Reschedule request sent to the recruiter.", "success");
      loadInterviews(page, tab);
    } catch {
      showToast("We couldn't send the reschedule request.", "error");
    }
  }

  async function handleDownloadCalendar(interviewId: string) {
    try {
      const blob = await downloadCandidateInterviewCalendarInvite(interviewId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `interview-${interviewId}.ics`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast("Calendar file downloaded.", "success");
    } catch {
      showToast("We couldn't generate the calendar file.", "error");
    }
  }

  return (
    <div className="space-y-6">
      <ConfirmationDialog
        cancelLabel="Cancel"
        confirmLabel="Send request"
        description="The recruiter will review your requested dates and time ranges before changing the interview schedule."
        onClose={() => {
          setSelectedInterview(null);
          setRescheduleReason("");
          setPreferredDates("");
          setPreferredRanges("");
          setAdditionalNote("");
        }}
        onConfirm={handleRescheduleRequest}
        open={Boolean(selectedInterview && rescheduleReason.trim())}
        title="Request interview reschedule?"
      />

      <PageHeader
        eyebrow="Interviews"
        title="My interviews"
        description="Track upcoming interview slots, join links, confirmations, and recruiter-reviewed reschedule requests."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatisticCard title="Upcoming" value={data?.summary.upcoming || 0} icon={CalendarClock} />
        <StatisticCard title="Completed" value={data?.summary.completed || 0} icon={CheckCircle2} accent="from-emerald-200/30 to-white" />
        <StatisticCard title="Cancelled" value={data?.summary.cancelled || 0} icon={Ban} accent="from-rose-200/25 to-white" />
        <StatisticCard title="Total" value={data?.summary.total || 0} icon={Landmark} accent="from-sky-200/35 to-white" />
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          ["all", "All"],
          ["upcoming", "Upcoming"],
          ["completed", "Completed"],
          ["cancelled", "Cancelled"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? "btn-primary" : "btn-secondary"}
            onClick={() => {
              setPage(1);
              setTab(value);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton className="h-96" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No interviews found" description="Interview activity will appear here once recruiters schedule a meeting with you." />
      ) : (
        <div className="space-y-4">
          {data.items.map((interview) => {
            const job = getInterviewJob(interview) as Job | null;
            const allowJoin = Boolean(interview.meetingLink) && interview.status !== "Cancelled";
            return (
              <div key={interview._id} className="glass-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-ink">{interview.title}</h2>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{interview.status}</span>
                      {interview.candidateStatus ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{interview.candidateStatus}</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {job?.company?.name || interview.interviewerName} • {job?.title || interview.interviewType} • {interview.round || "Round 1"}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">When</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{formatDateTime(interview.startDateTime)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Timezone</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{interview.timezone}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Type</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{interview.interviewType}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Duration</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{interview.duration} minutes</p>
                  </div>
                </div>
                {interview.candidateInstructions ? (
                  <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Candidate instructions</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{interview.candidateInstructions}</p>
                  </div>
                ) : null}
                {selectedInterview?._id === interview._id ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="label" htmlFor={`reason-${interview._id}`}>
                        Reason
                      </label>
                      <textarea className="input min-h-24" id={`reason-${interview._id}`} onChange={(event) => setRescheduleReason(event.target.value)} value={rescheduleReason} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`dates-${interview._id}`}>
                        Preferred dates
                      </label>
                      <input className="input" id={`dates-${interview._id}`} onChange={(event) => setPreferredDates(event.target.value)} placeholder="YYYY-MM-DD, YYYY-MM-DD" value={preferredDates} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`ranges-${interview._id}`}>
                        Preferred time ranges
                      </label>
                      <input className="input" id={`ranges-${interview._id}`} onChange={(event) => setPreferredRanges(event.target.value)} placeholder="10am-12pm, 3pm-5pm" value={preferredRanges} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label" htmlFor={`note-${interview._id}`}>
                        Additional note
                      </label>
                      <textarea className="input min-h-24" id={`note-${interview._id}`} onChange={(event) => setAdditionalNote(event.target.value)} value={additionalNote} />
                    </div>
                  </div>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-3">
                  {allowJoin ? (
                    <a className="btn-primary" href={interview.meetingLink} rel="noreferrer" target="_blank">
                      Join interview
                    </a>
                  ) : null}
                  {interview.candidateStatus !== "Confirmed" && interview.status !== "Cancelled" ? (
                    <button className="btn-secondary" onClick={() => handleConfirm(interview._id)} type="button">
                      Confirm attendance
                    </button>
                  ) : null}
                  {interview.status !== "Cancelled" && interview.status !== "Completed" ? (
                    <button
                      className="btn-secondary"
                      onClick={() => setSelectedInterview((current) => (current?._id === interview._id ? null : interview))}
                      type="button"
                    >
                      Request reschedule
                    </button>
                  ) : null}
                  <button className="btn-secondary" onClick={() => handleDownloadCalendar(interview._id)} type="button">
                    <Download className="h-4 w-4" />
                    Add to calendar
                  </button>
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
