import mongoose from "mongoose";

const billingProfileSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },
    legalName: String,
    billingEmail: String,
    billingPhone: String,
    address: String,
    taxNumber: String,
    country: String,
    state: String,
    city: String,
    postalCode: String,
  },
  { timestamps: true },
);

export const BillingProfile = mongoose.model("BillingProfile", billingProfileSchema);

