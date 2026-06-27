import mongoose from "mongoose";
import { EMPLOYMENT_TYPES, JOB_STATUSES, SALARY_PERIODS, WORKPLACE_TYPES } from "../constants/enums.js";

const jobSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    openings: {
      type: Number,
      min: 1,
      default: 1,
    },
    employmentType: {
      type: String,
      enum: EMPLOYMENT_TYPES,
    },
    workplaceType: {
      type: String,
      enum: WORKPLACE_TYPES,
    },
    location: {
      type: String,
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    responsibilities: {
      type: [String],
      default: [],
    },
    requiredQualifications: {
      type: [String],
      default: [],
    },
    preferredQualifications: {
      type: [String],
      default: [],
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    preferredSkills: {
      type: [String],
      default: [],
    },
    minimumEducation: String,
    minimumExperience: {
      type: Number,
      default: 0,
    },
    maximumExperience: {
      type: Number,
      default: 0,
    },
    certifications: {
      type: [String],
      default: [],
    },
    languages: {
      type: [String],
      default: [],
    },
    salary: {
      minimum: Number,
      maximum: Number,
      currency: {
        type: String,
        default: "USD",
      },
      period: {
        type: String,
        enum: SALARY_PERIODS,
        default: "Yearly",
      },
      showPublicly: {
        type: Boolean,
        default: true,
      },
    },
    applicationDeadline: Date,
    screeningQuestions: {
      type: [String],
      default: [],
    },
    requireResume: {
      type: Boolean,
      default: true,
    },
    requireCoverLetter: {
      type: Boolean,
      default: false,
    },
    applicationInstructions: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: "Draft",
    },
    views: {
      type: Number,
      default: 0,
    },
    publishedAt: Date,
    archivedAt: Date,
    deletedAt: Date,
  },
  {
    timestamps: true,
  },
);

jobSchema.index({ recruiterId: 1, title: "text", department: "text", location: "text" });

export const Job = mongoose.model("Job", jobSchema);

