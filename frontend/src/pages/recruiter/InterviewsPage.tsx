import { useEffect, useMemo, useState } from "react";
import { cancelInterview, createInterview, fetchInterviews, fetchShortlisted, generateInterviewQuestions, submitInterviewFeedback, updateInterview } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { InterviewCalendar } from "../../components/recruiter/InterviewCalendar";
import { InterviewCard } from "../../components/recruiter/InterviewCard";
import type { ApplicationRecord, Candidate, Interview, Job } from "../../types";
import { useToast } from "../../context/ToastContext";

const tabs = ["upcoming", "completed", "cancelled", "all"] as const;

export function InterviewsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof tabs)[number]>("upcoming");
  const [view, setView] = useState<"calendar" | "list">("list");
  const [grouped, setGrouped] = useState<{ upcoming: Interview[]; completed: Interview[]; cancelled: Interview[]; all: Interview[] } | null>(null);
  const [shortlisted, setShortlisted] = useState<ApplicationRecord[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [form, setForm] = useState({
    applicationId: "",
    title: "",
    startDateTime: "",
    duration: 60,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    interviewType: "Technical",
    interviewerName: "",
    interviewerEmail: "",
    meetingLink: "",
    location: "",
    notes: "",
  });
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<{ question: string; evaluationPoints: string[] }>>([]);

  useEffect(() => {
    Promise.all([fetchInterviews(), fetchShortlisted()])
      .then(([interviewResponse, shortlistedResponse]) => {
        setGrouped(interviewResponse);
        setShortlisted(shortlistedResponse.items);
      })
      .finally(() => setLoading(false));
  }, []);

  async function refresh() {
    const interviewResponse = await fetchInterviews();
    setGrouped(interviewResponse);
  }

  const selectedApplication = useMemo(
    () => shortlisted.find((item) => item._id === form.applicationId),
    [form.applicationId, shortlisted],
  );

  const currentInterviews = grouped?.[tab] || [];

  if (loading) {
    return <LoadingSkeleton className="h-80" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Interviews"
        title="Interview management"
        description="Schedule, reschedule, cancel, complete, and document interviews while keeping candidate stage changes in sync."
        action={
          <button className="btn-primary" onClick={() => setScheduleOpen((current) => !current)} type="button">
            {scheduleOpen ? "Hide scheduler" : "Schedule interview"}
          </button>
        }
      />

      {scheduleOpen ? (
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">Schedule interview</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="label">Candidate application</label>
              <select className="input" value={form.applicationId} onChange={(event) => {
                const application = shortlisted.find((item) => item._id === event.target.value);
                const candidate = application?.candidateId as Candidate | undefined;
                const job = application?.jobId as Job | undefined;
                setForm((current) => ({
                  ...current,
                  applicationId: event.target.value,
                  title: job ? `${job.title} interview` : current.title,
                  interviewerName: current.interviewerName,
                  interviewerEmail: current.interviewerEmail,
                }));
              }}>
                <option value="">Select an application</option>
                {shortlisted.map((item) => {
                  const candidate = item.candidateId as Candidate;
                  const job = item.jobId as Job;
                  return (
                    <option key={item._id} value={item._id}>
                      {candidate.name} • {job.title}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="label">Interview title</label>
              <input className="input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div>
              <label className="label">Start time</label>
              <input className="input" type="datetime-local" value={form.startDateTime} onChange={(event) => setForm((current) => ({ ...current, startDateTime: event.target.value }))} />
            </div>
            <div>
              <label className="label">Duration (minutes)</label>
              <input className="input" type="number" value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: Number(event.target.value) }))} />
            </div>
            <div>
              <label className="label">Timezone</label>
              <input className="input" value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} />
            </div>
            <div>
              <label className="label">Interview type</label>
              <select className="input" value={form.interviewType} onChange={(event) => setForm((current) => ({ ...current, interviewType: event.target.value }))}>
                {["Phone", "Video", "In-person", "Technical", "HR", "Final round"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Interviewer name</label>
              <input className="input" value={form.interviewerName} onChange={(event) => setForm((current) => ({ ...current, interviewerName: event.target.value }))} />
            </div>
            <div>
              <label className="label">Interviewer email</label>
              <input className="input" value={form.interviewerEmail} onChange={(event) => setForm((current) => ({ ...current, interviewerEmail: event.target.value }))} />
            </div>
            <div>
              <label className="label">Meeting link</label>
              <input className="input" value={form.meetingLink} onChange={(event) => setForm((current) => ({ ...current, meetingLink: event.target.value }))} />
            </div>
            <div className="md:col-span-2 xl:col-span-3">
              <label className="label">Location / notes</label>
              <textarea className="input min-h-24" value={form.location || form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              className="btn-primary"
              onClick={async () => {
                if (!selectedApplication) return;
                const candidate = selectedApplication.candidateId as Candidate;
                const job = selectedApplication.jobId as Job;
                await createInterview({
                  applicationId: selectedApplication._id,
                  jobId: job._id,
                  candidateId: candidate._id,
                  title: form.title,
                  startDateTime: new Date(form.startDateTime).toISOString(),
                  duration: form.duration,
                  timezone: form.timezone,
                  interviewType: form.interviewType,
                  interviewerName: form.interviewerName,
                  interviewerEmail: form.interviewerEmail,
                  meetingLink: form.meetingLink,
                  location: form.location,
                  notes: form.notes,
                  sendNotification: true,
                });
                showToast("Interview scheduled successfully.", "success");
                setScheduleOpen(false);
                refresh();
              }}
              type="button"
            >
              Schedule interview
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tabName) => (
            <button
              key={tabName}
              className={tab === tabName ? "btn-primary" : "btn-secondary"}
              onClick={() => setTab(tabName)}
              type="button"
            >
              {tabName[0].toUpperCase() + tabName.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className={view === "list" ? "btn-primary" : "btn-secondary"} onClick={() => setView("list")} type="button">
            List view
          </button>
          <button className={view === "calendar" ? "btn-primary" : "btn-secondary"} onClick={() => setView("calendar")} type="button">
            Calendar view
          </button>
        </div>
      </div>

      {currentInterviews.length === 0 ? (
        <EmptyState title="No interviews in this view" description="Schedule an interview or switch tabs to review other interview states." />
      ) : view === "calendar" ? (
        <InterviewCalendar interviews={currentInterviews} />
      ) : (
        <div className="grid gap-4">
          {currentInterviews.map((interview) => (
            <InterviewCard
              key={interview._id}
              interview={interview}
              actions={
                <div className="flex flex-wrap gap-2">
                  {interview.meetingLink ? (
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(interview.meetingLink || "");
                        showToast("Meeting link copied.", "success");
                      }}
                      type="button"
                    >
                      Copy link
                    </button>
                  ) : null}
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      await updateInterview(interview._id, { startDateTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), status: "Rescheduled" });
                      showToast("Interview rescheduled by one day.", "success");
                      refresh();
                    }}
                    type="button"
                  >
                    Reschedule
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      await submitInterviewFeedback(interview._id, {
                        technicalSkillsScore: 8,
                        communicationScore: 8,
                        problemSolvingScore: 7,
                        relevantExperienceScore: 8,
                        strengths: "Strong technical communication and solid fundamentals.",
                        concerns: "Could go deeper on system design tradeoffs.",
                        recommendation: "Hire",
                      });
                      showToast("Interview feedback saved and interview marked completed.", "success");
                      refresh();
                    }}
                    type="button"
                  >
                    Mark completed
                  </button>
                  <button
                    className="btn-danger"
                    onClick={async () => {
                      const reason = window.prompt("Reason for cancellation?");
                      if (!reason) return;
                      await cancelInterview(interview._id, reason);
                      showToast("Interview cancelled.", "success");
                      refresh();
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}

      {selectedApplication ? (
        <div className="glass-panel p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sunrise">AI question generator</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">Editable interview questions</h2>
              <p className="mt-2 text-sm text-slate-600">Generate role- and resume-aware prompts with evaluation points. Review before use.</p>
            </div>
            <button
              className="btn-secondary"
              onClick={async () => {
                const candidate = selectedApplication.candidateId as Candidate;
                const job = selectedApplication.jobId as Job;
                const response = await generateInterviewQuestions({
                  applicationId: selectedApplication._id,
                  jobTitle: job.title,
                  candidateName: candidate.name,
                  count: 5,
                  category: "Technical",
                  difficulty: "Medium",
                });
                setGeneratedQuestions(response.questions || []);
              }}
              type="button"
            >
              Generate questions
            </button>
          </div>
          <div className="mt-5 grid gap-4">
            {generatedQuestions.map((item, index) => (
              <div key={index} className="rounded-3xl bg-slate-50 p-5">
                <p className="font-semibold text-slate-800">{item.question}</p>
                <p className="mt-2 text-sm text-slate-600">Evaluation points: {item.evaluationPoints.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
