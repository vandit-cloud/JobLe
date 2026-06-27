import { Link, useParams } from "react-router-dom";

export function AssessmentSubmittedPage() {
  const { invitationToken = "" } = useParams();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="glass-panel p-8 text-center">
        <h1 className="text-4xl font-extrabold text-ink">Assessment submitted</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">Your responses were stored successfully. Any integrity events are only indicators for recruiter review and do not automatically decide outcomes.</p>
        <div className="mt-6 flex justify-center">
          <Link className="btn-primary" to={`/candidate/assessments`}>
            View my assessments
          </Link>
        </div>
        <div className="mt-3 flex justify-center">
          <Link className="btn-secondary" to={`/assessment/${invitationToken}`}>
            Back to invitation
          </Link>
        </div>
      </div>
    </div>
  );
}

