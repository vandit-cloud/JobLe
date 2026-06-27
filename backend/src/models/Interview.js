import mongoose from "mongoose";
import { INTERVIEW_STATUSES, INTERVIEW_TYPES, RECOMMENDATION_OPTIONS } from "../constants/enums.js";

const interviewSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    round: {
      type: String,
      default: "Round 1",
      trim: true,
    },
    startDateTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 15,
    },
    timezone: {
      type: String,
      required: true,
    },
    interviewType: {
      type: String,
      enum: INTERVIEW_TYPES,
      required: true,
    },
    interviewerName: {
      type: String,
      required: true,
      trim: true,
    },
    interviewerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    meetingLink: String,
    location: String,
    notes: String,
    candidateInstructions: {
      type: String,
      default: "",
    },
    candidateStatus: {
      type: String,
      default: "Pending Confirmation",
    },
    recruiterStatus: {
      type: String,
      default: "Scheduled",
    },
    rescheduleRequest: {
      status: {
        type: String,
        default: "None",
      },
      reason: {
        type: String,
        default: "",
      },
      preferredDates: {
        type: [String],
        default: [],
      },
      preferredTimeRanges: {
        type: [String],
        default: [],
      },
      additionalNote: {
        type: String,
        default: "",
      },
      requestedAt: {
        type: Date,
        default: null,
      },
    },
    status: {
      type: String,
      enum: INTERVIEW_STATUSES,
      default: "Scheduled",
    },
    feedback: {
      technicalSkillsScore: Number,
      communicationScore: Number,
      problemSolvingScore: Number,
      relevantExperienceScore: Number,
      strengths: String,
      concerns: String,
      internalNotes: String,
      recommendation: {
        type: String,
        enum: RECOMMENDATION_OPTIONS,
      },
      submittedAt: Date,
    },
  },
  {
    timestamps: true,
  },
);

export const Interview = mongoose.model("Interview", interviewSchema);
