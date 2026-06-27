import mongoose from "mongoose";
import { INVOICE_STATUSES } from "../constants/enums.js";

const invoiceSchema = new mongoose.Schema(
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
    providerInvoiceId: String,
    invoiceNumber: String,
    planName: String,
    amount: Number,
    discount: Number,
    tax: Number,
    totalAmount: Number,
    currency: String,
    status: {
      type: String,
      enum: INVOICE_STATUSES,
      default: "Pending",
    },
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
    invoiceUrl: String,
    paidAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Invoice = mongoose.model("Invoice", invoiceSchema);

