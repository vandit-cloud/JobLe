import fs from "fs";
import path from "path";
import { Assessment } from "../models/Assessment.js";
import { AssessmentAttempt } from "../models/AssessmentAttempt.js";
import { AssessmentInvitation } from "../models/AssessmentInvitation.js";
import { Candidate } from "../models/Candidate.js";
import { IntegrityEvent } from "../models/IntegrityEvent.js";
import { assertFailedUploadLimit, recordFailedResumeUpload } from "../services/resumeAbuseProtectionService.js";
import { extractResumeProfileInWorker } from "../services/resumeProcessingWorkerService.js";
import { sendAssessmentSubmitted } from "../services/emailService.js";
import { enforcePlanLimit, recordUsage } from "../services/planLimitService.js";
import { runCodeSubmission } from "../services/codeExecutionService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { inspectResumeUpload } from "../utils/resumeUploadInspection.js";
import { buildResumeStorageUrl, getResumeStorageDir } from "../utils/resumeStorage.js";

async function getInvitationByToken(invitationToken) {
  const invitation = await AssessmentInvitation.findOne({ invitationToken }).populate("assessmentId jobId candidateId");
  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
  }
  if (invitation.status === "Cancelled") {
    throw new ApiError(410, "This invitation has been cancelled.");
  }
  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    invitation.status = "Expired";
    await invitation.save();
    throw new ApiError(410, "This invitation has expired.");
  }
  return invitation;
}

function updateIntegritySummary(summary, eventType) {
  const next = {
    ...summary.toObject?.() || summary,
  };
  next.totalFlags = (next.totalFlags || 0) + 1;
  const keyMap = {
    "Tab switched": "tabSwitches",
    "Window focus lost": "focusLosses",
    "Full-screen exited": "fullScreenExits",
    "Copy attempted": "copyAttempts",
    "Paste attempted": "pasteAttempts",
    "Camera interrupted": "cameraInterruptions",
    "Candidate not visible": "candidateAbsenceFlags",
    "Multiple people visible": "multiplePeopleFlags",
    "Device changed": "deviceChanges",
    "IP changed": "ipChanges",
    "Code similarity detected": "codeSimilarityFlags",
  };
  const counterKey = keyMap[eventType];
  if (counterKey) {
    next[counterKey] = (next[counterKey] || 0) + 1;
  }
  next.status = next.totalFlags >= 8 ? "High Number of Flags" : next.totalFlags >= 4 ? "Review Recommended" : next.totalFlags >= 1 ? "Low Concern" : "No Significant Flags";
  return next;
}

function scoreAttempt(assessment, attempt) {
  const sectionResults = assessment.sections.map((section) => {
    let sectionScore = 0;
    for (const question of section.questions) {
      const answer = attempt.answers.find((item) => item.questionId.toString() === question._id.toString());
      if (!answer) continue;
      if (question.questionType === "MCQ") {
        const selected = [...(answer.selectedOptionIds || [])].sort().join("|");
        const expected = [...(question.correctOptionIds || [])].sort().join("|");
        answer.score = selected === expected ? question.marks : section.negativeMarking ? -Math.abs(question.negativeMarks || 0) : 0;
      } else if (question.questionType === "Coding Test") {
        const result = answer.codingSubmission?.executionResults;
        const passed = result?.passedTestCases || 0;
        const total = result?.totalTestCases || 1;
        answer.score = Math.round((passed / total) * question.marks);
      } else if (answer.score === undefined || answer.score === null) {
        answer.aiSuggestedScore = Math.round(question.marks * 0.6);
        answer.score = answer.aiSuggestedScore;
      }
      sectionScore += Number(answer.score || 0);
    }
    return {
      sectionId: section._id,
      title: section.title,
      score: sectionScore,
      totalMarks: section.totalMarks,
    };
  });

  const totalScore = sectionResults.reduce((sum, item) => sum + item.score, 0);
  const passingStatus = totalScore >= Math.round((assessment.passingPercentage / 100) * assessment.totalMarks);

  return {
    sectionResults,
    totalScore,
    passingStatus,
  };
}

function moveAssessmentResumeFile(sourcePath, zone) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return "";
  }

  const destinationPath = path.join(getResumeStorageDir(zone), path.basename(sourcePath));
  fs.renameSync(sourcePath, destinationPath);
  return destinationPath;
}

