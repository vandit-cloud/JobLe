import fs from "fs";
import crypto from "crypto";
import mongoose from "mongoose";
import { Assessment } from "../models/Assessment.js";
import { AssessmentAttempt } from "../models/AssessmentAttempt.js";
import { AssessmentInvitation } from "../models/AssessmentInvitation.js";
import { IntegrityEvent } from "../models/IntegrityEvent.js";
import { Job } from "../models/Job.js";
import { QuestionBankItem } from "../models/QuestionBankItem.js";
import { generateAssessmentQuestions } from "../services/aiService.js";
import { sendAssessmentInvitation, sendAssessmentInvitationCancelled, sendAssessmentInvitationResent } from "../services/emailService.js";
import { createAuditLog } from "../services/auditService.js";
import { enforcePlanLimit, recordUsage } from "../services/planLimitService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPaginatedResponse, getPagination } from "../utils/pagination.js";
import { resolveStoredResumePath } from "../utils/resumeStorage.js";

function toObjectId(value) {
  return new mongoose.Types.ObjectId(value);
}

function computeAssessmentTotals(payload) {
  const totalDuration = payload.sections.reduce((sum, section) => sum + Number(section.duration || 0), 0);
  const totalMarks = payload.sections.reduce(
    (sum, section) => sum + section.questions.reduce((sectionTotal, question) => sectionTotal + Number(question.marks || 0), 0),
    0,
  );
  const normalizedSections = payload.sections.map((section, index) => ({
    ...section,
    numberOfQuestions: section.questions.length,
    totalMarks: section.questions.reduce((sum, question) => sum + Number(question.marks || 0), 0),
    sectionOrder: index + 1,
  }));
  return {
    totalDuration,
    totalMarks,
    sections: normalizedSections,
  };
}

async function ensureAssessmentOwnership(assessmentId, req) {
  const assessment = await Assessment.findOne({
    _id: assessmentId,
    organizationId: req.user.companyId,
    deletedAt: null,
  });
  if (!assessment) {
    throw new ApiError(404, "Assessment not found");
  }
  return assessment;
}

function buildRecommendation(attempt) {
  if (attempt.totalScore >= 85) return "Strong technical performance";
  if (attempt.integritySummary?.status === "Review Recommended") return "Recruiter review recommended";
  if ((attempt.resumeMatch?.missingSkills || []).length === 1) return "Missing one preferred skill";
  return "Retest recommended";
}

function generateEmailVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

