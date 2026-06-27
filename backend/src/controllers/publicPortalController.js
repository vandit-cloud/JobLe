import { Company } from "../models/Company.js";
import { Job } from "../models/Job.js";
import { Assessment } from "../models/Assessment.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPaginatedResponse, getPagination } from "../utils/pagination.js";
import { ApiError } from "../utils/apiError.js";

function buildPublishedJobFilter(query = {}) {
  const filter = {
    status: "Published",
    deletedAt: null,
    $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }],
  };

  if (query.location) {
    filter.location = { $regex: query.location, $options: "i" };
  }

  if (query.employmentType) {
    filter.employmentType = query.employmentType;
  }

  if (query.workplaceType) {
    filter.workplaceType = query.workplaceType;
  }

  if (query.companyId) {
    filter.companyId = query.companyId;
  }

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  return filter;
}

function sortPublicJobs(sort) {
  switch (sort) {
    case "oldest":
      return { publishedAt: 1, createdAt: 1 };
    case "applicationDeadline":
      return { applicationDeadline: 1, publishedAt: -1 };
    case "highestSalary":
      return { "salary.maximum": -1, publishedAt: -1 };
    case "newest":
    case "mostRelevant":
    default:
      return { publishedAt: -1, createdAt: -1 };
  }
}

export const getPublicJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildPublishedJobFilter(req.query);

  const companyFilter = {};
  if (req.query.industry) {
    companyFilter.industry = req.query.industry;
  }
  if (req.query.verifiedOnly === "true") {
    companyFilter.verificationStatus = "Verified";
  }

  if (Object.keys(companyFilter).length > 0) {
    const matchingCompanies = await Company.find(companyFilter).select("_id");
    const companyIds = matchingCompanies.map((company) => company._id);
    if (filter.companyId) {
      filter.companyId = { $in: companyIds.filter((id) => id.toString() === String(req.query.companyId)) };
    } else {
      filter.companyId = { $in: companyIds };
    }
  }

  if (req.query.assessmentRequired === "true") {
    const assessmentJobIds = await Assessment.find({ status: "Published", deletedAt: null }).distinct("jobId");
    filter._id = { $in: assessmentJobIds };
  }

  const [items, total, assessmentJobIds] = await Promise.all([
    Job.find(filter).populate("companyId").sort(sortPublicJobs(req.query.sort)).skip(skip).limit(limit),
    Job.countDocuments(filter),
    Assessment.find({ status: "Published", deletedAt: null }).distinct("jobId"),
  ]);

  const assessmentJobIdSet = new Set(assessmentJobIds.map((id) => id?.toString()));

  res.json(
    buildPaginatedResponse({
      items: items
        .filter((job) => job.companyId)
        .map((job) => ({
        ...job.toObject(),
        company: job.companyId,
          hasAssessment: assessmentJobIdSet.has(job._id.toString()),
        })),
      total,
      page,
      limit,
    }),
  );
});

export const getPublicJobById = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.jobId,
    status: "Published",
    deletedAt: null,
  }).populate("companyId");

  if (!job || !job.companyId) {
    throw new ApiError(404, "Job not found");
  }

  if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
    throw new ApiError(404, "Job not found");
  }

  const assessment = await Assessment.findOne({
    jobId: job._id,
    status: "Published",
    deletedAt: null,
  }).select("title sections settings integritySettings resultVisibility totalDuration");

  res.json({
    job: {
      ...job.toObject(),
      company: job.companyId,
      hasAssessment: Boolean(assessment),
    },
    assessmentSummary: assessment
      ? {
          title: assessment.title,
          sectionsCount: assessment.sections.length,
          duration: assessment.totalDuration,
          sectionTypes: assessment.sections.map((section) => section.type),
          cameraMonitoring: assessment.integritySettings?.cameraMonitoring || false,
          resultVisibility: assessment.resultVisibility,
          requireResume: assessment.settings?.requireResume || false,
        }
      : null,
  });
});

export const getPublicCompanyById = asyncHandler(async (req, res) => {
  const company = await Company.findOne({
    _id: req.params.companyId,
    verificationStatus: "Verified",
  });

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const activeJobCount = await Job.countDocuments({
    companyId: company._id,
    status: "Published",
    deletedAt: null,
    $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }],
  });

  res.json({
    company,
    activeJobCount,
  });
});

export const getPublicCompanyJobs = asyncHandler(async (req, res) => {
  const company = await Company.findOne({
    _id: req.params.companyId,
    verificationStatus: "Verified",
  });

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const jobs = await Job.find({
    companyId: company._id,
    status: "Published",
    deletedAt: null,
    $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }],
  }).sort({ publishedAt: -1 });

  res.json({
    company,
    jobs,
  });
});
