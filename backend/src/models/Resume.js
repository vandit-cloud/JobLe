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
    quarantineFileKey: {
      type: String,
      default: "",
      trim: true,
    },
    cleanFileKey: {
      type: String,
      default: "",
      trim: true,
    },
    rejectedFileKey: {
      type: String,
      default: "",
      trim: true,
    },
    storageZone: {
      type: String,
      enum: ["quarantine", "clean", "rejected", "legacy"],
      default: "clean",
      index: true,
    },
    securityStatus: {
      type: String,
      enum: ["UPLOADING", "QUARANTINED", "VALIDATING", "SCANNING", "SANITIZING", "EXTRACTING", "WAITING_FOR_CONFIRMATION", "CLEAN", "REJECTED", "FAILED"],
      default: "UPLOADING",
      index: true,
    },
    confirmationStatus: {
      type: String,
      enum: ["PENDING", "CONFIRMED"],
      default: "PENDING",
      index: true,
    },
    rejectedReasonCode: {
      type: String,
      default: "",
      trim: true,
    },
    sanitizedAt: {
      type: Date,
      default: null,
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
    fileHash: {
      type: String,
      trim: true,
      index: true,
    },
    pageCount: {
      type: Number,
      default: null,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    processingStatus: {
      type: String,
      default: "Uploading",
    },
    analysisStatus: {
      type: String,
      default: "Processing",
    },
    uploadWarnings: {
      type: [String],
      default: [],
    },
    uploadChecks: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    extractionError: {
      type: String,
      default: "",
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
    accessLog: {
      type: [
        {
          actorRole: String,
          actorId: String,
          action: String,
          ipAddress: String,
          reasonCode: String,
          accessedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    securityEvents: {
      type: [
        {
          eventType: String,
          status: String,
          reasonCode: String,
          message: String,
          details: mongoose.Schema.Types.Mixed,
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const Resume = mongoose.model("Resume", resumeSchema);