export const getAssessments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {
    organizationId: toObjectId(req.user.companyId),
    deletedAt: null,
  };

  if (req.query.status) filter.status = req.query.status;
  if (req.query.jobId) filter.jobId = toObjectId(req.query.jobId);
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) filter.$text = { $search: req.query.search };

  const sortMap = {
    oldest: { createdAt: 1 },
    mostAttempts: { attemptsCount: -1, createdAt: -1 },
    highestCompletionRate: { completionRate: -1, createdAt: -1 },
    newest: { createdAt: -1 },
  };

  const [items, total, summary] = await Promise.all([
    Assessment.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "assessmentinvitations",
          localField: "_id",
          foreignField: "assessmentId",
          as: "invitations",
        },
      },
      {
        $lookup: {
          from: "assessmentattempts",
          localField: "_id",
          foreignField: "assessmentId",
          as: "attempts",
        },
      },
      {
        $addFields: {
          sectionsCount: { $size: "$sections" },
          questionsCount: {
            $sum: {
              $map: {
                input: "$sections",
                as: "section",
                in: { $size: "$$section.questions" },
              },
            },
          },
          invitedCandidates: { $size: "$invitations" },
          attemptsCount: { $size: "$attempts" },
          completedAttempts: {
            $size: {
              $filter: {
                input: "$attempts",
                as: "attempt",
                cond: { $eq: ["$$attempt.status", "Submitted"] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          completionRate: {
            $cond: [{ $eq: ["$invitedCandidates", 0] }, 0, { $multiply: [{ $divide: ["$completedAttempts", "$invitedCandidates"] }, 100] }],
          },
        },
      },
      { $sort: sortMap[req.query.sort] || sortMap.newest },
      { $skip: skip },
      { $limit: limit },
    ]),
    Assessment.countDocuments(filter),
    Assessment.aggregate([
      { $match: { organizationId: toObjectId(req.user.companyId), deletedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const invitationSummary = await AssessmentInvitation.aggregate([
    { $match: { organizationId: toObjectId(req.user.companyId) } },
    {
      $group: {
        _id: null,
        totalInvitations: { $sum: 1 },
        testsStarted: { $sum: { $cond: [{ $in: ["$status", ["Started", "Completed"]] }, 1, 0] } },
        testsCompleted: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
      },
    },
  ]);
  const flagsCount = await AssessmentAttempt.countDocuments({
    organizationId: req.user.companyId,
    "integritySummary.totalFlags": { $gt: 0 },
  });
  const awaitingReview = await AssessmentAttempt.countDocuments({
    organizationId: req.user.companyId,
    "recruiterReview.status": "Awaiting Review",
  });

  res.json({
    ...buildPaginatedResponse({ items, total, page, limit }),
    summary: {
      statuses: summary,
      totalInvitations: invitationSummary[0]?.totalInvitations || 0,
      testsStarted: invitationSummary[0]?.testsStarted || 0,
      testsCompleted: invitationSummary[0]?.testsCompleted || 0,
      candidatesAwaitingReview: awaitingReview,
      candidatesWithIntegrityFlags: flagsCount,
    },
  });
});

export const createAssessment = asyncHandler(async (req, res) => {
  const totals = computeAssessmentTotals(req.body);
  const assessment = await Assessment.create({
    ...req.body,
    ...totals,
    recruiterId: req.user.recruiterId,
    organizationId: req.user.companyId,
    jobId: req.body.jobId || null,
    passingPercentage: req.body.settings.overallPassingPercentage,
    lastAutoSavedAt: new Date(),
  });

  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Assessment",
    entityId: assessment._id,
    action: "created",
  });

  res.status(201).json({ assessment });
});

export const getAssessmentById = asyncHandler(async (req, res) => {
  const assessment = await ensureAssessmentOwnership(req.params.assessmentId, req);
  const [job, invitationCount, resultsCount] = await Promise.all([
    assessment.jobId ? Job.findById(assessment.jobId).select("_id title") : null,
    AssessmentInvitation.countDocuments({ assessmentId: assessment._id }),
    AssessmentAttempt.countDocuments({ assessmentId: assessment._id, status: "Submitted" }),
  ]);

  res.json({
    assessment,
    relatedJob: job,
    invitationCount,
    resultsCount,
  });
});

export const updateAssessment = asyncHandler(async (req, res) => {
  const assessment = await ensureAssessmentOwnership(req.params.assessmentId, req);
  const totals = computeAssessmentTotals(req.body);
  Object.assign(assessment, req.body, totals, {
    jobId: req.body.jobId || null,
    passingPercentage: req.body.settings.overallPassingPercentage,
    lastAutoSavedAt: new Date(),
  });
  await assessment.save();

  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Assessment",
    entityId: assessment._id,
    action: "updated",
  });

  res.json({ assessment });
});

export const deleteAssessment = asyncHandler(async (req, res) => {
  const assessment = await ensureAssessmentOwnership(req.params.assessmentId, req);
  assessment.deletedAt = new Date();
  assessment.status = "Archived";
  await assessment.save();
  res.json({ message: "Assessment archived successfully." });
});

export const updateAssessmentStatus = asyncHandler(async (req, res) => {
  const assessment = await ensureAssessmentOwnership(req.params.assessmentId, req);
  assessment.status = req.body.status;
  if (req.body.status === "Archived") {
    assessment.archivedAt = new Date();
  }
  await assessment.save();
  res.json({ assessment });
});

export const duplicateAssessment = asyncHandler(async (req, res) => {
  const assessment = await ensureAssessmentOwnership(req.params.assessmentId, req);
  const clone = assessment.toObject();
  delete clone._id;
  delete clone.createdAt;
  delete clone.updatedAt;
  const duplicated = await Assessment.create({
    ...clone,
    title: `${assessment.title} (Copy)`,
    status: "Draft",
  });
  res.status(201).json({ assessment: duplicated });
});

