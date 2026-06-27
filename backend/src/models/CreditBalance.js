import mongoose from "mongoose";
import { CREDIT_TYPES } from "../constants/enums.js";

const creditBalanceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    creditType: {
      type: String,
      enum: CREDIT_TYPES,
      required: true,
    },
    purchased: {
      type: Number,
      default: 0,
    },
    used: {
      type: Number,
      default: 0,
    },
    remaining: {
      type: Number,
      default: 0,
    },
    expiresAt: Date,
  },
  { timestamps: true },
);

export const CreditBalance = mongoose.model("CreditBalance", creditBalanceSchema);

