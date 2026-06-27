import mongoose from "mongoose";
import { Application } from "../models/Application.js";
import { Company } from "../models/Company.js";
import { Job } from "../models/Job.js";
import { generateJobDescription } from "../services/aiService.js";
import { createAuditLog } from "../services/auditService.js";
import { enforcePlanLimit } from "../services/planLimitService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPaginatedResponse, getPagination } from "../utils/pagination.js";

function sortJobs(sort) {
  switch (sort) {
    case "oldest":
      return { createdAt: 1 };
    case "mostApplicants":
      return { applicantsCount: -1, createdAt: -1 };
    case "deadline":
      return { applicationDeadline: 1 };
    case "newest":
    default:
      return { createdAt: -1 };
  }
}

async function ensureRecruiterCompany(recruiterId) {
  const company = await Company.findOne({ recruiterId });
  if (!company) {
    throw new ApiError(400, "Create a company profile before posting jobs");
  }
  return company;
}

function applyAutomaticStatus(job) {
  if (job.status !== "Closed" && job.status !== "Draft" && job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
    job.status = "Expired";
  }
  return job;
}

export const generateDescription = asyncHandler(async (req, res) => {
  const content = await generateJobDescription(req.body);
  res.json({
    content,
    message: "Review and edit the AI-generated content before publishing.",
  });
});

export const createJob = asyncHandler(async (req, res) => {
  const company = await ensureRecruiterCompany(req.user.recruiterId);
  const status = req.body.status === "Draft" ? "Draft" : "Published";
  if (status === "Published") {
    await enforcePlanLimit({
      organizationId: company._id,
      resourceType: "activeJobs",
      message: "Your active job limit has been reached.",
    });
  }
  const job = await Job.create({
    ...req.body,
    recruiterId: req.user.recruiterId,
    companyId: company._id,
    status,
    publishedAt: status === "Published" ? new Date() : undefined,
  });

  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Job",
    entityId: job._id,
    action: status === "Draft" ? "draft-created" : "published",
  });

  res.status(201).json({ job });
});

export const createDraftJob = asyncHandler(async (req, res) => {
  req.body.status = "Draft";
  return createJob(req, res);
});

export const getJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {
    recruiterId: new mongoose.Types.ObjectId(req.user.recruiterId),
    deletedAt: null,
  };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.employmentType) {
    filter.employmentType = req.query.employmentType;
  }

  if (req.query.workplaceType) {
    filter.workplaceType = req.query.workplaceType;
  }

  if (req.query.search) {
    filter.$text = { $search: req.query.search };
  }

  const sort = sortJobs(req.query.sort);
  const [jobs, total] = await Promise.all([
    Job.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "applications",
          localField: "_id",
          foreignField: "jobId",
          as: "applications",
        },
      },
      {
        $addFields: {
          applicantsCount: { $size: "$applications" },
          shortlistedCount: {
            $size: {
              $filter: {
                input: "$applications",
                as: "application",
                cond: { $eq: ["$$application.status", "Shortlisted"] },
              },
            },
          },
        },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
    ]),
    Job.countDocuments(filter),
  ]);

  const normalizedJobs = jobs.map((job) => {
    if (job.status !== "Closed" && job.status !== "Draft" && job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
      job.status = "Expired";
    }
    return job;
  });

  const stats = await Job.aggregate([
    { $match: { recruiterId: new mongoose.Types.ObjectId(req.user.recruiterId), deletedAt: null } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  res.json({
    ...buildPaginatedResponse({
      items: normalizedJobs,
      total,
      page,
      limit,
    }),
    stats,
  });
});

export const getJobById = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.jobId,
    recruiterId: req.user.recruiterId,
    deletedAt: null,
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  const applicantCount = await Application.countDocuments({ jobId: job._id });

  res.json({
    job: applyAutomaticStatus(job.toObject()),
    applicantCount,
  });
});

export const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.jobId,
    recruiterId: req.user.recruiterId,
    deletedAt: null,
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  Object.assign(job, req.body);
  if (job.status === "Published" && !job.publishedAt) {
    job.publishedAt = new Date();
  }
  await job.save();

  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Job",
    entityId: job._id,
    action: "updated",
  });

  res.json({ job });
});

export const updateJobStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const job = await Job.findOne({
    _id: req.params.jobId,
    recruiterId: req.user.recruiterId,
    deletedAt: null,
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  const validTransitions = {
    Draft: ["Published"],
    Published: ["Paused", "Closed"],
    Paused: ["Published", "Closed"],
    Closed: ["Published"],
    Expired: ["Published", "Closed"],
  };

  if (!validTransitions[job.status]?.includes(status)) {
    throw new ApiError(400, `Cannot change job status from ${job.status} to ${status}`);
  }

  if (status === "Published") {
    await enforcePlanLimit({
      organizationId: job.companyId,
      resourceType: "activeJobs",
      message: "Your active job limit has been reached.",
    });
  }

  job.status = status;
  if (status === "Published" && !job.publishedAt) {
    job.publishedAt = new Date();
  }
  await job.save();

  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Job",
    entityId: job._id,
    action: "status-updated",
    metadata: { status },
  });

  res.json({ job });
});

export const duplicateJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.jobId,
    recruiterId: req.user.recruiterId,
    deletedAt: null,
  }).lean();

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  const duplicate = await Job.create({
    ...job,
    _id: undefined,
    title: `${job.title} (Copy)`,
    status: "Draft",
    publishedAt: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  });

  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Job",
    entityId: duplicate._id,
    action: "duplicated",
    metadata: { sourceJobId: job._id },
  });

  res.status(201).json({ job: duplicate });
});

export const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.jobId,
    recruiterId: req.user.recruiterId,
    deletedAt: null,
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  const hasApplications = (await Application.countDocuments({ jobId: job._id })) > 0;

  if (hasApplications) {
    job.deletedAt = new Date();
    job.archivedAt = new Date();
  } else {
    await job.deleteOne();
  }

  if (hasApplications) {
    await job.save();
  }

  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Job",
    entityId: job._id,
    action: hasApplications ? "archived" : "deleted",
  });

  res.json({
    message: hasApplications ? "Job archived because applications exist" : "Job deleted successfully",
  });
});
