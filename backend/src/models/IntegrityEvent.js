import mongoose from "mongoose";

const integrityEventSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssessmentAttempt",
      required: true,
      index: true,
    },
    invitationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssessmentInvitation",
      default: null,
    },
    eventType: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      default: "info",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

export const IntegrityEvent = mongoose.model("IntegrityEvent", integrityEventSchema);

