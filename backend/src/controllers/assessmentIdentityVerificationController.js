import fs from "fs";
import path from "path";
import { AssessmentAttempt } from "../models/AssessmentAttempt.js";
import { CandidateIdentityVerification } from "../models/CandidateIdentityVerification.js";
import { IdentityVerificationEvent } from "../models/IdentityVerificationEvent.js";
import { AlternativeVerificationRequest } from "../models/AlternativeVerificationRequest.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { compareVerificationImage, getSkillVerificationStorageRoot, saveVerificationImage } from "../utils/skillVerificationStorage.js";
import { createIdentityImageAccessToken, verifyIdentityImageAccessToken } from "../utils/identityVerificationAccessToken.js";

const NOTICE_VERSION = "identity-verification-v1";
const ALLOWED_CAPTURE_ANGLES = new Set(["front", "left", "right"]);
const EVENT_SEVERITY_MAP = {
  CAMERA_PERMISSION_DENIED: "REVIEW_REQUIRED",
  CAMERA_STREAM_STOPPED: "REVIEW_REQUIRED",
  CAMERA_PERMISSION_REVOKED: "HIGH_REVIEW_REQUIRED",
  CANDIDATE_NOT_VISIBLE: "REVIEW_REQUIRED",
  MULTIPLE_PEOPLE_VISIBLE: "HIGH_REVIEW_REQUIRED",
  POSSIBLE_IDENTITY_MISMATCH: "HIGH_REVIEW_REQUIRED",
  LOW_LIGHT: "LOW",
  CAMERA_COVERED: "REVIEW_REQUIRED",
  VIDEO_FROZEN: "REVIEW_REQUIRED",
  FACE_OUTSIDE_FRAME: "MEDIUM",
  ALTERNATIVE_VERIFICATION_REQUESTED: "REVIEW_REQUIRED",
};

function reportWarning() {
  return "Identity verification events are automated indicators. They may be incorrect and should be reviewed by a human before any hiring decision.";
}

async function getCandidateAttempt(req) {
  const attempt = await AssessmentAttempt.findById(req.params.attemptId).populate("assessmentId invitationId candidateId");
  if (!attempt) throw new ApiError(404, "Assessment attempt not found");
  if (!attempt.candidateId || attempt.candidateId._id.toString() !== req.user.candidateId) {
    throw new ApiError(403, "You do not have access to this assessment verification.");
  }
  return attempt;
}

async function getRecruiterAttempt(req) {
  const attempt = await AssessmentAttempt.findOne({ _id: req.params.attemptId, organizationId: req.user.companyId }).populate("assessmentId invitationId candidateId");
  if (!attempt) throw new ApiError(404, "Assessment result not found");
  return attempt;
}

async function getOrCreateVerification(attempt, req) {
  let verification = await CandidateIdentityVerification.findOne({ assessmentAttemptId: attempt._id });
  if (!verification) {
    verification = await CandidateIdentityVerification.create({
      candidateId: attempt.candidateId?._id || attempt.candidateId,
      assessmentAttemptId: attempt._id,
      organizationId: attempt.organizationId,
      companyId: attempt.organizationId,
      assessmentId: attempt.assessmentId?._id || attempt.assessmentId,
      jobId: attempt.assessmentId?.jobId || null,
      consent: {
        consentAccepted: false,
        noticeVersion: NOTICE_VERSION,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
        userAgent: req.headers["user-agent"] || "",
      },
      status: "CONSENT_REQUIRED",
    });
  }
  return verification;
}

async function recordIdentityEvent({ verification, attempt, eventType, metadata = {}, confidence = 0, severity, source = "camera", snapshotKey = "" }) {
  const event = await IdentityVerificationEvent.create({
    candidateId: verification.candidateId,
    assessmentAttemptId: attempt._id,
    verificationId: verification._id,
    organizationId: attempt.organizationId,
    eventType,
    startedAt: metadata.startedAt ? new Date(metadata.startedAt) : new Date(),
    endedAt: metadata.endedAt ? new Date(metadata.endedAt) : undefined,
    durationSeconds: Number(metadata.durationSeconds || 0),
    confidence: Number(confidence || metadata.confidence || 0),
    severity: severity || EVENT_SEVERITY_MAP[eventType] || "INFO",
    source,
    metadata,
    snapshotKey,
  });
  attempt.activityTimeline.push({ label: eventType, metadata: { source, confidence: event.confidence } });
  await attempt.save();
  return event;
}

