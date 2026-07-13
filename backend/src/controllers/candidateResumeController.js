import fs from "fs";
import path from "path";
import { Application } from "../models/Application.js";
import { Assessment } from "../models/Assessment.js";
import { AssessmentAttempt } from "../models/AssessmentAttempt.js";
import { Candidate } from "../models/Candidate.js";
import { Job } from "../models/Job.js";
import { Resume } from "../models/Resume.js";
import { analyzeCandidateMatch } from "../services/aiService.js";
import {
  assertCandidateStorageLimit,
  assertFailedUploadLimit,
  recordFailedResumeUpload,
  runCandidateResumeProcessingJob,
} from "../services/resumeAbuseProtectionService.js";
import { extractResumeProfileInWorker } from "../services/resumeProcessingWorkerService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { inspectResumeUpload } from "../utils/resumeUploadInspection.js";
import { buildResumeStorageUrl, getResumeStorageDir, resolveStoredResumePath } from "../utils/resumeStorage.js";

const MAX_RESUMES_PER_CANDIDATE = 5;
const MAX_ANALYSIS_RETRIES_PER_RESUME = 3;

function getRequestIp(req) {
  return req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
}

function addResumeAccessEvent(resume, { req, actorRole, action, reasonCode = "" }) {
  resume.accessLog.push({
    actorRole,
    actorId: String(req.user?.userId || req.user?.candidateId || req.user?.recruiterId || ""),
    action,
    ipAddress: String(getRequestIp(req)),
    reasonCode,
    accessedAt: new Date(),
  });
}

function addResumeSecurityEvent(resume, { eventType, status, reasonCode = "", message = "", details = {} }) {
  resume.securityEvents.push({
    eventType,
    status,
    reasonCode,
    message,
    details,
    createdAt: new Date(),
  });
}

function moveUploadedFile(sourcePath, zone, filename = path.basename(sourcePath || "")) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return "";
  }

  const destinationPath = path.join(getResumeStorageDir(zone), path.basename(filename));
  fs.renameSync(sourcePath, destinationPath);
  return destinationPath;
}

function isCleanConfirmedResume(resume) {
  return resume?.securityStatus === "CLEAN" && resume?.confirmationStatus === "CONFIRMED" && resume?.storageZone === "clean";
}

async function findNextUsableDefaultResume(candidateId) {
  return Resume.findOne({
    candidateId,
    securityStatus: "CLEAN",
    confirmationStatus: "CONFIRMED",
    storageZone: "clean",
  }).sort({ uploadedAt: -1, createdAt: -1 });
}

function buildResumeAnalysis(source = {}) {
  const summaryLength = String(source.summary || "").trim().length;
  const skillsCount = (source.skills || []).length;
  const experienceCount = (source.experience || []).length;
  const projectsCount = (source.projects || []).length;
  const educationCount = (source.education || []).length;

  const sectionScores = {
    summary: Math.min(100, summaryLength > 120 ? 82 : summaryLength > 40 ? 68 : 48),
    skills: Math.min(100, 45 + skillsCount * 8),
    experience: Math.min(100, 40 + experienceCount * 18),
    projects: Math.min(100, 40 + projectsCount * 18),
    education: Math.min(100, 45 + educationCount * 20),
  };

  const overallScore = Math.round(
    (sectionScores.summary + sectionScores.skills + sectionScores.experience + sectionScores.projects + sectionScores.education) / 5,
  );

  const strengths = [];
  const improvements = [];

  if (sectionScores.skills >= 75) strengths.push("Strong visible skills coverage");
  if (sectionScores.experience >= 75) strengths.push("Work experience is clearly represented");
  if (sectionScores.projects >= 75) strengths.push("Projects add practical evidence");
  if (sectionScores.summary < 65) improvements.push("Add a clearer professional summary with outcomes and focus areas");
  if (sectionScores.skills < 70) improvements.push("Add more role-relevant technical and domain skills");
  if (sectionScores.projects < 70) improvements.push("Include more projects or measurable project achievements");

  return {
    overallScore,
    sectionScores,
    strengths,
    improvements,
    recommendedRoles: (source.skills || []).slice(0, 3),
    suggestedKeywords: (source.skills || []).slice(0, 8),
    updatedAt: new Date(),
  };
}

