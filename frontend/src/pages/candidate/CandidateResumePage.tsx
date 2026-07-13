import {
  AlertTriangle,
  Briefcase,
  FileSearch,
  FileText,
  Link2,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { MatchScoreBadge } from "../../components/common/MatchScoreBadge";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useToast } from "../../context/ToastContext";
import type { ResumeRecord } from "../../types";

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

function buildResumeFileUrl(resumeId: string) {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return `${apiUrl}/candidate/resumes/${resumeId}/file`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeStringList(values: unknown) {
  return Array.isArray(values) ? values.map((value) => String(value || "").trim()).filter(Boolean) : [];
}

function describeEducation(item: Record<string, unknown>) {
  return [item.degree, item.field, item.startYear && item.endYear ? `${item.startYear}-${item.endYear}` : item.graduationYear, item.grade]
    .filter(Boolean)
    .join(" • ");
}

function describeExperience(item: Record<string, unknown>) {
  return [item.company, item.employmentType, item.duration || (item.years ? `${item.years} years` : "")]
    .filter(Boolean)
    .join(" • ");
}

function validateResumeFile(file: File) {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return "Please upload a PDF or DOCX resume.";
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `Resume files must be under ${MAX_FILE_SIZE_MB} MB.`;
  }

  return "";
}

function labelForCheck(key: string) {
  const labels: Record<string, string> = {
    mimeTypeValid: "MIME type",
    extensionValid: "File extension",
    blockedExtension: "Blocked extension",
    magicBytesValid: "File signature",
    fileSizeValid: "File size",
    filenameSafe: "File name safety",
    duplicateDetected: "Duplicate file",
    passwordProtectedPdf: "Password-protected PDF",
    corruptedFile: "Corrupted file",
    malwareScanStatus: "Malware scan",
    suspiciousContentDetected: "Suspicious content",
    pageCountWarning: "Page count warning",
    extractedTextAvailable: "Extracted text available",
  };

  return labels[key] || key;
}

