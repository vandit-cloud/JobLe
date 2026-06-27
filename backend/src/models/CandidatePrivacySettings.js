import mongoose from "mongoose";

const candidatePrivacySettingsSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      unique: true,
      index: true,
    },
    profileVisibility: {
      type: String,
      default: "Visible only to companies I apply to",
    },
    resumeVisibility: {
      type: String,
      default: "Private",
    },
    skillPassportVisibility: {
      type: String,
      default: "Relevant company only",
    },
    contactVisibility: {
      email: {
        type: Boolean,
        default: false,
      },
      phone: {
        type: Boolean,
        default: false,
      },
      location: {
        type: Boolean,
        default: true,
      },
      socialLinks: {
        type: Boolean,
        default: true,
      },
    },
    recruiterDiscovery: {
      discoverableByVerifiedRecruiters: {
        type: Boolean,
        default: true,
      },
      recruitersCanSendOpportunities: {
        type: Boolean,
        default: true,
      },
      blockedOrganizations: {
        type: [String],
        default: [],
      },
      blockedRecruiters: {
        type: [String],
        default: [],
      },
    },
    communicationPreferences: {
      applicationUpdates: {
        type: Boolean,
        default: true,
      },
      assessmentReminders: {
        type: Boolean,
        default: true,
      },
      interviewReminders: {
        type: Boolean,
        default: true,
      },
      jobRecommendations: {
        type: Boolean,
        default: true,
      },
      recruiterMessages: {
        type: Boolean,
        default: true,
      },
      productAnnouncements: {
        type: Boolean,
        default: false,
      },
      marketingMessages: {
        type: Boolean,
        default: false,
      },
    },
    aiPreferences: {
      enableRecommendations: {
        type: Boolean,
        default: true,
      },
      requestManualReview: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  },
);

export const CandidatePrivacySettings = mongoose.model("CandidatePrivacySettings", candidatePrivacySettingsSchema);