function getTotalExperienceYears(source = {}) {
  if (Number(source.totalExperienceYears || 0) > 0) {
    return Number(source.totalExperienceYears);
  }

  return (source.experience || []).reduce((total, item) => total + Number(item?.years || 0), 0);
}

function buildCandidateSnapshot(source = {}, fallbackCandidate = null) {
  const totalExperienceYears = getTotalExperienceYears(source) || getTotalExperienceYears(fallbackCandidate || {});
  const experience = Array.isArray(source.experience) && source.experience.length > 0 ? source.experience : fallbackCandidate?.experience || [];

  return {
    skills: Array.isArray(source.skills) && source.skills.length > 0 ? source.skills : fallbackCandidate?.skills || [],
    experience: experience.length > 0 ? experience : totalExperienceYears > 0 ? [{ years: totalExperienceYears }] : [],
    education: Array.isArray(source.education) ? source.education : fallbackCandidate?.education || [],
    projects: Array.isArray(source.projects) ? source.projects : fallbackCandidate?.projects || [],
    location: source.location || fallbackCandidate?.location || "",
    totalExperienceYears,
  };
}

function buildExperienceReadiness({ totalExperienceYears, minimumExperience, maximumExperience }) {
  if (minimumExperience && totalExperienceYears < minimumExperience) {
    return `Needs ${minimumExperience - totalExperienceYears} more year${minimumExperience - totalExperienceYears === 1 ? "" : "s"} for this level`;
  }

  if (maximumExperience && totalExperienceYears > maximumExperience) {
    return "More experienced than the typical range";
  }

  return "Experience looks aligned";
}

async function buildResumeRoleRecommendations(source = {}, fallbackCandidate = null) {
  const candidateSnapshot = buildCandidateSnapshot(source, fallbackCandidate);
  const jobs = await Job.find({
    status: "Published",
    deletedAt: null,
    $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }],
  })
    .populate("companyId")
    .sort({ publishedAt: -1 })
    .limit(24);

  if (!jobs.length) {
    return [];
  }

  const jobMatches = await Promise.all(
    jobs.map(async (job) => ({
      job,
      match: await analyzeCandidateMatch({ candidate: candidateSnapshot, job }),
    })),
  );

  const assessments = await Assessment.find({
    status: "Published",
    deletedAt: null,
    jobId: { $in: jobs.map((job) => job._id) },
  }).select("jobId title experienceLevel totalDuration");

  const grouped = new Map();

  for (const { job, match } of jobMatches) {
    const roleKey = String(job.title || "").trim().toLowerCase();
    if (!roleKey) {
      continue;
    }

    const recommendedAssessment = assessments.find((assessment) => assessment.jobId?.toString() === job._id.toString()) || null;
    const opening = {
      jobId: job._id.toString(),
      title: job.title,
      companyName: job.companyId?.name || "Company",
      location: job.location,
      workplaceType: job.workplaceType,
      matchScore: match.overallScore,
    };

    if (!grouped.has(roleKey)) {
      grouped.set(roleKey, {
        roleTitle: job.title,
        score: match.overallScore,
        matchingSkills: [...match.matchedSkills],
        missingSkills: [...match.missingSkills],
        experienceReadiness: buildExperienceReadiness({
          totalExperienceYears: candidateSnapshot.totalExperienceYears,
          minimumExperience: Number(job.minimumExperience || 0),
          maximumExperience: Number(job.maximumExperience || 0),
        }),
        recommendedAssessment: recommendedAssessment
          ? {
              assessmentId: recommendedAssessment._id.toString(),
              title: recommendedAssessment.title,
              experienceLevel: recommendedAssessment.experienceLevel,
              totalDuration: recommendedAssessment.totalDuration,
            }
          : null,
        suitableJobOpenings: [opening],
      });
      continue;
    }

    const current = grouped.get(roleKey);
    current.score = Math.max(current.score, match.overallScore);
    current.matchingSkills = [...new Set([...current.matchingSkills, ...match.matchedSkills])];
    current.missingSkills = [...new Set([...current.missingSkills, ...match.missingSkills])];
    current.suitableJobOpenings.push(opening);
    if (!current.recommendedAssessment && recommendedAssessment) {
      current.recommendedAssessment = {
        assessmentId: recommendedAssessment._id.toString(),
        title: recommendedAssessment.title,
        experienceLevel: recommendedAssessment.experienceLevel,
        totalDuration: recommendedAssessment.totalDuration,
      };
    }
  }

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      suitableJobOpenings: item.suitableJobOpenings
        .sort((left, right) => right.matchScore - left.matchScore)
        .slice(0, 3),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);
}

