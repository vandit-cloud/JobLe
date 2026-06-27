import fs from "fs";
import { Application } from "../models/Application.js";
import { AssessmentAttempt } from "../models/AssessmentAttempt.js";
import { Candidate } from "../models/Candidate.js";
import { Resume } from "../models/Resume.js";
import { extractResumeProfile } from "../services/aiService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { resolveStoredResumePath } from "../utils/resumeStorage.js";

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
  const resumeUrl = `/uploads/resumes/${req.file.filename}`;
  const extractedData = await extractResumeProfile({
    filename: req.file.originalname,
    requiredSkills: candidate.skills || [],
  });
  const analysis = buildResumeAnalysis({
    ...extractedData,
    summary: candidate.summary,
  });

  if (existingCount === 0) {
    await Resume.updateMany({ candidateId: candidate._id, isDefault: true }, { isDefault: false });
  }

  const resume = await Resume.create({
    candidateId: candidate._id,
    originalName: req.file.originalname,
    privateFileKey: req.file.filename,
    resumeUrl,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    isDefault: existingCount === 0,
    processingStatus: "Completed",
    analysisStatus: "Completed",
    extractedData,
    confirmedData: {},
    analysis,
    visibility: {
      useForApplications: true,
      visibleAfterApplication: true,
      discoverableByVerifiedRecruiters: false,
      keepPrivate: true,
    },
    uploadedAt: new Date(),
  });

  if (resume.isDefault) {
    candidate.resumeUrl = resume.resumeUrl;
    await candidate.save();
  }

  res.status(201).json({ resume });
});

export const getCandidateResumeById = asyncHandler(async (req, res) => {
  const resume = await getCandidateResume(req.user.candidateId, req.params.resumeId);
  res.json({ resume });
});

export const streamCandidateResumeFile = asyncHandler(async (req, res) => {
  const resume = await getCandidateResume(req.user.candidateId, req.params.resumeId);
  const absolutePath = resolveStoredResumePath(resume.resumeUrl);

  if (!absolutePath) {
    throw new ApiError(400, "This resume file is not available for protected streaming");
  }

  if (!fs.existsSync(absolutePath)) {
    throw new ApiError(404, "Resume file not found");
  }

  res.sendFile(absolutePath);
});

export const deleteCandidateResume = asyncHandler(async (req, res) => {
  const resume = await getCandidateResume(req.user.candidateId, req.params.resumeId);
  const candidate = await Candidate.findById(req.user.candidateId);
  await Resume.deleteOne({ _id: resume._id });

  const absolutePath = resolveStoredResumePath(resume.resumeUrl);
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

  if (resume.isDefault && candidate) {
    const nextDefault = await Resume.findOne({ candidateId: req.user.candidateId }).sort({ uploadedAt: -1, createdAt: -1 });
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
  const baseSource = Object.keys(resume.confirmedData || {}).length > 0 ? resume.confirmedData : resume.extractedData;

  resume.analysis = buildResumeAnalysis({
    ...baseSource,
    summary: candidate?.summary || baseSource.summary,
  });
  resume.analysisStatus = "Completed";
  await resume.save();

  res.json({ analysis: resume.analysis, resume });
});

export const confirmCandidateResumeExtractedData = asyncHandler(async (req, res) => {
  const resume = await getCandidateResume(req.user.candidateId, req.params.resumeId);
  const candidate = await Candidate.findById(req.user.candidateId);
  if (!candidate) {
    throw new ApiError(404, "Candidate profile not found");
  }

  resume.confirmedData = req.body.confirmedData || {};
  resume.analysis = buildResumeAnalysis({
    ...resume.confirmedData,
    summary: candidate.summary || resume.confirmedData.summary,
  });
  resume.analysisStatus = "Completed";
  await resume.save();

  if (req.body.applyToProfile !== false) {
    const data = resume.confirmedData || {};
    candidate.name = data.name || candidate.name;
    candidate.phone = data.phone || candidate.phone;
    candidate.skills = Array.isArray(data.skills) && data.skills.length > 0 ? data.skills : candidate.skills;
    candidate.education = Array.isArray(data.education) ? data.education : candidate.education;
    candidate.experience = Array.isArray(data.experience) ? data.experience : candidate.experience;
    candidate.projects = Array.isArray(data.projects) ? data.projects : candidate.projects;
    candidate.certifications = Array.isArray(data.certifications) ? data.certifications : candidate.certifications;
    candidate.languages = Array.isArray(data.languages) ? data.languages : candidate.languages;
    if (resume.isDefault) {
      candidate.resumeUrl = resume.resumeUrl;
    }
    await candidate.save();
  }

  res.json({ resume, candidate });
});
