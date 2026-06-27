import { Company } from "../models/Company.js";
import { Recruiter } from "../models/Recruiter.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { computeProfileCompletion } from "../utils/profileCompletion.js";
import { createAuditLog } from "../services/auditService.js";

async function syncRecruiterCompany(recruiterId, companyId) {
  await Recruiter.findByIdAndUpdate(recruiterId, { companyId });
}

function serializeCompany(company) {
  const { percentage, missingFields } = computeProfileCompletion(company);
  return {
    ...company.toObject(),
    profileCompletion: percentage,
    missingFields,
  };
}

export const getCompanyProfile = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ recruiterId: req.user.recruiterId });

  if (!company) {
    return res.json({
      company: null,
      profileCompletion: 0,
      missingFields: ["name", "industry", "description"],
    });
  }

  const { percentage, missingFields } = computeProfileCompletion(company);
  if (company.profileCompletion !== percentage) {
    company.profileCompletion = percentage;
    await company.save();
  }

  res.json({
    company,
    profileCompletion: percentage,
    missingFields,
  });
});

export const createCompanyProfile = asyncHandler(async (req, res) => {
  const existingCompany = await Company.findOne({ recruiterId: req.user.recruiterId });

  if (existingCompany) {
    throw new ApiError(409, "A company profile already exists for this recruiter");
  }

  const company = await Company.create({
    ...req.body,
    recruiterId: req.user.recruiterId,
  });

  const { percentage } = computeProfileCompletion(company);
  company.profileCompletion = percentage;
  await company.save();
  await syncRecruiterCompany(req.user.recruiterId, company._id);
  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Company",
    entityId: company._id,
    action: "created",
  });

  res.status(201).json({
    company: serializeCompany(company),
  });
});

export const updateCompanyProfile = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ recruiterId: req.user.recruiterId });
  if (!company) {
    throw new ApiError(404, "Company profile not found");
  }

  const safeBody = { ...req.body };
  delete safeBody.verificationStatus;

  Object.assign(company, safeBody);
  const { percentage } = computeProfileCompletion(company);
  company.profileCompletion = percentage;
  await company.save();

  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Company",
    entityId: company._id,
    action: "updated",
  });

  res.json({
    company: serializeCompany(company),
  });
});

export const uploadCompanyLogo = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ recruiterId: req.user.recruiterId });
  if (!company) {
    throw new ApiError(404, "Company profile not found");
  }

  if (!req.file) {
    throw new ApiError(400, "Logo file is required");
  }

  company.logo = `/uploads/logos/${req.file.filename}`;
  await company.save();

  res.status(201).json({
    logo: company.logo,
  });
});