function hasMeaningfulResumeExtraction(extractedData = {}, originalName = "") {
  const normalizedName = String(originalName || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .trim()
    .toLowerCase();
  const extractedName = String(extractedData.name || "").trim().toLowerCase();

  return Boolean(
    extractedData.email ||
      extractedData.phone ||
      String(extractedData.summary || "").trim() ||
      (extractedData.education || []).length ||
      (extractedData.experience || []).length ||
      (extractedData.projects || []).length ||
      (extractedData.skills || []).length > 3 ||
      (extractedName && extractedName !== normalizedName),
  );
}

function syncResumeOutcome({ resume, extractedData, originalName, warnings = [] }) {
  const extractionSucceeded = hasMeaningfulResumeExtraction(extractedData, originalName);
  const extractionWarnings = [...warnings];

  if (!extractionSucceeded) {
    extractionWarnings.push("We couldn't confidently extract enough details from this file. Review the resume manually or retry extraction.");
  }

  resume.uploadWarnings = [...new Set(extractionWarnings)];
  resume.uploadChecks = {
    ...(resume.uploadChecks || {}),
    extractedTextAvailable: extractionSucceeded,
  };
  resume.processingStatus = "Waiting for Candidate Review";
  resume.securityStatus = "WAITING_FOR_CONFIRMATION";
  resume.analysisStatus = extractionSucceeded ? "Analysis Completed" : "Analysis Failed";
  resume.extractionError = extractionSucceeded ? "" : "Low-confidence extraction";

  return extractionSucceeded;
}

function removeUploadedFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }

  try {
    fs.unlinkSync(filePath);
  } catch (_error) {
    // Ignore cleanup errors for temporary rejected uploads.
  }
}

async function getCandidateResume(candidateId, resumeId) {
  const resume = await Resume.findOne({ _id: resumeId, candidateId });
  if (!resume) {
    throw new ApiError(404, "Resume not found");
  }
  return resume;
}

export const getCandidateResumes = asyncHandler(async (req, res) => {
  const resumes = await Resume.find({ candidateId: req.user.candidateId }).sort({ uploadedAt: -1, createdAt: -1 });
  res.json({ items: resumes });
});