export const getCandidateAssessmentContext = asyncHandler(async (req, res) => {
  const invitation = await getInvitationByToken(req.params.invitationToken);
  const assessment = invitation.assessmentId;
  const existingAttempt = await AssessmentAttempt.findOne({ invitationId: invitation._id }).sort({ attemptNumber: -1 });
  if (invitation.status === "Sent") {
    invitation.status = "Opened";
    invitation.openedAt = new Date();
    await invitation.save();
  }

  res.json({
    invitation: {
      id: invitation._id,
      status: invitation.status,
      candidateEmail: invitation.candidateEmail,
      candidateName: invitation.candidateName,
      maxAttempts: invitation.maxAttempts,
      attemptsUsed: invitation.attemptsUsed,
      expiresAt: invitation.expiresAt,
    },
    assessment: {
      id: assessment._id,
      title: assessment.title,
      category: assessment.category,
      experienceLevel: assessment.experienceLevel,
      candidateInstructions: assessment.candidateInstructions,
      sections: assessment.sections,
      settings: assessment.settings,
      integritySettings: assessment.integritySettings,
      resultVisibility: assessment.resultVisibility,
      resumeMatchSettings: assessment.resumeMatchSettings,
    },
    existingAttempt,
  });
});

export const verifyCandidateInvitation = asyncHandler(async (req, res) => {
  const invitation = await getInvitationByToken(req.params.invitationToken);
  if (req.body.email !== invitation.candidateEmail || req.body.code !== invitation.emailVerificationCode) {
    throw new ApiError(400, "Invalid verification details");
  }
  invitation.emailVerifiedAt = new Date();
  await invitation.save();
  res.json({ verified: true });
});

export const uploadCandidateResume = asyncHandler(async (req, res) => {
  const invitation = await getInvitationByToken(req.params.invitationToken);
  if (!req.file) throw new ApiError(400, "Resume file is required");
  await enforcePlanLimit({
    organizationId: invitation.organizationId,
    resourceType: "resumeAnalyses",
    message: "Your resume analysis limit has been reached.",
  });
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
  assertFailedUploadLimit(ipAddress);
  const inspection = await inspectResumeUpload({
    filePath: req.file.path,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
  });

  if (inspection.rejected) {
    recordFailedResumeUpload(ipAddress);
    moveAssessmentResumeFile(req.file.path, "rejected");
    throw new ApiError(400, inspection.rejectionMessage || "This file failed our security checks. Please upload a new PDF or DOCX resume.");
  }

  const cleanPath = moveAssessmentResumeFile(req.file.path, "clean");
  const resumeUrl = buildResumeStorageUrl("clean", path.basename(cleanPath || req.file.filename));
  const profile = await extractResumeProfileInWorker({
    filename: req.file.originalname || req.file.filename,
    filePath: cleanPath,
    mimeType: req.file.mimetype,
    requiredSkills: invitation.assessmentId.resumeMatchSettings?.requiredSkills || [],
  });
  invitation.status = "Resume Submitted";
  invitation.resumeSubmittedAt = new Date();
  await invitation.save();
  await recordUsage({
    organizationId: invitation.organizationId,
    resourceType: "resumeAnalyses",
    quantity: 1,
  });
  res.json({
    profile: {
      ...profile,
      resumeUrl,
    },
    warning: "Protected personal characteristics are excluded from resume matching.",
  });
});

export const updateCandidateProfile = asyncHandler(async (req, res) => {
  const invitation = await getInvitationByToken(req.params.invitationToken);
  let candidate = invitation.candidateId;
  if (!candidate) {
    candidate = await Candidate.findOne({ email: req.body.email });
  }
  if (!candidate) {
    candidate = await Candidate.create({
      ...req.body,
      resumeUrl: req.body.resumeUrl || "",
      availability: "Immediate",
    });
    invitation.candidateId = candidate._id;
  } else {
    Object.assign(candidate, req.body);
    await candidate.save();
  }
  await invitation.save();
  res.json({ candidate });
});

