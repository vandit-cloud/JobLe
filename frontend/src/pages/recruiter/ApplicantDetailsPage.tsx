import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchApplication } from "../../api/recruiter";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { MatchScoreBreakdown } from "../../components/common/MatchScoreBreakdown";
import { PageHeader } from "../../components/common/PageHeader";
import { ResumeViewer } from "../../components/common/ResumeViewer";
import { StatusBadge } from "../../components/common/StatusBadge";
import { formatDate } from "../../lib/utils";
import type { ApplicationRecord, Candidate, Job } from "../../types";

export function ApplicantDetailsPage() {
  const { applicationId = "" } = useParams();
  const [application, setApplication] = useState<ApplicationRecord | null>(null);

  useEffect(() => {
    fetchApplication(applicationId).then(setApplication);
  }, [applicationId]);

  if (!application) {
    return <LoadingSkeleton className="h-96" />;
  }

  const candidate = application.candidateId as Candidate;
  const job = application.jobId as Job;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Application" title={candidate.name} description={`Application details for ${job.title}`} />

      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ink">{candidate.professionalTitle}</h2>
            <p className="mt-2 text-sm text-slate-600">{candidate.summary}</p>
            <p className="mt-3 text-sm text-slate-500">
              Applied on {formatDate(application.appliedAt)} • {candidate.location}
            </p>
          </div>
          <StatusBadge status={application.status} />
        </div>
      </div>

      <MatchScoreBreakdown analysis={application.matchAnalysis} />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold text-slate-800">Candidate profile</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contact</p>
              <p className="mt-2 text-sm text-slate-700">{candidate.email}</p>
              <p className="mt-1 text-sm text-slate-700">{candidate.phone}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Availability</p>
              <p className="mt-2 text-sm text-slate-700">{candidate.availability}</p>
            </div>
          </div>
          <div className="mt-5">
            <p className="text-sm font-semibold text-slate-700">Skills</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {candidate.skills.map((skill) => (
                <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {candidate.experience.map((experience) => (
              <div key={`${experience.company}-${experience.role}`} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-800">{experience.role}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {experience.company} • {experience.years} years
                </p>
                <p className="mt-2 text-sm text-slate-600">{experience.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold text-slate-800">Screening responses</h3>
            <div className="mt-5 space-y-4">
              {application.screeningAnswers.map((item) => (
                <div key={item.question} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">{item.question}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
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