export const uploadCandidateResumeVersion = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Resume file is required");
  }

  const candidate = await Candidate.findById(req.user.candidateId);
  if (!candidate) {
    throw new ApiError(404, "Candidate profile not found");
  }

  const existingCount = await Resume.countDocuments({ candidateId: candidate._id });
  if (existingCount >= MAX_RESUMES_PER_CANDIDATE) {
    removeUploadedFile(req.file.path);
    throw new ApiError(429, "Too many resume uploads. Please try again later.", { code: "RESUME_UPLOAD_LIMIT_REACHED" });
  }
  assertFailedUploadLimit(getRequestIp(req));
  await assertCandidateStorageLimit(candidate._id, req.file.size);

  const inspection = await inspectResumeUpload({
    filePath: req.file.path,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
  });

  if (inspection.rejected) {
    recordFailedResumeUpload(getRequestIp(req));
    moveUploadedFile(req.file.path, "rejected");
    throw new ApiError(400, inspection.rejectionMessage || "This file failed our security checks. Please upload a new PDF or DOCX resume.");
  }

  const existingDuplicate = await Resume.findOne({
    candidateId: candidate._id,
    fileHash: inspection.fileHash,
  }).sort({ uploadedAt: -1, createdAt: -1 });

  if (existingDuplicate) {
    removeUploadedFile(req.file.path);
    throw new ApiError(409, "This resume matches a version you already uploaded.");
  }

  const cleanPath = moveUploadedFile(req.file.path, "clean");
  const cleanFileKey = path.basename(cleanPath || req.file.filename);
  const resumeUrl = buildResumeStorageUrl("clean", cleanFileKey);
  const extractedData = await runCandidateResumeProcessingJob(candidate._id, () =>
    extractResumeProfileInWorker({
      filename: req.file.originalname,
      filePath: cleanPath,
      mimeType: req.file.mimetype,
      requiredSkills: candidate.skills || [],
    }),
  );
  const analysisSource = {
    ...extractedData,
    summary: candidate.summary || extractedData.summary,
  };
  const analysis = buildResumeAnalysis(analysisSource);
  analysis.roleRecommendations = await buildResumeRoleRecommendations(analysisSource, candidate);

  if (existingCount === 0) {
    await Resume.updateMany({ candidateId: candidate._id, isDefault: true }, { isDefault: false });
  }

  const resume = await Resume.create({
    candidateId: candidate._id,
    originalName: req.file.originalname,
    privateFileKey: cleanFileKey,
    quarantineFileKey: req.file.filename,
    cleanFileKey,
    resumeUrl,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    fileHash: inspection.fileHash,
    pageCount: inspection.pageCount,
    isDefault: existingCount === 0,
    storageZone: "clean",
    securityStatus: "EXTRACTING",
    confirmationStatus: "PENDING",
    processingStatus: "Processing",
    analysisStatus: "Processing",
    uploadWarnings: inspection.warnings,
    uploadChecks: inspection.uploadChecks,
    extractedData,
    extractionError: "",
    confirmedData: {},
    analysis,
    visibility: {
      useForApplications: true,
      visibleAfterApplication: true,
      discoverableByVerifiedRecruiters: false,
      keepPrivate: true,
    },
    uploadedAt: new Date(),
    sanitizedAt: new Date(),
    securityEvents: inspection.securityEvents,
  });

  syncResumeOutcome({
    resume,
    extractedData,
    originalName: req.file.originalname,
    warnings: inspection.warnings,
  });
  await resume.save();

  res.status(201).json({ resume });
});

export const getCandidateResumeById = asyncHandler(async (req, res) => {
  const resume = await getCandidateResume(req.user.candidateId, req.params.resumeId);
  res.json({ resume });
});

export const streamCandidateResumeFile = asyncHandler(async (req, res) => {
  const resume = await getCandidateResume(req.user.candidateId, req.params.resumeId);
  if (resume.storageZone !== "clean" || resume.securityStatus === "REJECTED") {
    throw new ApiError(403, "This resume is not available for preview.");
  }

  const absolutePath = resolveStoredResumePath(resume.resumeUrl);

  if (!absolutePath) {
    throw new ApiError(400, "This resume file is not available for protected streaming");
  }

  if (!fs.existsSync(absolutePath)) {
    throw new ApiError(404, "Resume file not found");
  }

  addResumeAccessEvent(resume, { req, actorRole: "candidate", action: "candidate_view" });
  addResumeSecurityEvent(resume, {
    eventType: "Resume downloaded",
    status: resume.securityStatus,
    reasonCode: "CANDIDATE_FILE_STREAM",
  });
  await resume.save();

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.sendFile(absolutePath);
});