export const startCandidateAssessment = asyncHandler(async (req, res) => {
  const invitation = await getInvitationByToken(req.params.invitationToken);
  if (invitation.attemptsUsed >= invitation.maxAttempts) {
    throw new ApiError(403, "Maximum attempts reached");
  }

  const existingOpenAttempt = await AssessmentAttempt.findOne({
    invitationId: invitation._id,
    status: "In Progress",
  });
  if (existingOpenAttempt) {
    return res.json({ attempt: existingOpenAttempt });
  }

  const candidate = invitation.candidateId ? await Candidate.findById(invitation.candidateId) : null;
  const attempt = await AssessmentAttempt.create({
    organizationId: invitation.organizationId,
    recruiterId: invitation.recruiterId,
    assessmentId: invitation.assessmentId._id,
    invitationId: invitation._id,
    candidateId: candidate?._id || null,
    candidateProfile: candidate
      ? {
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          skills: candidate.skills,
          education: candidate.education,
          experience: candidate.experience,
          projects: candidate.projects,
          certifications: candidate.certifications,
          resumeUrl: candidate.resumeUrl,
        }
      : {
          name: invitation.candidateName,
          email: invitation.candidateEmail,
        },
    resumeMatch: {
      status: "Partial Match",
      score: 0,
      matchedSkills: [],
      missingSkills: [],
      explanation: "Resume match will be finalized after profile review.",
    },
    attemptNumber: invitation.attemptsUsed + 1,
    status: "In Progress",
    startedAt: new Date(),
    activityTimeline: [{ label: "Assessment started", metadata: {} }],
  });

  invitation.attemptsUsed += 1;
  invitation.status = "Started";
  invitation.startedAt = new Date();
  await invitation.save();

  res.status(201).json({ attempt });
});

export const saveCandidateAnswer = asyncHandler(async (req, res) => {
  const invitation = await getInvitationByToken(req.params.invitationToken);
  const attempt = await AssessmentAttempt.findOne({
    _id: req.body.attemptId,
    invitationId: invitation._id,
  });
  if (!attempt) throw new ApiError(404, "Attempt not found");

  const existing = attempt.answers.find((item) => item.questionId.toString() === req.body.questionId);
  if (existing) {
    existing.answerText = req.body.answerText || existing.answerText;
    existing.selectedOptionIds = req.body.selectedOptionIds || existing.selectedOptionIds;
    existing.savedAt = new Date();
    if (req.body.code) {
      existing.codingSubmission = {
        ...(existing.codingSubmission || {}),
        code: req.body.code,
        programmingLanguage: req.body.programmingLanguage,
      };
    }
  } else {
    attempt.answers.push({
      questionId: req.body.questionId,
      sectionId: req.body.sectionId,
      questionType: req.body.questionType,
      answerText: req.body.answerText,
      selectedOptionIds: req.body.selectedOptionIds,
      codingSubmission: req.body.code
        ? {
            code: req.body.code,
            programmingLanguage: req.body.programmingLanguage,
            submissionHistory: [],
          }
        : undefined,
      savedAt: new Date(),
    });
  }
  await attempt.save();
  res.json({ saved: true, attempt });
});

export const runCandidateCode = asyncHandler(async (req, res) => {
  const invitation = await getInvitationByToken(req.params.invitationToken);
  await enforcePlanLimit({
    organizationId: invitation.organizationId,
    resourceType: "codingExecutions",
    message: "Your coding execution limit has been reached.",
  });
  const attempt = await AssessmentAttempt.findOne({
    _id: req.body.attemptId,
    invitationId: invitation._id,
  });
  if (!attempt) throw new ApiError(404, "Attempt not found");
  const assessment = await Assessment.findById(invitation.assessmentId._id);
  const question = assessment.sections.flatMap((section) => section.questions).find((item) => item._id.toString() === req.body.questionId);
  if (!question) throw new ApiError(404, "Question not found");

  const submission = await runCodeSubmission({
    code: req.body.code,
    language: req.body.programmingLanguage,
    visibleTestCases: question.visibleTestCases,
  });
  let answer = attempt.answers.find((item) => item.questionId.toString() === req.body.questionId);
  if (!answer) {
    answer = {
      questionId: req.body.questionId,
      sectionId: req.body.sectionId,
      questionType: "Coding Test",
      savedAt: new Date(),
    };
    attempt.answers.push(answer);
    answer = attempt.answers[attempt.answers.length - 1];
  }

  answer.codingSubmission = {
    programmingLanguage: req.body.programmingLanguage,
    code: req.body.code,
    executionResults: submission.executionResults,
    submissionHistory: [
      ...(answer.codingSubmission?.submissionHistory || []),
      {
        code: req.body.code,
        language: req.body.programmingLanguage,
        submittedAt: new Date(),
        passedTestCases: submission.executionResults.passedTestCases,
        failedTestCases: submission.executionResults.failedTestCases,
      },
    ],
    codeSimilarityWarning: false,
  };
  await attempt.save();
  await recordUsage({
    organizationId: invitation.organizationId,
    resourceType: "codingExecutions",
    quantity: 1,
  });
  res.json(submission);
});

