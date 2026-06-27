import type { ApplicationRecord, Candidate, Job } from "../../types";
import { formatDate } from "../../lib/utils";
import { MatchScoreBreakdown } from "../common/MatchScoreBreakdown";
import { ResumeViewer } from "../common/ResumeViewer";
import { StatusBadge } from "../common/StatusBadge";

export function CandidateProfileDrawer({
  open,
  application,
  onClose,
}: {
  open: boolean;
  application: ApplicationRecord | null;
  onClose: () => void;
}) {
  if (!open || !application) return null;
  const candidate = application.candidateId as Candidate;
  const job = application.jobId as Job;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25">
      <button className="flex-1" onClick={onClose} aria-label="Close profile drawer" />
      <div className="h-full w-full max-w-3xl overflow-y-auto bg-white px-6 py-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ink">{candidate.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{candidate.professionalTitle}</p>
            <div className="mt-3 flex items-center gap-3">
              <StatusBadge status={application.status} />
              <span className="text-sm text-slate-500">Applied {formatDate(application.appliedAt)}</span>
            </div>
          </div>
          <button className="btn-secondary" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-6">
          <div className="glass-panel p-5">
            <h3 className="text-lg font-bold text-slate-800">Candidate summary</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{candidate.summary}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contact</p>
                <p className="mt-2 text-sm text-slate-700">{candidate.email}</p>
                <p className="mt-1 text-sm text-slate-700">{candidate.phone}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Applied role</p>
                <p className="mt-2 text-sm text-slate-700">{job.title}</p>
                <p className="mt-1 text-sm text-slate-700">{candidate.location}</p>
              </div>
            </div>
          </div>

          <MatchScoreBreakdown analysis={application.matchAnalysis} />

          <div className="glass-panel p-5">
            <h3 className="text-lg font-bold text-slate-800">Skills and experience</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {candidate.skills.map((skill) => (
                <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {skill}
                </span>
              ))}
            </div>
            <div className="mt-5 space-y-4">
              {candidate.experience.map((experience) => (
                <div key={`${experience.company}-${experience.role}`} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-800">
                    {experience.role} • {experience.company}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{experience.years} years</p>
                  <p className="mt-2 text-sm text-slate-600">{experience.description}</p>
                </div>
              ))}
            </div>
          </div>

          <ResumeViewer applicationId={application._id} resumeUrl={application.resumeUrl} />
        </div>
      </div>
    </div>
  );
}
