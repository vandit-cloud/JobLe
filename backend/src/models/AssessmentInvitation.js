import crypto from "crypto";
import mongoose from "mongoose";
import { INVITATION_STATUSES } from "../constants/enums.js";

const assessmentInvitationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
      required: true,
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      default: null,
    },
    candidateName: String,
    candidateEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    candidatePhone: String,
    invitationToken: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(24).toString("hex"),
    },
    status: {
      type: String,
      enum: INVITATION_STATUSES,
      default: "Pending",
    },
    expiresAt: Date,
    maxAttempts: {
      type: Number,
      default: 1,
    },
    attemptsUsed: {
      type: Number,
      default: 0,
    },
    sentAt: Date,
    openedAt: Date,
    resumeSubmittedAt: Date,
    startedAt: Date,
    completedAt: Date,
    lastResentAt: Date,
    cancelledAt: Date,
    emailVerificationCode: String,
    emailVerifiedAt: Date,
  },
  {
    timestamps: true,
  },
);

export const AssessmentInvitation = mongoose.model("AssessmentInvitation", assessmentInvitationSchema);

