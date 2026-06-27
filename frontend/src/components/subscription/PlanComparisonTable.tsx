import type { SubscriptionPlan } from "../../types";

const FEATURES = [
  "recruiterSeats",
  "activeJobs",
  "candidateInvitations",
  "resumeAnalyses",
  "aiQuestionGenerations",
  "codingExecutions",
  "proctoringMinutes",
  "storageGB",
  "codingAssessments",
  "questionBank",
  "cameraMonitoring",
  "customBranding",
  "advancedAnalytics",
  "auditLogs",
  "apiAccess",
  "singleSignOn",
];

export function PlanComparisonTable({ plans }: { plans: SubscriptionPlan[] }) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Feature</th>
              {plans.map((plan) => (
                <th key={plan._id} className="px-5 py-4">
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature) => (
              <tr key={feature} className="border-t border-slate-100">
                <td className="px-5 py-4 font-semibold text-slate-800">{feature}</td>
                {plans.map((plan) => (
                  <td key={plan._id} className="px-5 py-4 text-sm text-slate-600">
                    {plan.limits[feature] ?? (plan.features[feature] ? "Included" : "Not included")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

