import { AlternativeVerificationRequest } from "../models/AlternativeVerificationRequest.js";
import { CandidateIdentityVerification } from "../models/CandidateIdentityVerification.js";
import { IdentityVerificationEvent } from "../models/IdentityVerificationEvent.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAdminIdentityVerificationEvents = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.severity) filter.severity = req.query.severity;
  if (req.query.eventType) filter.eventType = req.query.eventType;
  if (req.query.reviewed === "true") filter.reviewed = true;
  if (req.query.reviewed === "false") filter.reviewed = false;

  const events = await IdentityVerificationEvent.find(filter)
    .populate("candidateId", "name email")
    .populate("assessmentAttemptId", "candidateProfile totalScore status submittedAt")
    .populate("organizationId", "name")
    .sort({ createdAt: -1 })
    .limit(200);

  res.json({
    warning: "Identity events are review indicators only and must not be treated as automatic proof of misconduct.",
    items: events,
  });
});

export const getAdminAlternativeVerificationRequests = asyncHandler(async (_req, res) => {
  const requests = await AlternativeVerificationRequest.find()
    .populate("candidateId", "name email")
    .populate("assessmentAttemptId", "candidateProfile status submittedAt")
    .populate("organizationId", "name")
    .sort({ createdAt: -1 })
    .limit(200);

  res.json({ items: requests });
});

export const reviewAdminAlternativeVerificationRequest = asyncHandler(async (req, res) => {
  const request = await AlternativeVerificationRequest.findById(req.params.requestId);
  if (!request) throw new ApiError(404, "Alternative verification request not found.");

  request.status = req.body.status || "Needs More Information";
  request.reviewerNote = req.body.reviewerNote || "";
  request.reviewedBy = req.user.userId;
  request.reviewedAt = new Date();
  await request.save();

  if (request.verificationId) {
    const verification = await CandidateIdentityVerification.findById(request.verificationId);
    if (verification) {
      verification.reviewStatus = request.status === "Approved" ? "Reviewed" : "Explanation Requested";
      verification.recruiterNote = request.reviewerNote || `Alternative verification ${request.status}`;
      verification.reviewedBy = req.user.userId;
      verification.reviewedAt = new Date();
      await verification.save();
    }
  }

  res.json({ request });
});