export const publishAssessment = asyncHandler(async (req, res) => {
  const assessment = await ensureAssessmentOwnership(req.params.assessmentId, req);

  if (!assessment.title || !assessment.candidateInstructions || assessment.sections.length === 0) {
    throw new ApiError(400, "Assessment is incomplete and cannot be published.");
  }
  for (const section of assessment.sections) {
    if (section.questions.length === 0) throw new ApiError(400, "Every section must contain at least one question.");
    for (const question of section.questions) {
      if (question.questionType === "MCQ" && question.correctOptionIds.length === 0) {
        throw new ApiError(400, "Every MCQ must include a correct answer.");
      }
      if (question.questionType === "Coding Test" && question.visibleTestCases.length === 0 && question.hiddenTestCases.length === 0) {
        throw new ApiError(400, "Every coding question must include valid test cases.");
      }
    }
  }

  assessment.status = "Published";
  await assessment.save();
  res.json({ assessment });
});

export const generateDraftQuestions = asyncHandler(async (req, res) => {
  await enforcePlanLimit({
    organizationId: req.user.companyId,
    resourceType: "aiQuestionGenerations",
    message: "Your AI question generation limit has been reached.",
  });
  const questions = await generateAssessmentQuestions(req.body);
  await recordUsage({
    organizationId: req.user.companyId,
    resourceType: "aiQuestionGenerations",
    quantity: 1,
    metadata: { count: questions.length },
  });
  res.json({
    questions,
    notice: "AI-generated questions are drafts only and must be reviewed before publishing.",
  });
});

export const getQuestionBank = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {
    organizationId: req.user.companyId,
  };
  if (req.query.search) filter.questionText = { $regex: req.query.search, $options: "i" };
  if (req.query.skill) filter.skill = req.query.skill;
  if (req.query.difficulty) filter.difficulty = req.query.difficulty;
  if (req.query.questionType) filter.questionType = req.query.questionType;

  const [items, total] = await Promise.all([
    QuestionBankItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    QuestionBankItem.countDocuments(filter),
  ]);

  res.json(buildPaginatedResponse({ items, total, page, limit }));
});

export const createQuestionBankItem = asyncHandler(async (req, res) => {
  const item = await QuestionBankItem.create({
    ...req.body,
    organizationId: req.user.companyId,
    recruiterId: req.user.recruiterId,
  });
  res.status(201).json({ question: item });
});

export const updateQuestionBankItem = asyncHandler(async (req, res) => {
  const item = await QuestionBankItem.findOneAndUpdate(
    { _id: req.params.questionId, organizationId: req.user.companyId },
    req.body,
    { new: true },
  );
  if (!item) throw new ApiError(404, "Question not found");
  res.json({ question: item });
});

export const deleteQuestionBankItem = asyncHandler(async (req, res) => {
  const item = await QuestionBankItem.findOneAndDelete({
    _id: req.params.questionId,
    organizationId: req.user.companyId,
  });
  if (!item) throw new ApiError(404, "Question not found");
  res.json({ message: "Question deleted successfully." });
});

export const createInvitations = asyncHandler(async (req, res) => {
  await enforcePlanLimit({
    organizationId: req.user.companyId,
    resourceType: "candidateInvitations",
    increment: req.body.candidateEmails.length + req.body.candidates.length,
    message: "Your candidate invitation limit has been reached.",
  });
  const assessment = await ensureAssessmentOwnership(req.body.assessmentId, req);
  const candidates = [
    ...req.body.candidateEmails.map((candidateEmail) => ({ candidateEmail })),
    ...req.body.candidates,
  ];
  const created = await AssessmentInvitation.insertMany(
    candidates.map((candidate) => ({
      organizationId: req.user.companyId,
      recruiterId: req.user.recruiterId,
      assessmentId: assessment._id,
      jobId: req.body.jobId || null,
      candidateId: candidate.candidateId || null,
      candidateName: candidate.candidateName || "",
      candidateEmail: candidate.candidateEmail,
      expiresAt: req.body.expiryDate ? new Date(req.body.expiryDate) : assessment.settings.invitationLinkExpiry || new Date(Date.now() + 7 * 86400000),
      maxAttempts: req.body.maxAttempts,
      status: "Sent",
      sentAt: new Date(),
      emailVerificationCode: generateEmailVerificationCode(),
    })),
  );
  await recordUsage({
    organizationId: req.user.companyId,
    resourceType: "candidateInvitations",
    quantity: created.length,
    metadata: { assessmentId: assessment._id.toString() },
  });
  for (const invitation of created) {
    sendAssessmentInvitation(invitation, assessment).catch(console.error);
  }
  res.status(201).json({
    invitations: created.map((item) => ({
      ...item.toObject(),
      invitationLink: `/assessment/${item.invitationToken}`,
    })),
  });
});