export const deleteCandidateResume = asyncHandler(async (req, res) => {
  const resume = await getCandidateResume(req.user.candidateId, req.params.resumeId);
  const candidate = await Candidate.findById(req.user.candidateId);
  await Resume.deleteOne({ _id: resume._id });

  const absolutePath = resolveStoredResumePath(resume.resumeUrl);
  const quarantinePath = resume.quarantineFileKey ? path.join(getResumeStorageDir("quarantine"), path.basename(resume.quarantineFileKey)) : "";
  const rejectedPath = resume.rejectedFileKey ? path.join(getResumeStorageDir("rejected"), path.basename(resume.rejectedFileKey)) : "";
  const [applicationReferenceCount, attemptReferenceCount] = await Promise.all([
    Application.countDocuments({ candidateId: req.user.candidateId, resumeUrl: resume.resumeUrl }),
    AssessmentAttempt.countDocuments({ candidateId: req.user.candidateId, "candidateProfile.resumeUrl": resume.resumeUrl }),
  ]);

  if (absolutePath && fs.existsSync(absolutePath) && applicationReferenceCount === 0 && attemptReferenceCount === 0) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (_error) {
      // Keep the DB operation successful even if local cleanup fails.
    }
  }

  for (const extraPath of [quarantinePath, rejectedPath]) {
    if (extraPath && fs.existsSync(extraPath)) {
      removeUploadedFile(extraPath);
    }
  }

  if (resume.isDefault && candidate) {
    const nextDefault = await findNextUsableDefaultResume(req.user.candidateId);
    if (nextDefault) {
      nextDefault.isDefault = true;
      await nextDefault.save();
      candidate.resumeUrl = nextDefault.resumeUrl;
    } else {
      candidate.resumeUrl = "";
    }
    await candidate.save();
  }

  res.json({ message: "Resume deleted successfully." });
});

export const setDefaultCandidateResume = asyncHandler(async (req, res) => {
  const resume = await getCandidateResume(req.user.candidateId, req.params.resumeId);
  const candidate = await Candidate.findById(req.user.candidateId);
  if (!candidate) {
    throw new ApiError(404, "Candidate profile not found");
  }

  if (!isCleanConfirmedResume(resume)) {
    throw new ApiError(400, "Confirm a clean resume before setting it as your default application resume.");
  }

  await Resume.updateMany({ candidateId: req.user.candidateId, isDefault: true }, { isDefault: false });
  resume.isDefault = true;
  await resume.save();

  candidate.resumeUrl = resume.resumeUrl;
  await candidate.save();

  res.json({ resume });
});

export const analyzeCandidateResume = asyncHandler(async (req, res) => {
  const resume = await getCandidateResume(req.user.candidateId, req.params.resumeId);
  const candidate = await Candidate.findById(req.user.candidateId);
  if (resume.securityStatus === "REJECTED" || resume.storageZone !== "clean") {
    throw new ApiError(403, "This file failed our security checks. Please upload a new PDF or DOCX resume.");
  }

  const retryCount = (resume.securityEvents || []).filter((event) => event.eventType === "AI analysis retry").length;
  if (retryCount >= MAX_ANALYSIS_RETRIES_PER_RESUME) {
    throw new ApiError(429, "You have reached the retry limit for this resume.");
  }

  const absolutePath = resolveStoredResumePath(resume.resumeUrl);

  if (absolutePath && fs.existsSync(absolutePath)) {
    addResumeSecurityEvent(resume, {
      eventType: "AI analysis retry",
      status: "EXTRACTING",
      reasonCode: "CANDIDATE_RETRY",
    });
    resume.extractedData = await runCandidateResumeProcessingJob(resume.candidateId, () =>
      extractResumeProfileInWorker({
        filename: resume.originalName,
        filePath: absolutePath,
        mimeType: resume.mimeType,
        requiredSkills: candidate?.skills || [],
      }),
    );
  }

  syncResumeOutcome({
    resume,
    extractedData: resume.extractedData,
    originalName: resume.originalName,
    warnings: resume.uploadWarnings || [],
  });

  const baseSource = Object.keys(resume.confirmedData || {}).length > 0 ? resume.confirmedData : resume.extractedData;

  const analysisSource = {
    ...baseSource,
    summary: candidate?.summary || baseSource.summary,
  };
  resume.analysis = buildResumeAnalysis(analysisSource);
  resume.analysis.roleRecommendations = await buildResumeRoleRecommendations(analysisSource, candidate);
  resume.analysisStatus = resume.analysisStatus === "Analysis Failed" ? "Analysis Failed" : "Analysis Completed";
  await resume.save();

  res.json({ analysis: resume.analysis, resume });
});

