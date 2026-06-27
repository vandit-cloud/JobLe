import { BillingProfile } from "../models/BillingProfile.js";
import { Coupon } from "../models/Coupon.js";
import { CreditBalance } from "../models/CreditBalance.js";
import { CreditTransaction } from "../models/CreditTransaction.js";
import { Invoice } from "../models/Invoice.js";
import { PaymentMethod } from "../models/PaymentMethod.js";
import { Subscription } from "../models/Subscription.js";
import { SubscriptionPlan } from "../models/SubscriptionPlan.js";
import { createAuditLog } from "../services/auditService.js";
import { createCheckoutSession, verifyPayment } from "../services/paymentProviderService.js";
import { getSubscriptionContext } from "../services/planLimitService.js";
import { buildUsageOverview } from "../services/usageService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPaginatedResponse, getPagination } from "../utils/pagination.js";

async function getOrganizationSubscription(companyId) {
  const subscription = await Subscription.findOne({ organizationId: companyId }).populate("planId");
  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }
  return subscription;
}

async function getCouponDetails(code, planId, amount) {
  if (!code) return null;
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true });
  if (!coupon) throw new ApiError(404, "Coupon not found");
  if (coupon.validFrom && coupon.validFrom > new Date()) throw new ApiError(400, "Coupon is not active yet");
  if (coupon.validUntil && coupon.validUntil < new Date()) throw new ApiError(400, "Coupon has expired");
  if (coupon.maximumRedemptions && coupon.redemptionCount >= coupon.maximumRedemptions) throw new ApiError(400, "Coupon redemption limit reached");
  if (coupon.applicablePlanIds.length > 0 && !coupon.applicablePlanIds.some((id) => id.toString() === planId.toString())) throw new ApiError(400, "Coupon is not valid for this plan");
  if (coupon.minimumAmount && amount < coupon.minimumAmount) throw new ApiError(400, "Coupon minimum amount not reached");
  return coupon;
}

export const getSubscriptionOverview = asyncHandler(async (req, res) => {
  const [subscription, billingProfile, paymentMethods] = await Promise.all([
    getOrganizationSubscription(req.user.companyId),
    BillingProfile.findOne({ organizationId: req.user.companyId }),
    PaymentMethod.find({ organizationId: req.user.companyId }),
  ]);
  res.json({
    subscription,
    billingProfile,
    paymentMethods,
  });
});

export const getSubscriptionPlans = asyncHandler(async (_req, res) => {
  const plans = await SubscriptionPlan.find({ active: true }).sort({ displayOrder: 1 });
  res.json({ plans });
});

export const getSubscriptionUsage = asyncHandler(async (req, res) => {
  const usage = await buildUsageOverview(req.user.companyId);
  const credits = await CreditBalance.find({ organizationId: req.user.companyId });
  res.json({ usage, credits });
});

export const createSubscriptionCheckout = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlan.findOne({ code: req.body.planCode, active: true });
  if (!plan) throw new ApiError(404, "Plan not found");
  const coupon = await getCouponDetails(req.body.couponCode, plan._id, req.body.billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice);
  const session = await createCheckoutSession({
    organizationId: req.user.companyId,
    plan,
    billingCycle: req.body.billingCycle,
    coupon,
  });
  await BillingProfile.findOneAndUpdate(
    { organizationId: req.user.companyId },
    { ...req.body.billingProfile, organizationId: req.user.companyId },
    { upsert: true, new: true },
  );
  res.status(201).json({
    checkout: session,
    billingCycle: req.body.billingCycle,
    plan,
  });
});

export const verifySubscriptionPayment = asyncHandler(async (req, res) => {
  const verification = await verifyPayment(req.body);
  if (!verification.verified) throw new ApiError(400, "Payment verification failed");

  const subscription = await getOrganizationSubscription(req.user.companyId);
  subscription.status = "Active";
  subscription.nextBillingDate = subscription.currentPeriodEnd;
  await subscription.save();
  const invoice = await Invoice.create({
    organizationId: req.user.companyId,
    subscriptionId: subscription._id,
    providerInvoiceId: verification.invoiceId,
    invoiceNumber: `INV-${Date.now()}`,
    planName: subscription.planId.name,
    amount: subscription.billingCycle === "yearly" ? subscription.planId.yearlyPrice : subscription.planId.monthlyPrice,
    discount: 0,
    tax: 0,
    totalAmount: subscription.billingCycle === "yearly" ? subscription.planId.yearlyPrice : subscription.planId.monthlyPrice,
    currency: subscription.planId.currency,
    status: "Paid",
    billingPeriodStart: subscription.currentPeriodStart,
    billingPeriodEnd: subscription.currentPeriodEnd,
    invoiceUrl: `/api/recruiter/subscription/invoices/${verification.invoiceId}/download`,
    paidAt: new Date(),
  });
  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Subscription",
    entityId: subscription._id,
    action: "payment-verified",
    metadata: { invoiceId: invoice._id, paymentId: verification.paymentId },
  });
  res.json({ verified: true, subscription, invoice });
});

export const upgradeSubscription = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlan.findOne({ code: req.body.planCode, active: true });
  if (!plan) throw new ApiError(404, "Plan not found");
  const subscription = await getOrganizationSubscription(req.user.companyId);
  const previousPlan = subscription.planId.toString();
  subscription.planId = plan._id;
  subscription.billingCycle = req.body.billingCycle || subscription.billingCycle;
  subscription.status = "Active";
  await subscription.save();
  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Subscription",
    entityId: subscription._id,
    action: "plan-upgraded",
    metadata: { previousPlan, newPlan: plan.code },
  });
  res.json({ subscription });
});

