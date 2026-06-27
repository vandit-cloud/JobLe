import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    providerPaymentMethodId: String,
    type: String,
    brand: String,
    lastFour: String,
    expiryMonth: Number,
    expiryYear: Number,
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const PaymentMethod = mongoose.model("PaymentMethod", paymentMethodSchema);