export const recordCandidateIntegrityEvent = asyncHandler(async (req, res) => {
  const invitation = await getInvitationByToken(req.params.invitationToken);
  const attempt = await AssessmentAttempt.findOne({
    _id: req.body.attemptId,
    invitationId: invitation._id,
  });
  if (!attempt) throw new ApiError(404, "Attempt not found");
  const event = await IntegrityEvent.create({
    organizationId: invitation.organizationId,
    invitationId: invitation._id,
    attemptId: attempt._id,
    eventType: req.body.eventType,
    severity: req.body.severity || "info",
    metadata: req.body.metadata || {},
  });
  attempt.integritySummary = updateIntegritySummary(attempt.integritySummary, req.body.eventType);
  attempt.activityTimeline.push({
    label: req.body.eventType,
    metadata: req.body.metadata || {},
  });
  await attempt.save();
  res.status(201).json({ event, integritySummary: attempt.integritySummary });
});

export const submitCandidateAssessment = asyncHandler(async (req, res) => {
  const invitation = await getInvitationByToken(req.params.invitationToken);
  const attempt = await AssessmentAttempt.findOne({
    invitationId: invitation._id,
    status: "In Progress",
  });
  if (!attempt) throw new ApiError(404, "Active attempt not found");
  const assessment = await Assessment.findById(invitation.assessmentId._id);
  const scored = scoreAttempt(assessment, attempt);
  attempt.sectionResults = scored.sectionResults;
  attempt.totalScore = scored.totalScore;
  attempt.passingStatus = scored.passingStatus;
  attempt.recruiterRecommendation = scored.totalScore >= 85 ? "Strong technical performance" : "Recruiter review recommended";
  attempt.status = "Submitted";
  attempt.submittedAt = new Date();
  attempt.completionTimeMinutes = Math.max(1, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 60000));
  attempt.activityTimeline.push({ label: "Assessment submitted", metadata: {} });
  await attempt.save();
  invitation.status = "Completed";
  invitation.completedAt = new Date();
  await invitation.save();
  sendAssessmentSubmitted(invitation, attempt, assessment).catch(console.error);
  res.json({
    attempt,
    resultVisibility: assessment.resultVisibility,
  });
});

export const getCandidateAssessmentResult = asyncHandler(async (req, res) => {
  const attempt = await AssessmentAttempt.findById(req.params.attemptId).populate("assessmentId invitationId candidateId");
  if (!attempt) throw new ApiError(404, "Assessment result not found");

  const invitationToken = req.headers["x-invitation-token"];
  const byCandidateUser = req.user?.role === "candidate" && attempt.candidateId && req.user.candidateId === attempt.candidateId._id.toString();
  const byInvitation = invitationToken && attempt.invitationId.invitationToken === invitationToken;
  if (!byCandidateUser && !byInvitation) {
    throw new ApiError(403, "You do not have access to this assessment result");
  }

  const assessment = attempt.assessmentId;
  res.json({
    attempt,
    visibleResult: {
      showCompleteResult: assessment.resultVisibility?.showCompleteResult,
      showOverallScoreOnly: assessment.resultVisibility?.showOverallScoreOnly,
      showSectionScores: assessment.resultVisibility?.showSectionScores,
      showPassFailOnly: assessment.resultVisibility?.showPassFailOnly,
      hideResultUntilRecruiterReview: assessment.resultVisibility?.hideResultUntilRecruiterReview,
    },
  });
});

async function getCandidateOwnedAttempt(req) {
  const attempt = await AssessmentAttempt.findById(req.params.attemptId).populate("assessmentId invitationId candidateId");
  if (!attempt) throw new ApiError(404, "Assessment attempt not found");
  if (!attempt.candidateId || attempt.candidateId._id.toString() !== req.user.candidateId) {
    throw new ApiError(403, "You do not have access to this assessment attempt");
  }
  return attempt;
}

