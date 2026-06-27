import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: String,
    discountValue: Number,
    currency: String,
    validFrom: Date,
    validUntil: Date,
    maximumRedemptions: Number,
    redemptionCount: {
      type: Number,
      default: 0,
    },
    applicablePlanIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "SubscriptionPlan",
      default: [],
    },
    minimumAmount: Number,
    firstPaymentOnly: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Coupon = mongoose.model("Coupon", couponSchema);

