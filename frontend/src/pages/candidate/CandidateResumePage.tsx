import { FileText, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  analyzeCandidateResume,
  confirmCandidateResumeExtractedData,
  deleteCandidateResume,
  fetchCandidateResumes,
  setDefaultCandidateResume,
  uploadCandidateResumeVersion,
} from "../../api/recruiter";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { useToast } from "../../context/ToastContext";
import type { ResumeRecord } from "../../types";

function buildResumeFileUrl(resumeId: string) {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return `${apiUrl}/candidate/resumes/${resumeId}/file`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CandidateResumePage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [confirmResumeId, setConfirmResumeId] = useState<string>("");
  const [deleteResumeId, setDeleteResumeId] = useState<string>("");
  const [confirmedName, setConfirmedName] = useState("");
  const [confirmedPhone, setConfirmedPhone] = useState("");
  const [confirmedSkills, setConfirmedSkills] = useState("");
  const { showToast } = useToast();

  function loadResumes() {
    setLoading(true);
    fetchCandidateResumes()
      .then((items) => {
        setResumes(items);
        const defaultResume = items.find((item) => item.isDefault) || items[0];
        setSelectedResumeId(defaultResume?._id || "");
      })
      .catch(() => showToast("Unable to load resume versions right now.", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadResumes();
  }, []);

  const selectedResume = useMemo(() => resumes.find((item) => item._id === selectedResumeId) || null, [resumes, selectedResumeId]);
  const confirmResume = useMemo(() => resumes.find((item) => item._id === confirmResumeId) || null, [resumes, confirmResumeId]);

  useEffect(() => {
    if (!confirmResume) return;
    const source = Object.keys(confirmResume.confirmedData || {}).length > 0 ? confirmResume.confirmedData : confirmResume.extractedData;
    setConfirmedName(source.name || "");
    setConfirmedPhone(source.phone || "");
    setConfirmedSkills(Array.isArray(source.skills) ? source.skills.join(", ") : "");
  }, [confirmResumeId, confirmResume]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      await uploadCandidateResumeVersion(file);
      showToast("Resume uploaded successfully.", "success");
      loadResumes();
    } catch {
      showToast("We couldn't upload that resume.", "error");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSetDefault(resumeId: string) {
    try {
      await setDefaultCandidateResume(resumeId);
      showToast("Default resume updated.", "success");
      loadResumes();
    } catch {
      showToast("We couldn't update the default resume.", "error");
    }
  }

  async function handleAnalyze(resumeId: string) {
    try {
      await analyzeCandidateResume(resumeId);
      showToast("Resume analysis refreshed.", "success");
      loadResumes();
    } catch {
      showToast("We couldn't analyze this resume right now.", "error");
    }
  }

  async function handleConfirmExtractedData() {
    if (!confirmResume) return;
    try {
      await confirmCandidateResumeExtractedData(confirmResume._id, {
        confirmedData: {
          ...(confirmResume.extractedData || {}),
          name: confirmedName,
          phone: confirmedPhone,
          skills: confirmedSkills
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
        applyToProfile: true,
      });
      setConfirmResumeId("");
      showToast("Extracted resume data confirmed and applied to your profile.", "success");
      loadResumes();
    } catch {
      showToast("We couldn't confirm the extracted data.", "error");
    }
  }

  async function handleDeleteResume() {
    if (!deleteResumeId) return;
    try {
      await deleteCandidateResume(deleteResumeId);
      setDeleteResumeId("");
      showToast("Resume deleted successfully.", "success");
      loadResumes();
    } catch {
      showToast("We couldn't delete that resume.", "error");
    }
  }

  if (loading) {
    return <LoadingSkeleton className="h-[36rem]" />;
  }

  return (
    <div className="space-y-6">
      <ConfirmationDialog
        cancelLabel="Keep resume"
        confirmLabel="Delete resume"
        description="This removes the resume version from your account. Existing submitted applications keep their own historical resume reference."
        onClose={() => setDeleteResumeId("")}
        onConfirm={handleDeleteResume}
        open={Boolean(deleteResumeId)}
        title="Delete this resume version?"
      />

      <ConfirmationDialog
        cancelLabel="Keep editing"
        confirmLabel="Confirm data"
        description="This uses your reviewed resume data to refresh your candidate profile details. You can still edit the profile afterward."
        onClose={() => setConfirmResumeId("")}
        onConfirm={handleConfirmExtractedData}
        open={Boolean(confirmResumeId)}
        title="Confirm extracted data?"
      />

      <PageHeader
        eyebrow="Resume"
        title="Resume manager"
        description="Upload new resume versions, select the default version used for applications, review extracted details, and refresh AI analysis."
        action={
          <label className="btn-primary cursor-pointer">
            {uploading ? "Uploading..." : "Upload resume"}
            <input accept=".pdf,.doc,.docx" className="hidden" disabled={uploading} onChange={handleUpload} type="file" />
          </label>
        }
      />

      {resumes.length === 0 ? (
        <EmptyState
          title="No resume versions yet"
          description="Upload a PDF or DOCX resume to create your first private version."
          icon={UploadCloud}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            {resumes.map((resume) => (
              <button
                key={resume._id}
                className={`glass-panel w-full p-5 text-left ${resume._id === selectedResumeId ? "ring-2 ring-emerald-400" : ""}`}
                onClick={() => setSelectedResumeId(resume._id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-ink">{resume.originalName}</h2>
                      {resume.isDefault ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Default</span> : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {resume.mimeType} • {formatFileSize(resume.fileSize)}
                    </p>
                  </div>
                  <FileText className="h-5 w-5 text-tide" />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Processing</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{resume.processingStatus}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Analysis</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{resume.analysisStatus}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedResume ? (
            <div className="space-y-6">
              <div className="glass-panel p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-ink">{selectedResume.originalName}</h2>
                    <p className="mt-2 text-sm text-slate-600">Uploaded {new Date(selectedResume.uploadedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {!selectedResume.isDefault ? (
                      <button className="btn-secondary" onClick={() => handleSetDefault(selectedResume._id)} type="button">
                        Set as default
                      </button>
                    ) : null}
                    <button className="btn-secondary" onClick={() => handleAnalyze(selectedResume._id)} type="button">
                      Refresh analysis
                    </button>
                    <button className="btn-danger" onClick={() => setDeleteResumeId(selectedResume._id)} type="button">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <a className="btn-primary" href={buildResumeFileUrl(selectedResume._id)} rel="noreferrer" target="_blank">
                    Open resume
                  </a>
                  <a className="btn-secondary" download href={buildResumeFileUrl(selectedResume._id)}>
                    Download
                  </a>
                  <button className="btn-secondary" onClick={() => setConfirmResumeId(selectedResume._id)} type="button">
                    Review extracted data
                  </button>
                </div>
              </div>

              <div className="glass-panel p-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-tide" />
                  <h2 className="text-2xl font-bold text-ink">AI resume analysis</h2>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Overall score</p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{selectedResume.analysis?.overallScore ?? "NA"}</p>
                  </div>
                  {Object.entries(selectedResume.analysis?.sectionScores || {}).map(([key, value]) => (
                    <div key={key} className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{key}</p>
                      <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-800">Strong sections</p>
                    <ul className="mt-3 space-y-2 text-sm text-emerald-700">
                      {(selectedResume.analysis?.strengths || []).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-3xl bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800">Improvement suggestions</p>
                    <ul className="mt-3 space-y-2 text-sm text-amber-700">
                      {(selectedResume.analysis?.improvements || []).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6">
                <h2 className="text-2xl font-bold text-ink">Extracted information</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Name</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{selectedResume.confirmedData?.name || selectedResume.extractedData?.name || "Not detected"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phone</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{selectedResume.confirmedData?.phone || selectedResume.extractedData?.phone || "Not detected"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Skills</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {((selectedResume.confirmedData?.skills || selectedResume.extractedData?.skills || []) as string[]).map((skill) => (
                        <span key={skill} className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {confirmResume ? (
        <div className="glass-panel p-6">
          <h2 className="text-2xl font-bold text-ink">Review extracted data</h2>
          <p className="mt-2 text-sm text-slate-600">Adjust the AI-extracted basics before applying them to your profile.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="confirmedName">
                Full name
              </label>
              <input className="input" id="confirmedName" onChange={(event) => setConfirmedName(event.target.value)} value={confirmedName} />
            </div>
            <div>
              <label className="label" htmlFor="confirmedPhone">
                Phone
              </label>
              <input className="input" id="confirmedPhone" onChange={(event) => setConfirmedPhone(event.target.value)} value={confirmedPhone} />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="confirmedSkills">
                Skills
              </label>
              <textarea className="input min-h-28" id="confirmedSkills" onChange={(event) => setConfirmedSkills(event.target.value)} value={confirmedSkills} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