export const getCandidateAttemptTestContext = asyncHandler(async (req, res) => {
  const attempt = await getCandidateOwnedAttempt(req);
  if (attempt.status !== "In Progress") {
    throw new ApiError(409, "This assessment attempt is not currently in progress.");
  }

  res.json({
    attempt,
    assessment: attempt.assessmentId,
    warning: "Camera and identity indicators are review signals only. They do not automatically decide the result.",
  });
});

export const saveCandidateAttemptAnswer = asyncHandler(async (req, res) => {
  const attempt = await getCandidateOwnedAttempt(req);
  if (attempt.status !== "In Progress") {
    throw new ApiError(409, "This assessment attempt is not currently in progress.");
  }

  const assessment = attempt.assessmentId;
  const question = assessment.sections.flatMap((section) => section.questions).find((item) => item._id.toString() === req.body.questionId);
  if (!question) throw new ApiError(404, "Question not found");
  const section = assessment.sections.find((item) => item._id.toString() === req.body.sectionId);
  if (!section) throw new ApiError(404, "Section not found");

  const existing = attempt.answers.find((item) => item.questionId.toString() === req.body.questionId);
  if (existing) {
    existing.answerText = req.body.answerText || existing.answerText;
    existing.selectedOptionIds = req.body.selectedOptionIds || existing.selectedOptionIds;
    existing.savedAt = new Date();
    if (req.body.code) {
      existing.codingSubmission = {
        ...(existing.codingSubmission || {}),
        code: req.body.code,
        programmingLanguage: req.body.programmingLanguage || existing.codingSubmission?.programmingLanguage || "JavaScript",
      };
    }
  } else {
    attempt.answers.push({
      questionId: question._id,
      sectionId: section._id,
      questionType: question.questionType,
      answerText: req.body.answerText,
      selectedOptionIds: req.body.selectedOptionIds || [],
      codingSubmission: req.body.code
        ? {
            code: req.body.code,
            programmingLanguage: req.body.programmingLanguage || "JavaScript",
            submissionHistory: [],
          }
        : undefined,
      savedAt: new Date(),
    });
  }

  await attempt.save();
  res.json({ saved: true, attempt });
});

export const submitCandidateAttemptAssessment = asyncHandler(async (req, res) => {
  const attempt = await getCandidateOwnedAttempt(req);
  if (attempt.status !== "In Progress") {
    throw new ApiError(409, "This assessment attempt is not currently in progress.");
  }

  const assessment = attempt.assessmentId;
  const scored = scoreAttempt(assessment, attempt);
  attempt.sectionResults = scored.sectionResults;
  attempt.totalScore = scored.totalScore;
  attempt.passingStatus = scored.passingStatus;
  attempt.recruiterRecommendation = scored.totalScore >= 85 ? "Strong technical performance" : "Recruiter review recommended";
  attempt.status = "Submitted";
  attempt.submittedAt = new Date();
  attempt.completionTimeMinutes = Math.max(1, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 60000));
  attempt.activityTimeline.push({ label: "Assessment submitted", metadata: { source: "candidate-authenticated-test" } });
  await attempt.save();

  const invitation = attempt.invitationId;
  if (invitation) {
    invitation.status = "Completed";
    invitation.completedAt = new Date();
    await invitation.save();
  }

  if (invitation) {
    sendAssessmentSubmitted(invitation, attempt, assessment).catch(console.error);
  }
  res.json({ attempt, resultVisibility: assessment.resultVisibility });
});

export const getCandidateAssessments = asyncHandler(async (req, res) => {
  const [attempts, invitations] = await Promise.all([
    AssessmentAttempt.find({
      candidateId: req.user.candidateId,
    })
      .populate("assessmentId")
      .sort({ createdAt: -1 }),
    AssessmentInvitation.find({
      candidateId: req.user.candidateId,
      status: { $in: ["Sent", "Opened", "Resume Submitted", "Started"] },
    })
      .populate("assessmentId")
      .populate("jobId")
      .sort({ sentAt: -1, createdAt: -1 }),
  ]);

  const attemptInvitationIds = new Set(attempts.map((attempt) => attempt.invitationId?.toString()).filter(Boolean));
  const pendingInvitations = invitations.filter((invitation) => !attemptInvitationIds.has(invitation._id.toString()));

  res.json({ items: attempts, pendingInvitations });
});
