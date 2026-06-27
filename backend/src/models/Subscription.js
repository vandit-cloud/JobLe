import mongoose from "mongoose";
import { BILLING_CYCLES, SUBSCRIPTION_STATUSES } from "../constants/enums.js";

const subscriptionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },
    provider: {
      type: String,
      default: "stripe",
    },
    providerCustomerId: String,
    providerSubscriptionId: String,
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "Trial",
    },
    billingCycle: {
      type: String,
      enum: BILLING_CYCLES,
      default: "monthly",
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    trialStart: Date,
    trialEnd: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    cancelledAt: Date,
    pausedAt: Date,
    nextBillingDate: Date,
  },
  { timestamps: true },
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);

