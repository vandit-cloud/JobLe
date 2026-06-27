import { CreditBalance } from "../models/CreditBalance.js";
import { Subscription } from "../models/Subscription.js";
import { SubscriptionPlan } from "../models/SubscriptionPlan.js";
import { UsageRecord } from "../models/UsageRecord.js";
import { ApiError } from "../utils/apiError.js";

const RESOURCE_TO_CREDIT_TYPE = {
  candidateInvitations: "candidateInvitationCredits",
  aiQuestionGenerations: "aiQuestionCredits",
  resumeAnalyses: "resumeAnalysisCredits",
  codingExecutions: "codingExecutionCredits",
  proctoringMinutes: "cameraProctoringCredits",
};

export async function getSubscriptionContext(organizationId) {
  const subscription = await Subscription.findOne({ organizationId }).populate("planId");
  if (!subscription) {
    return null;
  }

  return {
    subscription,
    plan: subscription.planId,
  };
}

export async function getUsageSnapshot(organizationId, resourceType) {
  const context = await getSubscriptionContext(organizationId);
  if (!context) {
    return {
      used: 0,
      limit: null,
      remaining: null,
      resetDate: null,
      subscription: null,
      plan: null,
    };
  }

  const records = await UsageRecord.find({
    organizationId,
    subscriptionId: context.subscription._id,
    resourceType,
    billingPeriodStart: { $gte: context.subscription.currentPeriodStart },
  });
  const used = records.reduce((sum, record) => sum + record.quantity, 0);
  const limit = context.plan?.limits?.[resourceType] ?? null;
  return {
    used,
    limit,
    remaining: limit === null || limit === undefined ? null : Math.max(limit - used, 0),
    resetDate: context.subscription.currentPeriodEnd,
    subscription: context.subscription,
    plan: context.plan,
  };
}

async function consumeCreditIfAvailable(organizationId, resourceType, overage) {
  const creditType = RESOURCE_TO_CREDIT_TYPE[resourceType];
  if (!creditType) {
    return false;
  }

  const balances = await CreditBalance.find({
    organizationId,
    creditType,
    remaining: { $gt: 0 },
    $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }],
  }).sort({ expiresAt: 1, createdAt: 1 });

  let remainingToConsume = overage;
  for (const balance of balances) {
    if (remainingToConsume <= 0) break;
    const applied = Math.min(balance.remaining, remainingToConsume);
    balance.remaining -= applied;
    balance.used += applied;
    await balance.save();
    remainingToConsume -= applied;
  }

  return remainingToConsume <= 0;
}

export async function enforcePlanLimit({ organizationId, resourceType, increment = 1, message }) {
  const snapshot = await getUsageSnapshot(organizationId, resourceType);

  if (!snapshot.subscription || snapshot.limit === null || snapshot.limit === undefined) {
    return snapshot;
  }

  if (snapshot.used + increment <= snapshot.limit) {
    return snapshot;
  }

  const overage = snapshot.used + increment - snapshot.limit;
  const creditCovered = await consumeCreditIfAvailable(organizationId, resourceType, overage);
  if (creditCovered) {
    return snapshot;
  }

  throw new ApiError(403, message || `Your ${resourceType} limit has been reached.`, {
    code: "PLAN_LIMIT_REACHED",
    resource: resourceType,
    used: snapshot.used,
    limit: snapshot.limit,
    upgradeRequired: true,
  });
}

export async function recordUsage({ organizationId, resourceType, quantity = 1, metadata = {} }) {
  const context = await getSubscriptionContext(organizationId);
  if (!context) {
    return null;
  }

  return UsageRecord.create({
    organizationId,
    subscriptionId: context.subscription._id,
    resourceType,
    quantity,
    billingPeriodStart: context.subscription.currentPeriodStart,
    billingPeriodEnd: context.subscription.currentPeriodEnd,
    metadata,
  });
}