export const getInvitations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { organizationId: req.user.companyId };
  if (req.query.assessmentId) filter.assessmentId = req.query.assessmentId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.candidateEmail = { $regex: req.query.search, $options: "i" };
  const [items, total] = await Promise.all([
    AssessmentInvitation.find(filter).populate("assessmentId", "title").populate("jobId", "title").sort({ createdAt: -1 }).skip(skip).limit(limit),
    AssessmentInvitation.countDocuments(filter),
  ]);
  res.json(buildPaginatedResponse({ items, total, page, limit }));
});

export const cancelInvitation = asyncHandler(async (req, res) => {
  const invitation = await AssessmentInvitation.findOne({
    _id: req.params.invitationId,
    organizationId: req.user.companyId,
  });
  if (!invitation) throw new ApiError(404, "Invitation not found");
  invitation.status = "Cancelled";
  invitation.cancelledAt = new Date();
  await invitation.save();
  const assessmentForCancel = await Assessment.findById(invitation.assessmentId).select("title");
  if (assessmentForCancel) sendAssessmentInvitationCancelled(invitation, assessmentForCancel).catch(console.error);
  res.json({ invitation });
});

export const resendInvitation = asyncHandler(async (req, res) => {
  const invitation = await AssessmentInvitation.findOne({
    _id: req.params.invitationId,
    organizationId: req.user.companyId,
  });
  if (!invitation) throw new ApiError(404, "Invitation not found");
  invitation.status = "Sent";
  invitation.lastResentAt = new Date();
  invitation.emailVerificationCode = generateEmailVerificationCode();
  await invitation.save();
  const assessmentForResend = await Assessment.findById(invitation.assessmentId).select("title");
  if (assessmentForResend) sendAssessmentInvitationResent(invitation, assessmentForResend).catch(console.error);
  res.json({
    invitation,
    invitationLink: `/assessment/${invitation.invitationToken}`,
  });
});

export const getAssessmentResults = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { organizationId: toObjectId(req.user.companyId) };
  if (req.query.assessmentId) filter.assessmentId = toObjectId(req.query.assessmentId);
  if (req.query.reviewStatus) filter["recruiterReview.status"] = req.query.reviewStatus;
  if (req.query.integrityStatus) filter["integritySummary.status"] = req.query.integrityStatus;
  if (req.query.passingStatus) filter.passingStatus = req.query.passingStatus === "true";
  const postLookupMatch = {};
  if (req.query.jobId) postLookupMatch["assessment.jobId"] = toObjectId(req.query.jobId);

  const pipeline = [
    { $match: filter },
    {
      $lookup: {
        from: "assessments",
        localField: "assessmentId",
        foreignField: "_id",
        as: "assessment",
      },
    },
    { $unwind: "$assessment" },
    ...(Object.keys(postLookupMatch).length ? [{ $match: postLookupMatch }] : []),
    {
      $lookup: {
        from: "jobs",
        localField: "assessment.jobId",
        foreignField: "_id",
        as: "job",
      },
    },
    { $unwind: { path: "$job", preserveNullAndEmptyArrays: true } },
  ];

  const sortMap = {
    lowestTotalScore: { totalScore: 1 },
    newestAttempt: { submittedAt: -1 },
    fastestCompletion: { completionTimeMinutes: 1 },
    highestCodingScore: { "sectionResults.score": -1 },
    highestTotalScore: { totalScore: -1 },
  };

  pipeline.push({ $sort: sortMap[req.query.sort] || sortMap.highestTotalScore }, { $skip: skip }, { $limit: limit });

  const countPipeline = [...pipeline.filter((stage) => !("$sort" in stage) && !("$skip" in stage) && !("$limit" in stage)), { $count: "total" }];
  const [items, totalResult] = await Promise.all([AssessmentAttempt.aggregate(pipeline), AssessmentAttempt.aggregate(countPipeline)]);
  const total = totalResult[0]?.total || 0;
  res.json(buildPaginatedResponse({ items: items.map((item) => ({ ...item, recommendation: buildRecommendation(item) })), total, page, limit }));
});

