import mongoose from "mongoose";
import { COMPANY_SIZES, VERIFICATION_STATUSES } from "../constants/enums.js";

const companySchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    logo: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      required: true,
      trim: true,
    },
    companySize: {
      type: String,
      enum: COMPANY_SIZES,
    },
    foundedYear: Number,
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    headquarters: {
      type: String,
      trim: true,
    },
    officeLocations: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      trim: true,
    },
    mission: {
      type: String,
      trim: true,
    },
    culture: {
      type: String,
      trim: true,
    },
    benefits: {
      type: [String],
      default: [],
    },
    socialLinks: {
      linkedin: String,
      other: {
        type: [String],
        default: [],
      },
    },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: "Pending",
    },
    profileCompletion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export const Company = mongoose.model("Company", companySchema);

