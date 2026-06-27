import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPublicSubscriptionPlans } from "../api/recruiter";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { BillingCycleToggle } from "../components/subscription/BillingCycleToggle";
import { PlanComparisonTable } from "../components/subscription/PlanComparisonTable";
import { PricingPlanCard } from "../components/subscription/PricingPlanCard";
import type { BillingCycle, SubscriptionPlan } from "../types";

export function PricingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  useEffect(() => {
    fetchPublicSubscriptionPlans()
      .then(setPlans)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton className="m-6 h-80" />;

  if (plans.length === 0) {
    return <EmptyState title="Pricing unavailable" description="No active plans are available from the backend right now." />;
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="glass-panel p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sunrise">Public pricing</p>
          <h1 className="mt-3 text-4xl font-extrabold text-ink">Plans that scale from trial to enterprise</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Prices, limits, and feature flags are loaded from backend subscription plan data rather than hard-coded UI values.
          </p>
          <div className="mt-6 flex justify-center">
            <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-4">
          {plans.map((plan) => (
            <PricingPlanCard
              key={plan._id}
              plan={plan}
              billingCycle={billingCycle}
              recommended={plan.code === "growth"}
              onChoose={() => navigate(`/checkout?plan=${plan.code}&cycle=${billingCycle}`)}
            />
          ))}
        </div>
        <PlanComparisonTable plans={plans} />
      </div>
    </div>
  );
}

