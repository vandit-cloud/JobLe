import { AlertTriangle, CheckCircle2, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchRecruiterIdentityReport,
  requestRecruiterCandidateExplanation,
  requestRecruiterIdentityRetest,
  reviewRecruiterIdentityReport,
} from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useToast } from "../../context/ToastContext";
import type { AlternativeVerificationRequest, AssessmentAttempt, CandidateIdentityVerification, IdentityVerificationEvent } from "../../types";

type Report = {
  attempt: AssessmentAttempt;
  verification: CandidateIdentityVerification;
  events: IdentityVerificationEvent[];
  alternativeRequests: AlternativeVerificationRequest[];
  imageUrls: Record<"front" | "left" | "right", string>;
  summary: Record<string, unknown>;
  warning: string;
};

const reviewStatuses = ["Reviewed", "Ignored", "Explanation Requested", "Retest Requested"];

export function IdentityReportPage() {
  const { attemptId = "" } = useParams();
  const { showToast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [reviewStatus, setReviewStatus] = useState("Reviewed");
  const [note, setNote] = useState("");

  async function load() {
    const data = await fetchRecruiterIdentityReport(attemptId);
    setReport(data);
    setReviewStatus(data.verification.reviewStatus === "Unreviewed" ? "Reviewed" : data.verification.reviewStatus);
    setNote(data.verification.recruiterNote || "");
  }

  useEffect(() => {
    load().catch(() => setReport(null));
  }, [attemptId]);

  if (!report) return <LoadingSkeleton className="h-[34rem]" />;

  const flaggedEvents = report.events.filter((event) => ["REVIEW_REQUIRED", "HIGH_REVIEW_REQUIRED"].includes(event.severity));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Identity report"
        title={report.attempt.candidateProfile.name}
        description="Review camera and identity indicators. The system never marks a candidate as cheating automatically."
        action={<Link className="btn-secondary" to={`/recruiter/assessment-results/${attemptId}`}>Back to result</Link>}
      />

      <section className="glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={report.verification.status} />
              <StatusBadge status={report.verification.reviewStatus} />
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{report.warning}</p>
          </div>
          <div className="rounded-3xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {flaggedEvents.length} events need closer review
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {([
          ["Identity mismatch", report.summary.identityMismatchEvents],
          ["Face not visible", report.summary.faceNotVisibleEvents],
          ["Multiple people", report.summary.multiplePeopleEvents],
          ["Camera interruptions", report.summary.cameraInterruptions],
        ] as Array<[string, unknown]>).map(([label, value]) => (
          <div key={label} className="glass-panel p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-extrabold text-ink">{String(value ?? 0)}</p>
          </div>
        ))}
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-xl font-bold text-ink">Reference images</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {(["front", "left", "right"] as const).map((angle) => (
            <div key={angle} className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-bold capitalize text-ink">{angle} angle</p>
              {report.imageUrls[angle] ? (
                <img alt={`${angle} identity reference`} className="mt-3 aspect-video w-full rounded-2xl object-cover" src={report.imageUrls[angle]} />
              ) : (
                <div className="mt-3 flex aspect-video items-center justify-center rounded-2xl bg-white text-sm text-slate-500">Not captured</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-xl font-bold text-ink">Review actions</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
          <select className="input" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)}>
            {reviewStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
          <input className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Recruiter note for audit trail" />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="btn-primary"
            onClick={async () => {
              const verification = await reviewRecruiterIdentityReport(attemptId, { reviewStatus, recruiterNote: note });
              setReport((current) => (current ? { ...current, verification } : current));
              showToast("Identity report review saved.", "success");
            }}
            type="button"
          >
            <CheckCircle2 className="h-4 w-4" />
            Save review
          </button>
          <button
            className="btn-secondary"
            onClick={async () => {
              const verification = await requestRecruiterIdentityRetest(attemptId, note || "Please retake identity verification.");
              setReport((current) => (current ? { ...current, verification } : current));
              showToast("Retest request recorded.", "success");
            }}
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            Request retest
          </button>
          <button
            className="btn-secondary"
            onClick={async () => {
              const verification = await requestRecruiterCandidateExplanation(attemptId, note || "Please explain the identity/camera event.");
              setReport((current) => (current ? { ...current, verification } : current));
              showToast("Explanation request recorded.", "success");
            }}
            type="button"
          >
            <ShieldAlert className="h-4 w-4" />
            Request explanation
          </button>
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-xl font-bold text-ink">Event timeline</h2>
        {report.events.length ? (
          <div className="mt-5 space-y-3">
            {report.events.map((event) => (
              <div key={event._id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{event.eventType}</p>
                    <p className="mt-1 text-sm text-slate-500">{new Date(event.startedAt || event.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${event.severity.includes("HIGH") ? "bg-rose-100 text-rose-700" : event.severity.includes("REVIEW") ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {event.severity}
                  </span>
                </div>
                {event.confidence ? <p className="mt-2 text-sm text-slate-600">Confidence: {event.confidence}%</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No camera events" description="No identity or camera review events were recorded for this attempt." />
        )}
      </section>

      {report.alternativeRequests.length ? (
        <section className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">Alternative verification requests</h2>
          <div className="mt-5 space-y-3">
            {report.alternativeRequests.map((request) => (
              <div key={request._id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <p className="font-bold text-ink">{request.reasonCategory}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{request.explanation}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{request.status}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="glass-panel p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <p className="font-bold text-ink">Responsible AI boundary</p>
        </div>
        <p className="mt-2 text-sm text-slate-600">This report does not include emotion detection, personality prediction, or protected-characteristic inference.</p>
      </section>
    </div>
  );
}
