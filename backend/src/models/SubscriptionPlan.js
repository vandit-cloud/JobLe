import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: String,
    monthlyPrice: Number,
    yearlyPrice: Number,
    currency: { type: String, default: "USD" },
    limits: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    features: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    trialDays: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const SubscriptionPlan = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);

