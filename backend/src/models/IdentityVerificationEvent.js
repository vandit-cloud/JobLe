import mongoose from "mongoose";

const identityVerificationEventSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
    assessmentAttemptId: { type: mongoose.Schema.Types.ObjectId, ref: "AssessmentAttempt", required: true, index: true },
    verificationId: { type: mongoose.Schema.Types.ObjectId, ref: "CandidateIdentityVerification", required: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    eventType: { type: String, required: true, index: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    durationSeconds: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    severity: {
      type: String,
      enum: ["INFO", "LOW", "MEDIUM", "REVIEW_REQUIRED", "HIGH_REVIEW_REQUIRED"],
      default: "INFO",
    },
    source: { type: String, default: "camera" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    snapshotKey: String,
    reviewed: { type: Boolean, default: false },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: Date,
    recruiterNote: String,
  },
  { timestamps: true },
);

export const IdentityVerificationEvent = mongoose.model("IdentityVerificationEvent", identityVerificationEventSchema);
