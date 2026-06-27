import { CreditBalance } from "../models/CreditBalance.js";
import { Job } from "../models/Job.js";
import { Recruiter } from "../models/Recruiter.js";
import { UsageRecord } from "../models/UsageRecord.js";
import { getSubscriptionContext } from "./planLimitService.js";

export async function buildUsageOverview(organizationId) {
  const context = await getSubscriptionContext(organizationId);
  if (!context) {
    return [];
  }

  const resources = [
    "activeJobs",
    "recruiterSeats",
    "candidateInvitations",
    "resumeAnalyses",
    "aiQuestionGenerations",
    "codingExecutions",
    "proctoringMinutes",
    "storageGB",
    "emailNotifications",
  ];

  const records = await UsageRecord.find({
    organizationId,
    subscriptionId: context.subscription._id,
    billingPeriodStart: { $gte: context.subscription.currentPeriodStart },
  });
  const balances = await CreditBalance.find({ organizationId });
  const [activeJobsCount, recruiterSeatsCount] = await Promise.all([
    Job.countDocuments({ companyId: organizationId, status: "Published", deletedAt: null }),
    Recruiter.countDocuments({ companyId: organizationId }),
  ]);

  return resources.map((resourceType) => {
    let used = records.filter((record) => record.resourceType === resourceType).reduce((sum, record) => sum + record.quantity, 0);
    if (resourceType === "activeJobs") used = activeJobsCount;
    if (resourceType === "recruiterSeats") used = recruiterSeatsCount;
    const limit = context.plan.limits?.[resourceType] ?? null;
    const relatedCredit = balances.find((item) => item.creditType.toLowerCase().includes(resourceType.replace(/([A-Z])/g, "").toLowerCase()));
    const percentageUsed = limit ? Math.min(Math.round((used / limit) * 100), 100) : null;
    return {
      resourceType,
      used,
      limit,
      remaining: limit === null || limit === undefined ? null : Math.max(limit - used, 0),
      percentageUsed,
      resetDate: context.subscription.currentPeriodEnd,
      state: limit === null || limit === undefined ? "Unlimited" : percentageUsed >= 100 ? "Limit reached" : percentageUsed >= 90 ? "Approaching limit" : percentageUsed >= 80 ? "Approaching limit" : "Normal",
      additionalCreditsRemaining: relatedCredit?.remaining || 0,
    };
  });
}