function verificationSummary(verification, events = [], alternativeRequests = []) {
  return {
    status: verification?.status || "NOT_STARTED",
    reviewStatus: verification?.reviewStatus || "Unreviewed",
    frontCaptured: Boolean(verification?.referenceImages?.front?.key),
    leftCaptured: Boolean(verification?.referenceImages?.left?.key),
    rightCaptured: Boolean(verification?.referenceImages?.right?.key),
    livenessStatus: verification?.liveness?.status || "Not Required",
    identityMismatchEvents: events.filter((event) => event.eventType === "POSSIBLE_IDENTITY_MISMATCH").length,
    faceNotVisibleEvents: events.filter((event) => event.eventType === "CANDIDATE_NOT_VISIBLE").length,
    multiplePeopleEvents: events.filter((event) => event.eventType === "MULTIPLE_PEOPLE_VISIBLE").length,
    cameraInterruptions: events.filter((event) => ["CAMERA_STREAM_STOPPED", "CAMERA_PERMISSION_REVOKED", "CAMERA_DEVICE_CHANGED"].includes(event.eventType)).length,
    alternativeRequests: alternativeRequests.length,
  };
}

function buildSignedImageUrl(req, verificationId, angle) {
  const token = createIdentityImageAccessToken({
    verificationId: verificationId.toString(),
    angle,
    actorRole: req.user.role,
    actorId: req.user.userId,
  });
  return `${req.protocol}://${req.get("host")}/api/recruiter/identity-verification/image/${token}`;
}

export const getCandidateIdentityStatus = asyncHandler(async (req, res) => {
  const attempt = await getCandidateAttempt(req);
  const verification = await getOrCreateVerification(attempt, req);
  const [events, alternativeRequests] = await Promise.all([
    IdentityVerificationEvent.find({ verificationId: verification._id }).sort({ createdAt: 1 }),
    AlternativeVerificationRequest.find({ verificationId: verification._id }).sort({ createdAt: -1 }),
  ]);
  res.json({ verification, summary: verificationSummary(verification, events, alternativeRequests), events, alternativeRequests, warning: reportWarning() });
});

export const acceptCandidateIdentityConsent = asyncHandler(async (req, res) => {
  const attempt = await getCandidateAttempt(req);
  const verification = await getOrCreateVerification(attempt, req);
  verification.consent = {
    consentAccepted: true,
    consentAcceptedAt: new Date(),
    noticeVersion: NOTICE_VERSION,
    ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
    userAgent: req.headers["user-agent"] || "",
  };
  verification.status = "NOT_STARTED";
  await verification.save();
  await recordIdentityEvent({ verification, attempt, eventType: "CAMERA_STREAM_STARTED", source: "system", metadata: { consentAccepted: true } });
  res.json({ verification });
});

export const recordCandidateIdentitySystemCheck = asyncHandler(async (req, res) => {
  const attempt = await getCandidateAttempt(req);
  const verification = await getOrCreateVerification(attempt, req);
  if (!verification.consent?.consentAccepted) throw new ApiError(403, "Camera consent is required first.");
  verification.systemCheck = {
    ...req.body,
    checkedAt: new Date(),
  };
  const passed = Boolean(
    req.body.cameraPermissionGranted &&
      req.body.cameraDeviceAvailable &&
      req.body.videoStreamWorking &&
      req.body.candidateFaceVisible &&
      req.body.onlyOneFaceVisible &&
      req.body.lightingSufficient &&
      req.body.frameNotBlurry &&
      req.body.browserSupported &&
      req.body.internetStable,
  );
  verification.status = passed ? "REFERENCE_CAPTURE_IN_PROGRESS" : "CAMERA_CHECK_FAILED";
  await verification.save();
  await recordIdentityEvent({ verification, attempt, eventType: passed ? "CAMERA_STREAM_STARTED" : "CAMERA_PERMISSION_DENIED", source: "camera", metadata: req.body });
  res.json({ verification, passed });
});

