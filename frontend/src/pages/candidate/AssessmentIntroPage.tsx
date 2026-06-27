import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchCandidateAssessmentContext } from "../../api/recruiter";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";

export function AssessmentIntroPage() {
  const { invitationToken = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [acceptedConsent, setAcceptedConsent] = useState(false);

  useEffect(() => {
    fetchCandidateAssessmentContext(invitationToken).then(setData);
  }, [invitationToken]);

  if (!data) return <LoadingSkeleton className="m-6 h-80" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="glass-panel p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sunrise">Assessment invitation</p>
        <h1 className="mt-3 text-4xl font-extrabold text-ink">{data.assessment.title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{data.assessment.candidateInstructions}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{data.assessment.category}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Duration</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{data.assessment.settings.totalDuration} minutes</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Attempts</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{data.invitation.maxAttempts}</p>
          </div>
        </div>
        <div className="mt-6 rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-800">Privacy and consent</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Resume matching excludes protected personal characteristics. Integrity events are only review indicators for recruiters and are never automatic rejection decisions.
          </p>
          {data.assessment.settings.requireCandidateConsent ? (
            <label className="mt-4 inline-flex items-start gap-3 text-sm text-slate-700">
              <input checked={acceptedConsent} onChange={(event) => setAcceptedConsent(event.target.checked)} type="checkbox" />
              <span>I understand the privacy notice and consent to continue with this assessment flow.</span>
            </label>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            className="btn-primary"
            disabled={data.assessment.settings.requireCandidateConsent && !acceptedConsent}
            onClick={() => {
              const nextPath = data.assessment.settings.requireCandidateEmailVerification
                ? `/assessment/${invitationToken}/verify`
                : data.assessment.settings.requireResume
                  ? `/assessment/${invitationToken}/resume`
                  : `/assessment/${invitationToken}/system-check`;
              navigate(nextPath);
            }}
            type="button"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