export const downgradeSubscription = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlan.findOne({ code: req.body.planCode, active: true });
  if (!plan) throw new ApiError(404, "Plan not found");
  const subscription = await getOrganizationSubscription(req.user.companyId);
  subscription.cancelAtPeriodEnd = true;
  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Subscription",
    entityId: subscription._id,
    action: "downgrade-scheduled",
    metadata: { nextPlan: plan.code, effectiveDate: subscription.currentPeriodEnd },
  });
  res.json({
    message: "Downgrade scheduled for the end of the current billing period.",
    effectiveDate: subscription.currentPeriodEnd,
    nextPlan: plan,
  });
});

export const cancelSubscription = asyncHandler(async (req, res) => {
  const subscription = await getOrganizationSubscription(req.user.companyId);
  subscription.cancelAtPeriodEnd = true;
  subscription.cancelledAt = new Date();
  await subscription.save();
  await createAuditLog({
    recruiterId: req.user.recruiterId,
    entityType: "Subscription",
    entityId: subscription._id,
    action: "subscription-cancelled",
    metadata: { reason: req.body.reason },
  });
  res.json({ subscription });
});

export const reactivateSubscription = asyncHandler(async (req, res) => {
  const subscription = await getOrganizationSubscription(req.user.companyId);
  subscription.cancelAtPeriodEnd = false;
  subscription.cancelledAt = null;
  subscription.status = "Active";
  await subscription.save();
  res.json({ subscription });
});

export const pauseSubscription = asyncHandler(async (req, res) => {
  const subscription = await getOrganizationSubscription(req.user.companyId);
  subscription.status = "Paused";
  subscription.pausedAt = new Date();
  await subscription.save();
  res.json({ subscription });
});

export const getPaymentMethods = asyncHandler(async (req, res) => {
  const paymentMethods = await PaymentMethod.find({ organizationId: req.user.companyId }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ items: paymentMethods });
});

export const createPaymentMethod = asyncHandler(async (req, res) => {
  if (req.body.isDefault) {
    await PaymentMethod.updateMany({ organizationId: req.user.companyId }, { isDefault: false });
  }
  const paymentMethod = await PaymentMethod.create({
    ...req.body,
    organizationId: req.user.companyId,
    providerPaymentMethodId: `pm_${Date.now()}`,
  });
  res.status(201).json({ paymentMethod });
});

export const setDefaultPaymentMethod = asyncHandler(async (req, res) => {
  await PaymentMethod.updateMany({ organizationId: req.user.companyId }, { isDefault: false });
  const paymentMethod = await PaymentMethod.findOneAndUpdate(
    { _id: req.params.paymentMethodId, organizationId: req.user.companyId },
    { isDefault: true },
    { new: true },
  );
  if (!paymentMethod) throw new ApiError(404, "Payment method not found");
  res.json({ paymentMethod });
});

export const deletePaymentMethod = asyncHandler(async (req, res) => {
  const paymentMethod = await PaymentMethod.findOneAndDelete({
    _id: req.params.paymentMethodId,
    organizationId: req.user.companyId,
  });
  if (!paymentMethod) throw new ApiError(404, "Payment method not found");
  res.json({ message: "Payment method removed successfully." });
});

export const getInvoices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { organizationId: req.user.companyId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.plan) filter.planName = req.query.plan;
  const [items, total] = await Promise.all([
    Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Invoice.countDocuments(filter),
  ]);
  res.json(buildPaginatedResponse({ items, total, page, limit }));
});

export const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.invoiceId, organizationId: req.user.companyId });
  if (!invoice) throw new ApiError(404, "Invoice not found");
  res.json({ invoice });
});

export const downloadInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.invoiceId, organizationId: req.user.companyId });
  if (!invoice) throw new ApiError(404, "Invoice not found");
  res.json({
    downloadUrl: invoice.invoiceUrl || null,
    downloadAvailable: Boolean(invoice.invoiceUrl),
  });
});

export const getCredits = asyncHandler(async (req, res) => {
  const [balances, transactions] = await Promise.all([
    CreditBalance.find({ organizationId: req.user.companyId }),
    CreditTransaction.find({ organizationId: req.user.companyId }).sort({ createdAt: -1 }),
  ]);
  res.json({ balances, transactions });
});

export const purchaseCredits = asyncHandler(async (req, res) => {
  const balance = await CreditBalance.findOneAndUpdate(
    { organizationId: req.user.companyId, creditType: req.body.creditType },
    {
      $inc: {
        purchased: req.body.quantity,
        remaining: req.body.quantity,
      },
      $setOnInsert: {
        used: 0,
      },
    },
    { upsert: true, new: true },
  );
  const transaction = await CreditTransaction.create({
    organizationId: req.user.companyId,
    creditType: req.body.creditType,
    transactionType: "purchase",
    quantity: req.body.quantity,
    source: "checkout",
    expiresAt: new Date(Date.now() + 180 * 86400000),
  });
  res.status(201).json({ balance, transaction });
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const amount = req.body.amount || 0;
  const coupon = await getCouponDetails(req.body.code, req.body.planCode || "", amount);
  res.json({
    coupon,
    discount:
      coupon.discountType === "percentage"
        ? Math.round(amount * (coupon.discountValue / 100))
        : coupon.discountValue,
  });
});

export const getPublicPlans = asyncHandler(async (_req, res) => {
  const plans = await SubscriptionPlan.find({ active: true }).sort({ displayOrder: 1 });
  res.json({ plans });
});