export const captureCandidateIdentityAngle = asyncHandler(async (req, res) => {
  const attempt = await getCandidateAttempt(req);
  const verification = await getOrCreateVerification(attempt, req);
  const angle = req.params.angle;
  if (!ALLOWED_CAPTURE_ANGLES.has(angle)) throw new ApiError(400, "Capture angle must be front, left, or right.");
  if (!verification.consent?.consentAccepted) throw new ApiError(403, "Camera consent is required first.");
  if (!req.body.image?.imageData || !req.body.image?.signature) throw new ApiError(400, "Camera image is required.");

  const saved = saveVerificationImage({
    candidateId: attempt.candidateId._id || attempt.candidateId,
    angle,
    imageData: req.body.image.imageData,
    signature: req.body.image.signature,
    metrics: req.body.image.metrics || {},
    prefix: `assessment_${attempt._id}`,
  });
  verification.referenceImages[angle] = {
    key: saved.fileKey,
    hash: saved.fileHash,
    mimeType: saved.mimeType,
    size: saved.size,
    embedding: saved.signature,
    qualityScore: saved.qualityScore,
    issues: saved.issues,
    capturedAt: saved.capturedAt,
  };
  const allCaptured = ["front", "left", "right"].every((key) => verification.referenceImages?.[key]?.key);
  verification.status = allCaptured ? "REFERENCE_CAPTURED" : "REFERENCE_CAPTURE_IN_PROGRESS";
  await verification.save();
  await recordIdentityEvent({ verification, attempt, eventType: `${angle.toUpperCase()}_PHOTO_CAPTURED`, source: "camera", metadata: { qualityScore: saved.qualityScore, issues: saved.issues } });
  res.json({ verification });
});

export const completeCandidateIdentityLiveness = asyncHandler(async (req, res) => {
  const attempt = await getCandidateAttempt(req);
  const verification = await getOrCreateVerification(attempt, req);
  verification.liveness = {
    required: Boolean(req.body.required),
    status: req.body.status || "Passed",
    challengeType: req.body.challengeType || "Look at camera",
    completedAt: new Date(),
    failedReason: req.body.failedReason || "",
  };
  verification.status = verification.liveness.status === "Passed" || verification.liveness.status === "Not Required" ? "VERIFIED" : "MANUAL_REVIEW_REQUIRED";
  await verification.save();
  await recordIdentityEvent({
    verification,
    attempt,
    eventType: verification.liveness.status === "Passed" ? "LIVENESS_CHECK_PASSED" : "LIVENESS_CHECK_FAILED",
    source: "camera",
    metadata: verification.liveness,
  });
  res.json({ verification });
});

export const completeCandidateIdentityVerification = asyncHandler(async (req, res) => {
  const attempt = await getCandidateAttempt(req);
  const verification = await getOrCreateVerification(attempt, req);
  const allCaptured = ["front", "left", "right"].every((key) => verification.referenceImages?.[key]?.key);
  if (!allCaptured) throw new ApiError(400, "Front, left, and right reference photos are required.");
  verification.status = verification.liveness?.required && verification.liveness.status === "Pending" ? "LIVENESS_PENDING" : "VERIFIED";
  await verification.save();
  res.json({ verification });
});

export const recordCandidateIdentityEvent = asyncHandler(async (req, res) => {
  const attempt = await getCandidateAttempt(req);
  const verification = await getOrCreateVerification(attempt, req);
  const event = await recordIdentityEvent({
    verification,
    attempt,
    eventType: req.body.eventType,
    source: req.body.source || "camera",
    metadata: req.body.metadata || {},
    confidence: req.body.confidence || 0,
    severity: req.body.severity,
  });
  res.status(201).json({ event });
});

export const requestAlternativeVerification = asyncHandler(async (req, res) => {
  const attempt = await getCandidateAttempt(req);
  const verification = await getOrCreateVerification(attempt, req);
  const request = await AlternativeVerificationRequest.create({
    candidateId: attempt.candidateId._id || attempt.candidateId,
    assessmentAttemptId: attempt._id,
    verificationId: verification._id,
    organizationId: attempt.organizationId,
    reasonCategory: req.body.reasonCategory,
    explanation: req.body.explanation,
    supportingNote: req.body.supportingNote || "",
  });
  verification.status = "ALTERNATIVE_REQUESTED";
  await verification.save();
  await recordIdentityEvent({ verification, attempt, eventType: "ALTERNATIVE_VERIFICATION_REQUESTED", source: "candidate", metadata: { reasonCategory: req.body.reasonCategory } });
  res.status(201).json({ request, verification });
});