export function CandidateResumePage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState("");
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [confirmResumeId, setConfirmResumeId] = useState<string>("");
  const [deleteResumeId, setDeleteResumeId] = useState<string>("");
  const [confirmedName, setConfirmedName] = useState("");
  const [confirmedPhone, setConfirmedPhone] = useState("");
  const [confirmedProfessionalTitle, setConfirmedProfessionalTitle] = useState("");
  const [confirmedLocation, setConfirmedLocation] = useState("");
  const [confirmedSummary, setConfirmedSummary] = useState("");
  const [confirmedSkills, setConfirmedSkills] = useState("");
  const { showToast } = useToast();

  function loadResumes() {
    setLoading(true);
    fetchCandidateResumes()
      .then((items) => {
        setResumes(items);
        const defaultResume = items.find((item) => item.isDefault) || items[0];
        setSelectedResumeId((current) => (items.some((item) => item._id === current) ? current : defaultResume?._id || ""));
      })
      .catch(() => showToast("Unable to load resume versions right now.", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadResumes();
  }, []);

  const selectedResume = useMemo(() => resumes.find((item) => item._id === selectedResumeId) || null, [resumes, selectedResumeId]);
  const confirmResume = useMemo(() => resumes.find((item) => item._id === confirmResumeId) || null, [resumes, confirmResumeId]);
  const selectedResumeData = useMemo(() => {
    if (!selectedResume) return null;
    return Object.keys(selectedResume.confirmedData || {}).length > 0 ? selectedResume.confirmedData : selectedResume.extractedData;
  }, [selectedResume]);

  const detectedLinks = useMemo(
    () =>
      selectedResumeData
        ? [
            selectedResumeData.socialLinks?.linkedin,
            selectedResumeData.socialLinks?.github,
            selectedResumeData.socialLinks?.portfolio,
            selectedResumeData.socialLinks?.website,
            ...normalizeStringList(selectedResumeData.socialLinks?.other),
          ].filter(Boolean)
        : [],
    [selectedResumeData],
  );

  const groupedSkills = useMemo(() => {
    if (!selectedResumeData?.skillGroups) return [];
    return Object.entries(selectedResumeData.skillGroups as Record<string, unknown>)
      .map(([key, value]) => ({
        key,
        label: key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()),
        items: normalizeStringList(value),
      }))
      .filter((group) => group.items.length > 0);
  }, [selectedResumeData]);
  const selectedResumeIsSecure = selectedResume?.storageZone === "clean" && selectedResume?.securityStatus !== "REJECTED";
  const selectedResumeIsApplicationReady = selectedResume?.securityStatus === "CLEAN" && selectedResume?.confirmationStatus === "CONFIRMED";

  useEffect(() => {
    if (!confirmResume) return;
    const source = Object.keys(confirmResume.confirmedData || {}).length > 0 ? confirmResume.confirmedData : confirmResume.extractedData;
    setConfirmedName(source.name || "");
    setConfirmedPhone(source.phone || "");
    setConfirmedProfessionalTitle(source.professionalTitle || "");
    setConfirmedLocation(source.location || "");
    setConfirmedSummary(source.summary || "");
    setConfirmedSkills(Array.isArray(source.skills) ? source.skills.join(", ") : "");
  }, [confirmResume]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationMessage = validateResumeFile(file);
    if (validationMessage) {
      showToast(validationMessage, "error");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setUploadFeedback(`Uploading ${file.name}. The system will validate, scan, extract, and analyze your resume.`);
      const resume = await uploadCandidateResumeVersion(file);
      setSelectedResumeId(resume._id);
      setUploadFeedback(`Upload completed. Status: ${resume.processingStatus}. Analysis: ${resume.analysisStatus}.`);
      showToast("Resume uploaded successfully.", "success");
      loadResumes();
    } catch (error: any) {
      const message = error?.response?.data?.message || "We couldn't upload that resume.";
      setUploadFeedback(message);
      showToast(message, "error");
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
      showToast("Resume extraction and analysis refreshed.", "success");
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
          professionalTitle: confirmedProfessionalTitle,
          location: confirmedLocation,
          summary: confirmedSummary,
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
        description="Upload private resume versions, review extraction quality, inspect validation checks, and retry AI parsing whenever needed."
        action={
          <label className="btn-primary cursor-pointer">
            {uploading ? "Uploading..." : "Upload resume"}
            <input accept=".pdf,.docx" className="hidden" disabled={uploading} onChange={handleUpload} type="file" />
          </label>
        }
      />

      <div className="glass-panel flex flex-wrap items-center gap-4 p-5">
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Supported files</p>
          <p className="mt-2 text-sm font-semibold">PDF, DOCX</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Maximum size</p>
          <p className="mt-2 text-sm font-semibold">{MAX_FILE_SIZE_MB} MB</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Validation flow</p>
          <p className="mt-2 text-sm font-semibold">Upload • Scan • Extract • Analyze • Review</p>
        </div>
      </div>

      <div className="glass-panel flex flex-wrap items-center gap-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tide">Resume workspace</p>
          <p className="mt-1 text-sm text-slate-600">Skill Passport, test, and result now live inside the Resume area.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-3">
          <Link className="btn-secondary" to="/candidate/resume/skill-passport">
            Skill passport
          </Link>
          <Link className="btn-secondary" to="/candidate/resume/skill-passport/test">
            Skill test
          </Link>
          <Link className="btn-secondary" to="/candidate/skill-result">
            Skill result
          </Link>
        </div>
      </div>

      {uploadFeedback ? (
        <div className="glass-panel border border-sky-100 bg-sky-50/70 p-5 text-sky-900">
          <div className="flex items-start gap-3">
            <FileSearch className="mt-0.5 h-5 w-5" />
            <div>
              <p className="text-sm font-semibold">Resume upload feedback</p>
              <p className="mt-1 text-sm leading-6">{uploadFeedback}</p>
            </div>
          </div>
        </div>
      ) : null}

      {resumes.length === 0 ? (
        <EmptyState
          title="No resume versions yet"
          description="Upload a PDF or DOCX resume to create your first private version."
          icon={UploadCloud}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)] xl:items-start">
          <div className="space-y-4">
            {resumes.map((resume) => (
              <button
                key={resume._id}
                className={`glass-panel w-full p-5 text-left ${resume._id === selectedResumeId ? "ring-2 ring-emerald-400" : ""}`}
                onClick={() => setSelectedResumeId(resume._id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-ink">{resume.originalName}</h2>
                      {resume.isDefault ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Default</span> : null}
                    </div>
                    <p className="text-sm text-slate-600">
                      {resume.mimeType} • {formatFileSize(resume.fileSize)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={resume.processingStatus} />
                      <StatusBadge status={resume.analysisStatus} />
                      {resume.securityStatus ? <StatusBadge status={resume.securityStatus} /> : null}
                      {resume.confirmationStatus ? <StatusBadge status={resume.confirmationStatus} /> : null}
                    </div>
                  </div>
                  <FileText className="h-5 w-5 text-tide" />
                </div>
              </button>
            ))}
          </div>

          {selectedResume ? (
            <div className="glass-panel h-full p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-ink">{selectedResume.originalName}</h2>
                    <p className="mt-2 text-sm text-slate-600">Uploaded {new Date(selectedResume.uploadedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {!selectedResume.isDefault && selectedResumeIsApplicationReady ? (
                      <button className="btn-secondary" onClick={() => handleSetDefault(selectedResume._id)} type="button">
                        Set as default
                      </button>
                    ) : null}
                    <button className="btn-secondary" disabled={!selectedResumeIsSecure} onClick={() => handleAnalyze(selectedResume._id)} type="button">
                      Retry extraction
                    </button>
                    <button className="btn-danger" onClick={() => setDeleteResumeId(selectedResume._id)} type="button">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {selectedResumeIsSecure ? (
                    <>
                      <a className="btn-primary" href={buildResumeFileUrl(selectedResume._id)} rel="noreferrer" target="_blank">
                        Open resume
                      </a>
                      <a className="btn-secondary" download href={buildResumeFileUrl(selectedResume._id)}>
                        Download
                      </a>
                    </>
                  ) : null}
                  <button className="btn-secondary" disabled={!selectedResumeIsSecure} onClick={() => setConfirmResumeId(selectedResume._id)} type="button">
                    Review extracted data
                  </button>
                  {selectedResumeIsApplicationReady ? (
                    <Link className="btn-primary" to="/candidate/resume/skill-passport">
                      Build skill passport
                    </Link>
                  ) : null}
                </div>
              </div>

            ) : null}
          </div>

          {selectedResume ? (
            <div className="space-y-6">
              <div className="glass-panel p-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-tide" />
                  <h2 className="text-2xl font-bold text-ink">Resume processing</h2>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Processing status</p>
                    <div className="mt-3">
                      <StatusBadge status={selectedResume.processingStatus} />
                    </div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Analysis status</p>
                    <div className="mt-3">
                      <StatusBadge status={selectedResume.analysisStatus} />
                    </div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Security status</p>
                    <div className="mt-3">
                      <StatusBadge status={selectedResume.securityStatus || "PENDING"} />
                    </div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Candidate review</p>
                    <div className="mt-3">
                      <StatusBadge status={selectedResume.confirmationStatus || "PENDING"} />
                    </div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Page count</p>
                    <p className="mt-3 text-lg font-bold text-slate-800">{selectedResume.pageCount ?? "Not available"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Extraction quality</p>
                    <p className="mt-3 text-lg font-bold text-slate-800">
                      {selectedResume.uploadChecks?.extractedTextAvailable ? "Detected" : selectedResume.uploadChecks?.extractedTextAvailable === false ? "Needs review" : "Pending"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-3xl bg-amber-50 p-5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-700" />
                      <p className="text-sm font-semibold text-amber-900">Upload warnings</p>
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-amber-800">
                      {(selectedResume.uploadWarnings || []).map((warning) => (
                        <li key={warning}>• {warning}</li>
                      ))}
                      {!(selectedResume.uploadWarnings || []).length ? <li>No upload warnings.</li> : null}
                    </ul>
                  </div>

                  <div className="rounded-3xl bg-emerald-50 p-5">
                    <p className="text-sm font-semibold text-emerald-900">Validation checks</p>
                    <div className="mt-3 space-y-2 text-sm text-emerald-800">
                      {Object.entries(selectedResume.uploadChecks || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-3 py-2">
                          <span>{labelForCheck(key)}</span>
                          <span className="font-semibold">
                            {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedResume.analysisStatus === "Analysis Failed" ? (
                  <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                    <p className="text-sm font-semibold">Extraction needs manual review</p>
                    <p className="mt-2 text-sm leading-6">
                      We kept the uploaded file, but the system could not confidently extract enough structured details. Retry extraction, review the data manually,
                      or open your profile to fill in anything still missing.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button className="btn-secondary" onClick={() => handleAnalyze(selectedResume._id)} type="button">
                        Retry extraction
                      </button>
                      <button className="btn-primary" onClick={() => setConfirmResumeId(selectedResume._id)} type="button">
                        Review manually
                      </button>
                      <Link className="btn-secondary" to="/candidate/profile">
                        Open My Profile
                      </Link>
                    </div>
                  </div>
                ) : null}
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
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Role recommendations</p>
                    <h2 className="mt-2 text-2xl font-bold text-ink">Roles matched to your resume</h2>
                  </div>
                  <Link className="btn-secondary" to="/jobs">
                    Browse jobs
                  </Link>
                </div>

                <div className="mt-6 grid gap-4">
                  {(selectedResume.analysis?.roleRecommendations || []).length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 p-5 text-sm text-slate-600">
                      Re-extract or confirm the resume to generate stronger role recommendations.
                    </div>
                  ) : (
                    (selectedResume.analysis?.roleRecommendations || []).map((recommendation) => (
                      <div key={recommendation.roleTitle} className="rounded-3xl border border-slate-200 bg-white p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-ink">{recommendation.roleTitle}</h3>
                            <p className="mt-1 text-sm text-slate-600">{recommendation.experienceReadiness}</p>
                          </div>
                          <MatchScoreBadge score={recommendation.score} />
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Matching skills</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {recommendation.matchingSkills.map((skill) => (
                                <span key={skill} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  {skill}
                                </span>
                              ))}
                              {recommendation.matchingSkills.length === 0 ? <span className="text-sm text-slate-500">No strong matching skills detected</span> : null}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Missing skills</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {recommendation.missingSkills.map((skill) => (
                                <span key={skill} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                                  {skill}
                                </span>
                              ))}
                              {recommendation.missingSkills.length === 0 ? <span className="text-sm text-slate-500">No major skill gaps detected</span> : null}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
                          <div className="rounded-3xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recommended assessment</p>
                            {recommendation.recommendedAssessment ? (
                              <div className="mt-3 space-y-1">
                                <p className="text-sm font-semibold text-slate-800">{recommendation.recommendedAssessment.title}</p>
                                <p className="text-sm text-slate-600">
                                  {[recommendation.recommendedAssessment.experienceLevel, recommendation.recommendedAssessment.totalDuration ? `${recommendation.recommendedAssessment.totalDuration} min` : ""]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </p>
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-slate-500">No linked assessment found for this role yet.</p>
                            )}
                          </div>

                          <div className="rounded-3xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Suitable job openings</p>
                            <div className="mt-3 grid gap-3">
                              {recommendation.suitableJobOpenings.map((opening) => (
                                <div key={opening.jobId} className="rounded-2xl bg-white p-4 shadow-sm">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-800">{opening.title}</p>
                                      <p className="mt-1 text-sm text-slate-600">
                                        {[opening.companyName, opening.location, opening.workplaceType].filter(Boolean).join(" • ")}
                                      </p>
                                    </div>
                                    <MatchScoreBadge score={opening.matchScore} />
                                  </div>
                                  <div className="mt-3">
                                    <Link className="text-sm font-semibold text-tide" to={`/jobs/${opening.jobId}`}>
                                      View opening
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="glass-panel p-6">
                <h2 className="text-2xl font-bold text-ink">Extracted information</h2>
                <p className="mt-2 text-sm text-slate-600">This is the structured profile built from your uploaded resume. Review it before applying it to your profile.</p>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Name</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{selectedResumeData?.name || "Not detected"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phone</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{selectedResumeData?.phone || "Not detected"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{selectedResumeData?.email || "Not detected"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <Briefcase className="h-4 w-4" />
                      Title
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{selectedResumeData?.professionalTitle || "Not detected"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total experience</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {selectedResumeData?.totalExperienceYears ? `${selectedResumeData.totalExperienceYears} years` : "Not detected"}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current role</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{selectedResumeData?.currentRole || "Not detected"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Career level</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{selectedResumeData?.careerLevel || "Not detected"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4 md:col-span-2 xl:col-span-1">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <MapPin className="h-4 w-4" />
                      Location
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{selectedResumeData?.location || "Not detected"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4 md:col-span-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <Link2 className="h-4 w-4" />
                      Links detected
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {detectedLinks.map((link) => (
                        <span key={String(link)} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                          {String(link)}
                        </span>
                      ))}
                      {detectedLinks.length === 0 ? <span className="text-sm text-slate-500">No links detected</span> : null}
                    </div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Industries and previous roles</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {[
                        ...normalizeStringList(selectedResumeData?.industries),
                        ...normalizeStringList(selectedResumeData?.previousRoles),
                      ].join(" • ") || "No industry or role history detected yet."}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4 md:col-span-2 xl:col-span-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Summary</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{selectedResumeData?.summary || "No summary detected yet."}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4 md:col-span-2 xl:col-span-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Skills</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {normalizeStringList(selectedResumeData?.skills).map((skill) => (
                        <span key={skill} className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                          {skill}
                        </span>
                      ))}
                      {normalizeStringList(selectedResumeData?.skills).length === 0 ? <span className="text-sm text-slate-500">No skills detected</span> : null}
                    </div>
                  </div>
                </div>

                {groupedSkills.length ? (
                  <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Skill groups</p>
                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      {groupedSkills.map((group) => (
                        <div key={group.key} className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-sm font-semibold text-slate-800">{group.label}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {group.items.map((item) => (
                              <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Education</p>
                    <div className="mt-4 space-y-3">
                      {((selectedResumeData?.education || []) as Array<Record<string, unknown>>).map((item, index) => (
                        <div key={`${String(item.institution || item.degree || "education")}-${index}`} className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-sm font-semibold text-slate-800">{String(item.institution || item.degree || "Education entry")}</p>
                          <p className="mt-1 text-sm text-slate-600">{describeEducation(item) || "Details not fully detected"}</p>
                        </div>
                      ))}
                      {((selectedResumeData?.education || []) as Array<Record<string, unknown>>).length === 0 ? (
                        <p className="text-sm text-slate-500">No education entries detected.</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Experience</p>
                    <div className="mt-4 space-y-3">
                      {((selectedResumeData?.experience || []) as Array<Record<string, unknown>>).map((item, index) => (
                        <div key={`${String(item.company || item.role || "experience")}-${index}`} className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-sm font-semibold text-slate-800">{String(item.role || "Experience entry")}</p>
                          <p className="mt-1 text-sm text-slate-600">{describeExperience(item) || "Details not fully detected"}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{String(item.description || "Description not detected")}</p>
                          {normalizeStringList(item.technologies).length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {normalizeStringList(item.technologies).map((technology) => (
                                <span key={technology} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                  {technology}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                      {((selectedResumeData?.experience || []) as Array<Record<string, unknown>>).length === 0 ? (
                        <p className="text-sm text-slate-500">No experience entries detected.</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Projects</p>
                    <div className="mt-4 space-y-3">
                      {((selectedResumeData?.projects || []) as Array<Record<string, unknown>>).map((item, index) => (
                        <div key={`${String(item.name || "project")}-${index}`} className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-sm font-semibold text-slate-800">{String(item.name || "Project entry")}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{String(item.description || "Description not detected")}</p>
                          <p className="mt-2 text-sm text-slate-600">{String(item.role || "")}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {normalizeStringList(item.technologies).map((technology) => (
                              <span key={technology} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {technology}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {((selectedResumeData?.projects || []) as Array<Record<string, unknown>>).length === 0 ? (
                        <p className="text-sm text-slate-500">No project entries detected.</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Additional information</p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Certifications</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {normalizeStringList(selectedResumeData?.certifications).map((item) => (
                            <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                              {item}
                            </span>
                          ))}
                          {normalizeStringList(selectedResumeData?.certifications).length === 0 ? <span className="text-sm text-slate-500">No certifications detected</span> : null}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Languages</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {normalizeStringList(selectedResumeData?.languages).map((item) => (
                            <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                              {item}
                            </span>
                          ))}
                          {normalizeStringList(selectedResumeData?.languages).length === 0 ? <span className="text-sm text-slate-500">No languages detected</span> : null}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Awards, publications, volunteer work</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {[
                            ...normalizeStringList(selectedResumeData?.awards),
                            ...normalizeStringList(selectedResumeData?.publications),
                            ...normalizeStringList(selectedResumeData?.volunteerExperience),
                          ].join(" • ") || "No additional entries detected."}
                        </p>
                      </div>
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
          <p className="mt-2 text-sm text-slate-600">Adjust the extracted details before applying them to your profile.</p>
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
            <div>
              <label className="label" htmlFor="confirmedProfessionalTitle">
                Professional title
              </label>
              <input
                className="input"
                id="confirmedProfessionalTitle"
                onChange={(event) => setConfirmedProfessionalTitle(event.target.value)}
                value={confirmedProfessionalTitle}
              />
            </div>
            <div>
              <label className="label" htmlFor="confirmedLocation">
                Location
              </label>
              <input className="input" id="confirmedLocation" onChange={(event) => setConfirmedLocation(event.target.value)} value={confirmedLocation} />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="confirmedSummary">
                Summary
              </label>
              <textarea className="input min-h-32" id="confirmedSummary" onChange={(event) => setConfirmedSummary(event.target.value)} value={confirmedSummary} />
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
