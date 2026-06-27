import mongoose from "mongoose";
import { USAGE_RESOURCE_TYPES } from "../constants/enums.js";

const usageRecordSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    resourceType: {
      type: String,
      enum: USAGE_RESOURCE_TYPES,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const UsageRecord = mongoose.model("UsageRecord", usageRecordSchema);

