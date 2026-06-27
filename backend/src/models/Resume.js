import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    privateFileKey: {
      type: String,
      required: true,
      trim: true,
    },
    resumeUrl: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    processingStatus: {
      type: String,
      default: "Completed",
    },
    analysisStatus: {
      type: String,
      default: "Pending",
    },
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    confirmedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    analysis: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    visibility: {
      useForApplications: {
        type: Boolean,
        default: true,
      },
      visibleAfterApplication: {
        type: Boolean,
        default: true,
      },
      discoverableByVerifiedRecruiters: {
        type: Boolean,
        default: false,
      },
      keepPrivate: {
        type: Boolean,
        default: true,
      },
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export const Resume = mongoose.model("Resume", resumeSchema);
