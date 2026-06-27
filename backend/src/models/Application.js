import mongoose from "mongoose";
import { APPLICATION_STATUSES } from "../constants/enums.js";

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
      required: true,
      index: true,
    },
    resumeUrl: {
      type: String,
      required: true,
    },
    coverLetter: String,
    screeningAnswers: {
      type: [
        {
          question: String,
          answer: String,
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: "Applied",
    },
    matchAnalysis: {
      overallScore: Number,
      scores: {
        skills: Number,
        experience: Number,
        education: Number,
        projects: Number,
        preference: Number,
      },
      matchedSkills: {
        type: [String],
        default: [],
      },
      missingSkills: {
        type: [String],
        default: [],
      },
      explanation: String,
      recommendationLabel: {
        type: String,
        default: "AI recommendation",
      },
      lastAnalyzedAt: Date,
    },
    recruiterNotes: {
      type: [
        {
          note: String,
          action: String,
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    shortlistedAt: Date,
    rejectedAt: Date,
    selectedAt: Date,
    withdrawnAt: Date,
  },
  {
    timestamps: true,
  },
);

export const Application = mongoose.model("Application", applicationSchema);