export const getAssessmentResultById = asyncHandler(async (req, res) => {
  const attempt = await AssessmentAttempt.findOne({
    _id: req.params.attemptId,
    organizationId: req.user.companyId,
  }).populate("assessmentId invitationId candidateId");
  if (!attempt) throw new ApiError(404, "Assessment result not found");
  const integrityEvents = await IntegrityEvent.find({ attemptId: attempt._id }).sort({ createdAt: 1 });
  res.json({
    attempt,
    integrityEvents,
    recommendation: buildRecommendation(attempt),
  });
});

export const reviewAssessmentResult = asyncHandler(async (req, res) => {
  const attempt = await AssessmentAttempt.findOne({
    _id: req.params.attemptId,
    organizationId: req.user.companyId,
  });
  if (!attempt) throw new ApiError(404, "Assessment result not found");
  attempt.recruiterReview = {
    status: req.body.status,
    note: req.body.note || "",
    reviewedAt: new Date(),
  };
  attempt.activityTimeline.push({
    label: "Recruiter review updated",
    metadata: {
      by: req.user.email,
      status: req.body.status,
      note: req.body.note || "",
    },
  });
  await attempt.save();
  res.json({ attempt });
});

export const adjustAssessmentScore = asyncHandler(async (req, res) => {
  const attempt = await AssessmentAttempt.findOne({
    _id: req.params.attemptId,
    organizationId: req.user.companyId,
  });
  if (!attempt) throw new ApiError(404, "Assessment result not found");
  const answer = attempt.answers.find((item) => item.questionId.toString() === req.body.questionId);
  if (!answer) throw new ApiError(404, "Answer not found for this question");
  const previousScore = answer.score || 0;
  answer.score = req.body.newScore;
  attempt.totalScore = attempt.answers.reduce((sum, item) => sum + Number(item.score || 0), 0);
  attempt.activityTimeline.push({
    label: "Manual score adjustment",
    metadata: {
      by: req.user.email,
      questionId: req.body.questionId,
      previousScore,
      newScore: req.body.newScore,
      reason: req.body.reason,
      at: new Date(),
    },
  });
  await attempt.save();
  res.json({ attempt });
});

export const getAssessmentIntegrity = asyncHandler(async (req, res) => {
  const attempt = await AssessmentAttempt.findOne({
    _id: req.params.attemptId,
    organizationId: req.user.companyId,
  });
  if (!attempt) throw new ApiError(404, "Assessment result not found");
  const events = await IntegrityEvent.find({ attemptId: attempt._id }).sort({ createdAt: 1 });
  res.json({
    integritySummary: attempt.integritySummary,
    events,
    warning:
      "Integrity indicators are system-generated events for recruiter review. They do not prove misconduct and must not be used as the only reason for rejection.",
  });
});

export const streamAssessmentResume = asyncHandler(async (req, res) => {
  const attempt = await AssessmentAttempt.findOne({
    _id: req.params.attemptId,
    organizationId: req.user.companyId,
  });

  if (!attempt) {
    throw new ApiError(404, "Assessment result not found");
  }

  const absolutePath = resolveStoredResumePath(attempt.candidateProfile?.resumeUrl);
  if (!absolutePath) {
    throw new ApiError(400, "This resume is not stored as a protected local file");
  }

  if (!fs.existsSync(absolutePath)) {
    throw new ApiError(404, "Resume file not found");
  }

  res.sendFile(absolutePath);
});
