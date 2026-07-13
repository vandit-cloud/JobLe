import mongoose from "mongoose";

const consentSchema = new mongoose.Schema(
  {
    consentAccepted: { type: Boolean, default: false },
    consentAcceptedAt: Date,
    noticeVersion: { type: String, default: "identity-verification-v1" },
    ipAddress: String,
    userAgent: String,
  },
  { _id: false },
);

const livenessSchema = new mongoose.Schema(
  {
    required: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Not Required", "Pending", "Passed", "Failed", "Manual Review Required"],
      default: "Not Required",
    },
    challengeType: String,
    completedAt: Date,
    failedReason: String,
  },
  { _id: false },
);

const imageSchema = new mongoose.Schema(
  {
    key: String,
    hash: String,
    mimeType: String,
    size: Number,
    embedding: { type: [Number], default: [] },
    qualityScore: { type: Number, default: 0 },
    issues: { type: [String], default: [] },
    capturedAt: Date,
  },
  { _id: false },
);

const systemCheckSchema = new mongoose.Schema(
  {
    cameraPermissionGranted: Boolean,
    cameraDeviceAvailable: Boolean,
    videoStreamWorking: Boolean,
    candidateFaceVisible: Boolean,
    onlyOneFaceVisible: Boolean,
    lightingSufficient: Boolean,
    frameNotBlurry: Boolean,
    browserSupported: Boolean,
    fullscreenSupported: Boolean,
    internetStable: Boolean,
    checkedAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { _id: false },
);

const candidateIdentityVerificationSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
    assessmentAttemptId: { type: mongoose.Schema.Types.ObjectId, ref: "AssessmentAttempt", required: true, index: true, unique: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment", required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },
    consent: { type: consentSchema, default: () => ({}) },
    systemCheck: { type: systemCheckSchema, default: null },
    referenceImages: {
      front: { type: imageSchema, default: null },
      left: { type: imageSchema, default: null },
      right: { type: imageSchema, default: null },
    },
    liveness: { type: livenessSchema, default: () => ({}) },
    status: {
      type: String,
      enum: [
        "NOT_STARTED",
        "CONSENT_REQUIRED",
        "CAMERA_CHECK_FAILED",
        "REFERENCE_CAPTURE_IN_PROGRESS",
        "REFERENCE_CAPTURED",
        "LIVENESS_PENDING",
        "VERIFIED",
        "FAILED",
        "MANUAL_REVIEW_REQUIRED",
        "ALTERNATIVE_REQUESTED",
      ],
      default: "CONSENT_REQUIRED",
    },
    reviewStatus: {
      type: String,
      enum: ["Unreviewed", "Reviewed", "Ignored", "Explanation Requested", "Retest Requested"],
      default: "Unreviewed",
    },
    recruiterNote: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: Date,
    candidateExplanation: {
      category: String,
      explanation: String,
      submittedAt: Date,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 86400000),
      index: true,
    },
  },
  { timestamps: true },
);

export const CandidateIdentityVerification = mongoose.model("CandidateIdentityVerification", candidateIdentityVerificationSchema);
