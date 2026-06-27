import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Assessment } from "../../types";
import { formatDate } from "../../lib/utils";
import { StatusBadge } from "../common/StatusBadge";

export function AssessmentCard({ assessment, actions }: { assessment: Assessment; actions?: ReactNode }) {
  return (
    <div className="glass-panel p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.14)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-ink">{assessment.title}</h3>
            <StatusBadge status={assessment.status} />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {assessment.category} • {assessment.experienceLevel} • {assessment.assessmentLanguage}
          </p>
        </div>
        {actions}
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{assessment.description || assessment.candidateInstructions}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sections</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{assessment.sectionsCount ?? assessment.sections.length}</p>
        </div>
        <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Questions</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{assessment.questionsCount ?? assessment.sections.reduce((sum, s) => sum + s.questions.length, 0)}</p>
        </div>
        <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Duration</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{assessment.totalDuration} min</p>
        </div>
        <div className="rounded-[22px] border border-white/65 bg-white/75 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Created</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{formatDate(assessment.createdAt)}</p>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Link className="btn-secondary" to={`/recruiter/assessments/${assessment._id}`}>
          View assessment
        </Link>
      </div>
    </div>
  );
}
