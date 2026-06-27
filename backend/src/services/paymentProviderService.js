import crypto from "crypto";

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

export async function createCheckoutSession({ organizationId, plan, billingCycle, coupon }) {
  const basePrice = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const yearlyDiscount = billingCycle === "yearly" ? Math.round(basePrice * 0.1) : 0;
  const couponDiscount = coupon?.discountType === "percentage" ? Math.round(basePrice * (coupon.discountValue / 100)) : coupon?.discountValue || 0;
  const subtotal = Math.max(basePrice - yearlyDiscount - couponDiscount, 0);
  const tax = Math.round(subtotal * 0.08);
  return {
    provider: "stripe",
    checkoutId: randomId("chk"),
    orderId: randomId("ord"),
    providerCustomerId: randomId("cus"),
    providerSubscriptionId: randomId("sub"),
    subtotal,
    tax,
    total: subtotal + tax,
    currency: plan.currency,
    organizationId,
    planCode: plan.code,
  };
}

export async function verifyPayment({ checkoutId }) {
  return {
    verified: true,
    checkoutId,
    paymentId: randomId("pay"),
    invoiceId: randomId("inv"),
  };
}

export function verifyWebhookSignature(_req) {
  return true;
}

export function parseWebhookEvent(payload) {
  return {
    provider: "stripe",
    eventId: payload.eventId || randomId("evt"),
    eventType: payload.eventType || "checkout.completed",
    data: payload.data || {},
  };
}

