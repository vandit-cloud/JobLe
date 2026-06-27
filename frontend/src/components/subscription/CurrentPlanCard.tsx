import type { SubscriptionRecord } from "../../types";
import { formatCurrency, formatDate } from "../../lib/utils";
import { StatusBadge } from "../common/StatusBadge";

export function CurrentPlanCard({ subscription }: { subscription: SubscriptionRecord }) {
  const price = subscription.billingCycle === "yearly" ? subscription.planId.yearlyPrice : subscription.planId.monthlyPrice;
  return (
    <div className="glass-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Current plan</p>
          <h2 className="mt-2 text-3xl font-extrabold text-ink">{subscription.planId.name}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {formatCurrency(price, subscription.planId.currency)} • {subscription.billingCycle}
          </p>
        </div>
        <StatusBadge status={subscription.status} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current period</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Next billing date</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{formatDate(subscription.nextBillingDate)}</p>
        </div>
      </div>
    </div>
  );
}

