import fs from "fs";
import mongoose from "mongoose";
import { Application } from "../models/Application.js";
import { Candidate } from "../models/Candidate.js";
import { Job } from "../models/Job.js";
import { analyzeCandidateMatch } from "../services/aiService.js";
import { sendApplicationStatusChanged } from "../services/emailService.js";
import { resolveStoredResumePath } from "../utils/resumeStorage.js";
import { createAuditLog } from "../services/auditService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPaginatedResponse, getPagination } from "../utils/pagination.js";

function buildApplicationFilter(recruiterId, query) {
  const filter = {
    recruiterId: new mongoose.Types.ObjectId(recruiterId),
    status: { $ne: "Draft" },
  };

  if (query.jobId) {
    filter.jobId = new mongoose.Types.ObjectId(query.jobId);
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.minScore) {
    filter["matchAnalysis.overallScore"] = { $gte: Number(query.minScore) };
  }

  return filter;
}

export const getApplications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildApplicationFilter(req.user.recruiterId, req.query);

  const pipeline = [
    { $match: filter },
    {
      $lookup: {
        from: "candidates",
        localField: "candidateId",
        foreignField: "_id",
        as: "candidate",
      },
    },
    {
      $lookup: {
        from: "jobs",
        localField: "jobId",
        foreignField: "_id",
        as: "job",
      },
    },
    { $unwind: "$candidate" },
    { $unwind: "$job" },
  ];

  if (req.query.skills) {
    pipeline.push({
      $match: {
        "candidate.skills": {
          $in: req.query.skills.split(",").map((skill) => skill.trim()),
        },
      },
    });
  }

  if (req.query.location) {
    pipeline.push({
      $match: {
        "candidate.location": { $regex: req.query.location, $options: "i" },
      },
    });
  }

  if (req.query.education) {
    pipeline.push({
      $match: {
        "candidate.education.degree": { $regex: req.query.education, $options: "i" },
      },
    });
  }

  if (req.query.search) {
    pipeline.push({
      $match: {
        $or: [
          { "candidate.name": { $regex: req.query.search, $options: "i" } },
          { "candidate.professionalTitle": { $regex: req.query.search, $options: "i" } },
          { "job.title": { $regex: req.query.search, $options: "i" } },
        ],
      },
    });
  }

  pipeline.push(
    {
      $addFields: {
        totalExperience: {
          $sum: {
            $map: {
              input: "$candidate.experience",
              as: "experience",
              in: "$$experience.years",
            },
          },
        },
      },
    },
    { $sort: { "matchAnalysis.overallScore": -1, appliedAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  );

  const [applications, total, summary, jobs] = await Promise.all([
    Application.aggregate(pipeline),
    Application.countDocuments(filter),
    Application.aggregate([
      { $match: { recruiterId: new mongoose.Types.ObjectId(req.user.recruiterId), status: { $ne: "Draft" } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Job.find({ recruiterId: req.user.recruiterId, deletedAt: null }).select("_id title"),
  ]);

  res.json({
    ...buildPaginatedResponse({
      items: applications,
      total,
      page,
      limit,
    }),
    summary,
    jobs,
  });
});

export const getApplicationById = asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.applicationId,
    recruiterId: req.user.recruiterId,
    status: { $ne: "Draft" },
  })
    .populate("candidateId")
    .populate("jobId");

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  res.json({ application });
});

export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.applicationId,
    recruiterId: req.user.recruiterId,
    status: { $ne: "Draft" },
  });

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  application.status = req.body.status;
  if (req.body.note) {
    application.recruiterNotes.push({
      note: req.body.note,
      action: req.body.status,
    });
  }

  if (req.body.status === "Shortlisted") {
    application.shortlistedAt = new Date();
  }
  if (req.body.status === "Rejected") {
    application.rejectedAt = new Date();
  }
  if (req.body.status === "Selected") {
    application.selectedAt = new Date();
  }

  await application.save();
  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Application",
    entityId: application._id,
    action: "status-updated",
    metadata: { status: req.body.status },
  });

  Promise.all([
    Candidate.findById(application.candidateId).select("name email"),
    Job.findById(application.jobId).select("title"),
  ]).then(([candidate, job]) => {
    if (candidate?.email) sendApplicationStatusChanged(candidate, job, req.body.status, req.body.note).catch(console.error);
  }).catch(console.error);

  res.json({ application });
});

export const analyzeApplication = asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.applicationId,
    recruiterId: req.user.recruiterId,
    status: { $ne: "Draft" },
  });
  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  const [candidate, job] = await Promise.all([
    Candidate.findById(application.candidateId),
    Job.findById(application.jobId),
  ]);

  if (!candidate || !job) {
    throw new ApiError(404, "Candidate or job not found");
  }

  application.matchAnalysis = await analyzeCandidateMatch({ candidate, job });
  await application.save();

  res.json({
    analysis: application.matchAnalysis,
    notice: "AI results are recommendations only. Recruiters must make the final hiring decision.",
  });
});

export const getProtectedResume = asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.applicationId,
    recruiterId: req.user.recruiterId,
  });

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  res.json({
    resumeUrl: application.resumeUrl,
  });
});

export const streamProtectedResume = asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.applicationId,
    recruiterId: req.user.recruiterId,
  });

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  const absolutePath = resolveStoredResumePath(application.resumeUrl);
  if (!absolutePath) {
    throw new ApiError(400, "This resume is not stored as a protected local file");
  }

  if (!fs.existsSync(absolutePath)) {
    throw new ApiError(404, "Resume file not found");
  }

  res.sendFile(absolutePath);
});

export const getShortlistedApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({
    recruiterId: req.user.recruiterId,
    status: { $in: ["Shortlisted", "Interview Scheduled", "Selected"] },
  })
    .populate("candidateId")
    .populate("jobId")
    .sort({ shortlistedAt: -1 });

  const summary = {
    totalShortlisted: applications.length,
    awaitingInterview: applications.filter((item) => item.status === "Shortlisted").length,
    interviewScheduled: applications.filter((item) => item.status === "Interview Scheduled").length,
    interviewCompleted: applications.filter((item) => item.status === "Selected").length,
  };

  res.json({
    items: applications,
    summary,
  });
});

export const removeFromShortlist = asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.applicationId,
    recruiterId: req.user.recruiterId,
  });

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  application.status = req.body.nextStatus;
  if (req.body.note) {
    application.recruiterNotes.push({
      note: req.body.note,
      action: "Removed from shortlist",
    });
  }
  await application.save();

  res.json({ application });
});

export const selectCandidate = asyncHandler(async (req, res) => {
  const application = await Application.findOneAndUpdate(
    {
      _id: req.params.applicationId,
      recruiterId: req.user.recruiterId,
    },
    {
      status: "Selected",
      selectedAt: new Date(),
    },
    { new: true },
  );

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  res.json({ application });
});

export const compareCandidates = asyncHandler(async (req, res) => {
  const applications = await Application.find({
    _id: { $in: req.body.applicationIds },
    recruiterId: req.user.recruiterId,
  })
    .populate("candidateId")
    .populate("jobId");

  if (applications.length < 2) {
    throw new ApiError(400, "At least two applications are required for comparison");
  }

  const comparison = applications.map((application) => ({
    applicationId: application._id,
    candidate: application.candidateId,
    job: application.jobId,
    matchAnalysis: application.matchAnalysis,
    availability: application.candidateId.availability,
  }));

  res.json({
    comparison,
    notice: "Comparison helps review tradeoffs. It does not automatically choose a candidate.",
  });
});