export const confirmCandidateResumeExtractedData = asyncHandler(async (req, res) => {
  const resume = await getCandidateResume(req.user.candidateId, req.params.resumeId);
  const candidate = await Candidate.findById(req.user.candidateId);
  if (!candidate) {
    throw new ApiError(404, "Candidate profile not found");
  }

  if (resume.securityStatus === "REJECTED" || resume.storageZone !== "clean") {
    throw new ApiError(403, "This file failed our security checks. Please upload a new PDF or DOCX resume.");
  }

  resume.confirmedData = req.body.confirmedData || {};
  const analysisSource = {
    ...resume.confirmedData,
    summary: candidate.summary || resume.confirmedData.summary,
  };
  resume.analysis = buildResumeAnalysis(analysisSource);
  resume.analysis.roleRecommendations = await buildResumeRoleRecommendations(analysisSource, candidate);
  resume.processingStatus = "Extraction Completed";
  resume.securityStatus = "CLEAN";
  resume.confirmationStatus = "CONFIRMED";
  resume.analysisStatus = "Analysis Completed";
  addResumeSecurityEvent(resume, {
    eventType: "Resume marked clean",
    status: "CLEAN",
    reasonCode: "CANDIDATE_CONFIRMED",
  });
  await resume.save();

  if (req.body.applyToProfile !== false) {
    const data = resume.confirmedData || {};
    candidate.name = data.name || candidate.name;
    candidate.phone = data.phone || candidate.phone;
    candidate.professionalTitle = data.professionalTitle || candidate.professionalTitle;
    candidate.summary = data.summary || candidate.summary;
    candidate.location = data.location || candidate.location;
    candidate.city = data.city || candidate.city;
    candidate.state = data.state || candidate.state;
    candidate.country = data.country || candidate.country;
    candidate.skills = Array.isArray(data.skills) && data.skills.length > 0 ? data.skills : candidate.skills;
    candidate.education = Array.isArray(data.education) ? data.education : candidate.education;
    candidate.experience = Array.isArray(data.experience) ? data.experience : candidate.experience;
    candidate.projects = Array.isArray(data.projects) ? data.projects : candidate.projects;
    candidate.certifications = Array.isArray(data.certifications) ? data.certifications : candidate.certifications;
    candidate.languages = Array.isArray(data.languages) ? data.languages : candidate.languages;
    if (data.socialLinks && typeof data.socialLinks === "object") {
      candidate.socialLinks = {
        ...(candidate.socialLinks?.toObject?.() || candidate.socialLinks || {}),
        ...data.socialLinks,
        other: Array.isArray(data.socialLinks.other) ? data.socialLinks.other : candidate.socialLinks?.other || [],
      };
    }
    if (resume.isDefault) {
      candidate.resumeUrl = resume.resumeUrl;
    }
    await candidate.save();
  }

  res.json({ resume, candidate });
});
