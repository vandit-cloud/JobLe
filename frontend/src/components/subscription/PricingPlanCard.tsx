import type { SubscriptionPlan } from "../../types";
import { formatCurrency } from "../../lib/utils";

export function PricingPlanCard({
  plan,
  billingCycle,
  recommended,
  current,
  onChoose,
}: {
  plan: SubscriptionPlan;
  billingCycle: "monthly" | "yearly";
  recommended?: boolean;
  current?: boolean;
  onChoose?: () => void;
}) {
  const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

  return (
    <div className="glass-panel flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-bold text-ink">{plan.name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p>
        </div>
        {recommended ? <span className="rounded-full bg-sunrise/10 px-3 py-1 text-xs font-bold text-sunrise">Recommended</span> : null}
        {current ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Current</span> : null}
      </div>
      <div className="mt-6">
        <p className="text-4xl font-extrabold text-ink">{price === 0 ? "Free" : formatCurrency(price, plan.currency)}</p>
        <p className="mt-2 text-sm text-slate-500">{billingCycle === "yearly" ? "Billed yearly" : "Billed monthly"}</p>
      </div>
      <ul className="mt-6 space-y-3 text-sm text-slate-600">
        {Object.entries(plan.limits).slice(0, 6).map(([key, value]) => (
          <li key={key} className="rounded-2xl bg-slate-50 px-4 py-3">
            <span className="font-semibold text-slate-800">{value}</span> {key}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex-1" />
      <button className={current ? "btn-secondary w-full" : "btn-primary w-full"} onClick={onChoose} type="button">
        {plan.code === "enterprise" ? "Contact sales" : current ? "Current plan" : plan.monthlyPrice === 0 ? "Start trial" : "Choose plan"}
      </button>
    </div>
  );
}

