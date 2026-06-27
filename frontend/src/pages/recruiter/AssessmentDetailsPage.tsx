import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchAssessment } from "../../api/recruiter";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import type { Assessment } from "../../types";

export function AssessmentDetailsPage() {
  const { assessmentId = "" } = useParams();
  const [data, setData] = useState<{ assessment: Assessment; invitationCount: number; resultsCount: number } | null>(null);

  useEffect(() => {
    fetchAssessment(assessmentId).then(setData);
  }, [assessmentId]);

  if (!data) return <LoadingSkeleton className="h-80" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assessment"
        title={data.assessment.title}
        description={data.assessment.description || data.assessment.candidateInstructions}
        action={<Link className="btn-primary" to={`/recruiter/assessments/${assessmentId}/edit`}>Edit assessment</Link>}
      />

      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={data.assessment.status} />
          <span className="text-sm text-slate-500">{data.assessment.category}</span>
          <span className="text-sm text-slate-500">{data.assessment.experienceLevel}</span>
          <span className="text-sm text-slate-500">{data.assessment.totalDuration} min</span>
          <span className="text-sm text-slate-500">{data.assessment.totalMarks} marks</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Invitations</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{data.invitationCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Results</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{data.resultsCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Passing %</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{data.assessment.passingPercentage}%</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {data.assessment.sections.map((section) => (
          <div key={section._id || section.title} className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">{section.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{section.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{section.type}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{section.duration} min</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{section.questions.length} questions</span>
            </div>
            <div className="mt-5 space-y-3">
              {section.questions.map((question, index) => (
                <div key={question._id || `${section.title}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-800">{index + 1}. {question.questionText}</p>
                  <p className="mt-2 text-sm text-slate-600">{question.questionType} • {question.skill || "General"} • {question.difficulty}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

