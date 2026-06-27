import { Invoice } from "../models/Invoice.js";
import { ProcessedWebhook } from "../models/ProcessedWebhook.js";
import { Subscription } from "../models/Subscription.js";
import { parseWebhookEvent, verifyWebhookSignature } from "../services/paymentProviderService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const handlePaymentWebhook = asyncHandler(async (req, res) => {
  verifyWebhookSignature(req);
  const event = parseWebhookEvent(req.body);
  const existing = await ProcessedWebhook.findOne({ eventId: event.eventId });
  if (existing) {
    return res.json({ received: true, duplicate: true });
  }

  const processed = await ProcessedWebhook.create({
    provider: event.provider,
    eventId: event.eventId,
    eventType: event.eventType,
    processedAt: new Date(),
    status: "processed",
  });

  if (event.eventType === "invoice.paid" && event.data.subscriptionId) {
    await Invoice.findOneAndUpdate({ providerInvoiceId: event.data.invoiceId }, { status: "Paid", paidAt: new Date() });
    await Subscription.findByIdAndUpdate(event.data.subscriptionId, { status: "Active" });
  }

  res.json({ received: true, processedId: processed._id });
});
