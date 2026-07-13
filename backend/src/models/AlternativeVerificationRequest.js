import mongoose from "mongoose";

const alternativeVerificationRequestSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
    assessmentAttemptId: { type: mongoose.Schema.Types.ObjectId, ref: "AssessmentAttempt", required: true, index: true },
    verificationId: { type: mongoose.Schema.Types.ObjectId, ref: "CandidateIdentityVerification", default: null },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    reasonCategory: {
      type: String,
      enum: ["No camera", "Camera not working", "Accessibility need", "Privacy concern", "Religious or medical reason", "Poor internet", "Browser/device issue", "Other"],
      required: true,
    },
    explanation: { type: String, required: true },
    supportingNote: String,
    status: {
      type: String,
      enum: ["Requested", "Approved", "Rejected", "Needs More Information"],
      default: "Requested",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: Date,
    reviewerNote: String,
  },
  { timestamps: true },
);

export const AlternativeVerificationRequest = mongoose.model("AlternativeVerificationRequest", alternativeVerificationRequestSchema);
