import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchAssessment } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import type { Assessment } from "../../types";

export function AssessmentPreviewPage() {
  const { assessmentId = "" } = useParams();
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    fetchAssessment(assessmentId).then((response) => setAssessment(response.assessment));
  }, [assessmentId]);

  if (!assessment) return <LoadingSkeleton className="h-80" />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Preview" title={assessment.title} description="Candidate-facing preview with instructions, sections, timing, integrity rules, and result visibility." />
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold text-ink">Candidate instructions</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{assessment.candidateInstructions}</p>
      </div>
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold text-ink">Integrity rules</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(assessment.integritySettings)
            .filter(([, enabled]) => enabled)
            .map(([key]) => (
              <span key={key} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {key}
              </span>
            ))}
        </div>
      </div>
      {assessment.sections.length === 0 ? (
        <EmptyState title="No sections configured" description="Add at least one section before previewing this assessment." />
      ) : (
        <div className="grid gap-4">
          {assessment.sections.map((section) => (
            <div key={section._id || section.title} className="glass-panel p-6">
              <h3 className="text-lg font-bold text-ink">{section.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{section.description}</p>
              <p className="mt-3 text-sm text-slate-500">{section.duration} minutes • {section.totalMarks} marks</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