export const submitCandidateIdentityExplanation = asyncHandler(async (req, res) => {
  const attempt = await getCandidateAttempt(req);
  const verification = await getOrCreateVerification(attempt, req);
  verification.candidateExplanation = {
    category: req.body.category,
    explanation: req.body.explanation,
    submittedAt: new Date(),
  };
  await verification.save();
  await recordIdentityEvent({ verification, attempt, eventType: "CANDIDATE_EXPLANATION_SUBMITTED", source: "candidate", metadata: verification.candidateExplanation });
  res.json({ verification });
});

export const getRecruiterIdentityReport = asyncHandler(async (req, res) => {
  const attempt = await getRecruiterAttempt(req);
  const verification = await CandidateIdentityVerification.findOne({ assessmentAttemptId: attempt._id });
  if (!verification) throw new ApiError(404, "Identity verification report not found.");
  const [events, alternativeRequests] = await Promise.all([
    IdentityVerificationEvent.find({ verificationId: verification._id }).sort({ startedAt: 1, createdAt: 1 }),
    AlternativeVerificationRequest.find({ verificationId: verification._id }).sort({ createdAt: -1 }),
  ]);
  const imageUrls = {
    front: verification.referenceImages?.front?.key ? buildSignedImageUrl(req, verification._id, "front") : "",
    left: verification.referenceImages?.left?.key ? buildSignedImageUrl(req, verification._id, "left") : "",
    right: verification.referenceImages?.right?.key ? buildSignedImageUrl(req, verification._id, "right") : "",
  };
  res.json({
    attempt,
    verification,
    events,
    alternativeRequests,
    imageUrls,
    summary: verificationSummary(verification, events, alternativeRequests),
    warning: reportWarning(),
  });
});

export const reviewRecruiterIdentityReport = asyncHandler(async (req, res) => {
  const attempt = await getRecruiterAttempt(req);
  const verification = await CandidateIdentityVerification.findOne({ assessmentAttemptId: attempt._id });
  if (!verification) throw new ApiError(404, "Identity verification report not found.");
  verification.reviewStatus = req.body.reviewStatus || "Reviewed";
  verification.recruiterNote = req.body.recruiterNote || "";
  verification.reviewedBy = req.user.userId;
  verification.reviewedAt = new Date();
  await verification.save();
  res.json({ verification });
});

export const requestIdentityRetest = asyncHandler(async (req, res) => {
  const attempt = await getRecruiterAttempt(req);
  const verification = await CandidateIdentityVerification.findOne({ assessmentAttemptId: attempt._id });
  if (!verification) throw new ApiError(404, "Identity verification report not found.");
  verification.reviewStatus = "Retest Requested";
  verification.recruiterNote = req.body.note || "Recruiter requested identity retest.";
  verification.reviewedBy = req.user.userId;
  verification.reviewedAt = new Date();
  await verification.save();
  res.json({ verification });
});

export const requestCandidateExplanation = asyncHandler(async (req, res) => {
  const attempt = await getRecruiterAttempt(req);
  const verification = await CandidateIdentityVerification.findOne({ assessmentAttemptId: attempt._id });
  if (!verification) throw new ApiError(404, "Identity verification report not found.");
  verification.reviewStatus = "Explanation Requested";
  verification.recruiterNote = req.body.note || "Recruiter requested candidate explanation.";
  verification.reviewedBy = req.user.userId;
  verification.reviewedAt = new Date();
  await verification.save();
  res.json({ verification });
});

export const streamSignedIdentityImage = asyncHandler(async (req, res) => {
  const payload = verifyIdentityImageAccessToken(req.params.token);
  const verification = await CandidateIdentityVerification.findById(payload.verificationId);
  if (!verification) throw new ApiError(404, "Identity image not found.");
  if (req.user.role !== "admin" && verification.organizationId.toString() !== req.user.companyId) {
    throw new ApiError(403, "You do not have access to this identity image.");
  }
  const image = verification.referenceImages?.[payload.angle];
  if (!image?.key) throw new ApiError(404, "Identity image not found.");
  const root = getSkillVerificationStorageRoot();
  const filePath = path.resolve(root, image.key);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath)) throw new ApiError(404, "Identity image not found.");
  res.setHeader("Content-Type", image.mimeType || "image/jpeg");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(filePath);
});
