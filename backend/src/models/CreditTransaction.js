import mongoose from "mongoose";
import { CREDIT_TYPES } from "../constants/enums.js";

const creditTransactionSchema = new mongoose.Schema(
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
    transactionType: String,
    quantity: Number,
    source: String,
    relatedEntityId: mongoose.Schema.Types.ObjectId,
    expiresAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const CreditTransaction = mongoose.model("CreditTransaction", creditTransactionSchema);

