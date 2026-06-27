import { Application } from "../models/Application.js";
import { Candidate } from "../models/Candidate.js";
import { Interview } from "../models/Interview.js";
import { Job } from "../models/Job.js";
import { generateInterviewQuestions } from "../services/aiService.js";
import { createAuditLog } from "../services/auditService.js";
import { sendInterviewCancelled, sendInterviewScheduled, sendInterviewUpdated } from "../services/emailService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

async function findRecruiterInterview(interviewId, recruiterId) {
  const interview = await Interview.findOne({ _id: interviewId, recruiterId }).populate("candidateId jobId applicationId");
  if (!interview) {
    throw new ApiError(404, "Interview not found");
  }
  return interview;
}

async function hasConflict(recruiterId, startDateTime, duration, excludeId = null) {
  const start = new Date(startDateTime);
  const end = new Date(start.getTime() + duration * 60000);

  const filter = {
    recruiterId,
    _id: excludeId ? { $ne: excludeId } : { $exists: true },
    status: { $in: ["Scheduled", "Rescheduled"] },
    startDateTime: {
      $lt: end,
    },
  };

  const interviews = await Interview.find(filter);
  return interviews.some((item) => {
    const itemStart = new Date(item.startDateTime);
    const itemEnd = new Date(itemStart.getTime() + item.duration * 60000);
    return itemStart < end && itemEnd > start;
  });
}

export const getInterviews = asyncHandler(async (req, res) => {
  const interviews = await Interview.find({ recruiterId: req.user.recruiterId })
    .populate("candidateId")
    .populate("jobId")
    .populate("applicationId")
    .sort({ startDateTime: 1 });

  const now = Date.now();
  const grouped = {
    upcoming: interviews.filter((item) => new Date(item.startDateTime).getTime() >= now && ["Scheduled", "Rescheduled"].includes(item.status)),
    completed: interviews.filter((item) => item.status === "Completed"),
    cancelled: interviews.filter((item) => item.status === "Cancelled"),
    all: interviews,
  };

  res.json(grouped);
});

export const createInterview = asyncHandler(async (req, res) => {
  const conflict = await hasConflict(req.user.recruiterId, req.body.startDateTime, req.body.duration);
  const interview = await Interview.create({
    ...req.body,
    recruiterId: req.user.recruiterId,
    status: conflict ? "Rescheduled" : "Scheduled",
  });

  await Application.findOneAndUpdate(
    {
      _id: req.body.applicationId,
      recruiterId: req.user.recruiterId,
    },
    {
      status: "Interview Scheduled",
    },
  );

  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Interview",
    entityId: interview._id,
    action: "scheduled",
    metadata: { conflict },
  });

  Promise.all([
    Candidate.findById(interview.candidateId).select("name email"),
    Job.findById(interview.jobId).select("title"),
  ]).then(([candidate, job]) => {
    if (candidate?.email) sendInterviewScheduled(interview, candidate, job).catch(console.error);
  }).catch(console.error);

  res.status(201).json({
    interview,
    warning: conflict ? "Potential recruiter time conflict detected." : null,
  });
});

export const getInterviewById = asyncHandler(async (req, res) => {
  const interview = await findRecruiterInterview(req.params.interviewId, req.user.recruiterId);
  res.json({ interview });
});

export const updateInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.interviewId, recruiterId: req.user.recruiterId });
  if (!interview) {
    throw new ApiError(404, "Interview not found");
  }

  const nextStart = req.body.startDateTime || interview.startDateTime;
  const nextDuration = req.body.duration || interview.duration;
  const conflict = await hasConflict(req.user.recruiterId, nextStart, nextDuration, interview._id);

  Object.assign(interview, req.body);
  if (conflict) {
    interview.status = "Rescheduled";
  }
  await interview.save();

  Promise.all([
    Candidate.findById(interview.candidateId).select("name email"),
    Job.findById(interview.jobId).select("title"),
  ]).then(([candidate, job]) => {
    if (candidate?.email) sendInterviewUpdated(interview, candidate, job).catch(console.error);
  }).catch(console.error);

  res.json({
    interview,
    warning: conflict ? "Potential recruiter time conflict detected." : null,
  });
});

export const cancelInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.interviewId, recruiterId: req.user.recruiterId });
  if (!interview) {
    throw new ApiError(404, "Interview not found");
  }

  const reason = req.body.reason;
  interview.status = "Cancelled";
  interview.notes = [interview.notes, reason ? `Cancellation reason: ${reason}` : null].filter(Boolean).join("\n");
  await interview.save();

  Promise.all([
    Candidate.findById(interview.candidateId).select("name email"),
    Job.findById(interview.jobId).select("title"),
  ]).then(([candidate, job]) => {
    if (candidate?.email) sendInterviewCancelled(interview, candidate, job, reason).catch(console.error);
  }).catch(console.error);

  res.json({ interview });
});

export const addInterviewFeedback = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.interviewId, recruiterId: req.user.recruiterId });
  if (!interview) {
    throw new ApiError(404, "Interview not found");
  }

  interview.feedback = {
    ...req.body,
    submittedAt: new Date(),
  };
  interview.status = "Completed";
  await interview.save();

  res.json({ interview });
});

export const generateQuestions = asyncHandler(async (req, res) => {
  const questions = await generateInterviewQuestions(req.body);
  res.json({
    questions,
    notice: "Questions are editable suggestions. Avoid using them as automatic hiring decisions.",
  });
});

