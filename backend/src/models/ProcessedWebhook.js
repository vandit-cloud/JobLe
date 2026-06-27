import mongoose from "mongoose";

const processedWebhookSchema = new mongoose.Schema(
  {
    provider: String,
    eventId: {
      type: String,
      unique: true,
      required: true,
    },
    eventType: String,
    processedAt: Date,
    status: String,
    errorMessage: String,
  },
  { timestamps: false },
);

export const ProcessedWebhook = mongoose.model("ProcessedWebhook", processedWebhookSchema);
