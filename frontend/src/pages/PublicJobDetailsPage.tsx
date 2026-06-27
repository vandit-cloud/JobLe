import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createCandidateApplication,
  createCandidateApplicationDraft,
  fetchCandidateJobMatch,
  fetchPublicJob,
  fetchSavedJobs,
  removeCandidateSavedJob,
  saveCandidateJob,
} from "../api/recruiter";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { MatchScoreBreakdown } from "../components/common/MatchScoreBreakdown";
import { PageHeader } from "../components/common/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate } from "../lib/utils";
import type { Job, MatchAnalysis } from "../types";

export function PublicJobDetailsPage() {
  const { jobId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [assessmentSummary, setAssessmentSummary] = useState<Record<string, unknown> | null>(null);
  const [match, setMatch] = useState<MatchAnalysis | undefined>();
  const [saved, setSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    fetchPublicJob(jobId)
      .then(async (response) => {
        setJob(response.job);
        setAssessmentSummary((response.assessmentSummary as Record<string, unknown> | null) || null);
        if (user?.role === "candidate") {
          const [candidateMatch, savedJobs] = await Promise.all([fetchCandidateJobMatch(jobId), fetchSavedJobs()]);
          setMatch(candidateMatch);
          setSaved(savedJobs.some((item) => item.job._id === jobId));
        }
      })
      .catch(() => showToast("Unable to load this job right now.", "error"))
      .finally(() => setLoading(false));
  }, [jobId, user?.role]);

  async function toggleSave() {
    if (!user || user.role !== "candidate") {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    try {
      if (saved) {
        await removeCandidateSavedJob(jobId);
        setSaved(false);
        showToast("Job removed from saved list.", "success");
      } else {
        await saveCandidateJob(jobId);
        setSaved(true);
        showToast("Job saved successfully.", "success");
      }
    } catch {
      showToast("We couldn't update your saved jobs.", "error");
    }
  }

  async function handleApply() {
    if (!user || user.role !== "candidate") {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    if (!job) return;

    try {
      setApplying(true);
      const application = await createCandidateApplication(job._id, {
        coverLetter,
        screeningAnswers: job.screeningQuestions.map((question) => ({
          question,
          answer: screeningAnswers[question] || "",
        })),
      });
      showToast("Application submitted successfully.", "success");
      navigate(`/candidate/applications/${application._id}`);
    } catch {
      showToast("We couldn't submit your application. Make sure required answers are filled in.", "error");
    } finally {
      setApplying(false);
    }
  }

  async function handleSaveDraft() {
    if (!user || user.role !== "candidate") {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    if (!job) return;

    try {
      setSavingDraft(true);
      const application = await createCandidateApplicationDraft(job._id, {
        coverLetter,
        screeningAnswers: job.screeningQuestions.map((question) => ({
          question,
          answer: screeningAnswers[question] || "",
        })),
      });
      showToast("Application draft saved.", "success");
      navigate(`/candidate/applications/${application._id}`);
    } catch {
      showToast("We couldn't save this application draft.", "error");
    } finally {
      setSavingDraft(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton className="h-96" />;
  }

  if (!job) {
    return <EmptyState title="Job not found" description="This role is no longer public or may have expired." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Job details"
        title={job.title}
        description={`${job.company?.name} • ${job.location} • ${job.workplaceType} • ${job.employmentType}`}
        action={
          <>
            <button className="btn-secondary" onClick={toggleSave} type="button">
              {saved ? "Remove saved" : "Save job"}
            </button>
            <button className="btn-secondary" disabled={savingDraft} onClick={handleSaveDraft} type="button">
              {savingDraft ? "Saving..." : "Save draft"}
            </button>
            <button className="btn-primary" disabled={applying} onClick={handleApply} type="button">
              {applying ? "Applying..." : "Apply now"}
            </button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Salary</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {job.salary.showPublicly
                    ? `${formatCurrency(job.salary.minimum, job.salary.currency)} - ${formatCurrency(job.salary.maximum, job.salary.currency)}`
                    : "Hidden publicly"}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Openings</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{job.openings}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Experience</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {job.minimumExperience} - {job.maximumExperience} years
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Deadline</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{formatDate(job.applicationDeadline)}</p>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <section>
                <h2 className="text-xl font-bold text-ink">Job summary</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{job.summary}</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-ink">Responsibilities</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {job.responsibilities.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-ink">Required skills</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.requiredSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
              <section>
                <h2 className="text-xl font-bold text-ink">Preferred skills</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.preferredSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
              <section>
                <h2 className="text-xl font-bold text-ink">Qualifications</h2>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-800">Required</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {job.requiredQualifications.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-800">Preferred</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {job.preferredQualifications.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {user?.role === "candidate" ? <MatchScoreBreakdown analysis={match} /> : null}
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">Assessment information</h2>
            {assessmentSummary ? (
              <div className="mt-5 grid gap-3">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Assessment</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{String(assessmentSummary.title || "Assessment required")}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sections</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{String(assessmentSummary.sectionsCount || 0)}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Duration</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{String(assessmentSummary.duration || 0)} minutes</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">This job does not currently require a published assessment.</p>
            )}
          </div>

          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">Company overview</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{job.company?.description || "Company information is not available."}</p>
            {job.company ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <Link className="btn-secondary" to={`/companies/${job.company._id}`}>
                  View company
                </Link>
              </div>
            ) : null}
          </div>

          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">Application form</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="coverLetter">
                  Cover letter
                </label>
                <textarea className="input min-h-32" id="coverLetter" onChange={(event) => setCoverLetter(event.target.value)} value={coverLetter} />
              </div>
              {job.screeningQuestions.map((question) => (
                <div key={question}>
                  <label className="label" htmlFor={question}>
                    {question}
                  </label>
                  <textarea
                    className="input min-h-24"
                    id={question}
                    onChange={(event) => setScreeningAnswers((current) => ({ ...current, [question]: event.target.value }))}
                    value={screeningAnswers[question] || ""}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
