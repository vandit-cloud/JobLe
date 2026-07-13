import { AlertTriangle, FileWarning, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteAdminRejectedResumeFile, fetchAdminResumeSecurityReview } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { StatisticCard } from "../../components/common/StatisticCard";
import { useToast } from "../../context/ToastContext";
import type { AdminResumeSecurityRecord, AdminResumeSecurityReview } from "../../types";

function formatBytes(value?: number) {
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function SecurityRecordList({
  title,
  description,
  records,
  onDeleteRejected,
}: {
  title: string;
  description: string;
  records: AdminResumeSecurityRecord[];
  onDeleteRejected?: (resumeId: string) => void;
}) {
  return (
    <section className="glass-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">{title}</p>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
          {records.length} items
        </span>
      </div>

      {records.length ? (
        <div className="mt-5 grid gap-3">
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ink">{record.originalName || "Unnamed resume"}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {record.securityStatus || "Unknown"} - {record.storageZone || "no zone"} - {formatBytes(record.fileSize)}
                  </p>
                  <p className="mt-2 break-all text-xs text-slate-500">{record.fileHash || "No hash captured"}</p>
                  {record.rejectedReasonCode ? (
                    <p className="mt-2 text-sm font-semibold text-amber-700">{record.rejectedReasonCode}</p>
                  ) : null}
                </div>
                {onDeleteRejected ? (
                  <button className="btn-danger" onClick={() => onDeleteRejected(record.id)} type="button">
                    <Trash2 className="h-4 w-4" />
                    Delete file
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No records in this bucket.</div>
      )}
    </section>
  );
}

export function AdminResumeSecurityPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<AdminResumeSecurityReview | null>(null);

  useEffect(() => {
    fetchAdminResumeSecurityReview()
      .then(setReview)
      .catch(() => showToast("Unable to load resume security review.", "error"))
      .finally(() => setLoading(false));
  }, []);

  async function deleteRejectedFile(resumeId: string) {
    try {
      await deleteAdminRejectedResumeFile(resumeId);
      setReview((current) =>
        current
          ? {
              ...current,
              rejectedResumes: current.rejectedResumes.filter((record) => record.id !== resumeId),
            }
          : current,
      );
      showToast("Rejected resume file deleted.", "success");
    } catch {
      showToast("Unable to delete this rejected file.", "error");
    }
  }

  if (loading) return <LoadingSkeleton className="m-6 h-[36rem]" />;
  if (!review) return <EmptyState title="Security review unavailable" description="Please try again after the backend is available." />;

  return (
    <main className="min-h-screen bg-[#edf5f2] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Admin security"
          title="Resume Security Review"
          description="Monitor rejected resumes, suspicious upload signals, parser failures, high-volume accounts, and recruiter resume-access activity."
        />

        <div className="grid gap-4 md:grid-cols-4">
          <StatisticCard title="Rejected resumes" value={review.rejectedResumes.length} icon={FileWarning} />
          <StatisticCard title="Malware flags" value={review.malwareScanFailures.length} icon={AlertTriangle} accent="from-amber-200/45 to-white" />
          <StatisticCard title="Parser failures" value={review.parserFailures.length} icon={ShieldCheck} accent="from-rose-200/45 to-white" />
          <StatisticCard title="High volume accounts" value={review.highUploadVolumeAccounts.length} icon={AlertTriangle} accent="from-sky-200/45 to-white" />
        </div>

        <SecurityRecordList
          title="Rejected resumes"
          description="Files blocked by validation, suspicious content checks, or quarantine processing."
          records={review.rejectedResumes}
          onDeleteRejected={deleteRejectedFile}
        />
        <SecurityRecordList title="Malware and suspicious scan failures" description="Resumes with embedded script, action, macro, or executable indicators." records={review.malwareScanFailures} />
        <SecurityRecordList title="Parser and AI failures" description="Documents that passed upload but failed extraction or analysis." records={review.parserFailures} />
        <SecurityRecordList title="Recent recruiter access" description="Recently accessed resumes with recruiter access audit events attached." records={review.recentRecruiterAccess} />

        <section className="glass-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">High upload volume accounts</p>
          {review.highUploadVolumeAccounts.length ? (
            <div className="mt-5 grid gap-3">
              {review.highUploadVolumeAccounts.map((account) => (
                <div key={account._id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="break-all font-bold text-ink">{account._id}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {account.uploads} uploads - {account.rejected} rejected
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No high-volume upload accounts found.</div>
          )}
        </section>
      </div>
    </main>
  );
}
