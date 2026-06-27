import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  cancelSubscription,
  createSubscriptionCheckout,
  fetchSubscriptionOverview,
  fetchSubscriptionPlans,
  pauseSubscription,
  reactivateSubscription,
  upgradeSubscription,
  verifySubscriptionPayment,
} from "../../api/recruiter";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { BillingCycleToggle } from "../../components/subscription/BillingCycleToggle";
import { CurrentPlanCard } from "../../components/subscription/CurrentPlanCard";
import { PricingPlanCard } from "../../components/subscription/PricingPlanCard";
import type { BillingCycle, SubscriptionPlan, SubscriptionRecord } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function SubscriptionOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [cancelOpen, setCancelOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [overview, planResponse] = await Promise.all([fetchSubscriptionOverview(), fetchSubscriptionPlans()]);
      setSubscription(overview.subscription);
      setPlans(planResponse);
      setBillingCycle(overview.subscription.billingCycle);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading || !subscription) return <LoadingSkeleton className="h-80" />;

  const canManageBilling = user?.billingRole === "owner" || user?.billingRole === "billing_admin";

  return (
    <div className="space-y-6">
      <ConfirmationDialog
        open={cancelOpen}
        title="Cancel subscription at period end?"
        description="This keeps access active until the current billing period ends and preserves your data."
        confirmLabel="Cancel subscription"
        onClose={() => setCancelOpen(false)}
        onConfirm={async () => {
          await cancelSubscription({ reason: "Temporary hiring pause" });
          showToast("Subscription scheduled for cancellation at period end.", "success");
          setCancelOpen(false);
          load();
        }}
      />

      <PageHeader
        eyebrow="Subscription"
        title="Billing and subscription"
        description="Review your current plan, compare upgrades, manage billing actions, and keep usage inside plan limits."
        action={
          <div className="flex flex-wrap gap-3">
            <Link className="btn-secondary" to="/recruiter/subscription/usage">
              View usage
            </Link>
            <Link className="btn-secondary" to="/recruiter/subscription/payment-methods">
              Payment methods
            </Link>
            <Link className="btn-secondary" to="/recruiter/subscription/invoices">
              Invoices
            </Link>
          </div>
        }
      />

      <CurrentPlanCard subscription={subscription} />

      {canManageBilling ? (
        <div className="glass-panel p-6">
          <div className="flex flex-wrap gap-3">
            <button
              className="btn-primary"
              onClick={() => {
                const targetPlan = plans.find((plan) => plan.code !== subscription.planId.code && plan.code !== "enterprise");
                if (!targetPlan) return;
                navigate(`/checkout?plan=${targetPlan.code}&cycle=${billingCycle}`);
              }}
              type="button"
            >
              Upgrade or change plan
            </button>
            <button className="btn-secondary" onClick={() => setCancelOpen(true)} type="button">
              Cancel at period end
            </button>
            <button className="btn-secondary" onClick={async () => {
              await reactivateSubscription();
              showToast("Subscription reactivated.", "success");
              load();
            }} type="button">
              Reactivate
            </button>
            <button className="btn-secondary" onClick={async () => {
              await pauseSubscription();
              showToast("Subscription paused.", "success");
              load();
            }} type="button">
              Pause
            </button>
            <button className="btn-secondary" onClick={() => navigate("/pricing")} type="button">
              Public pricing page
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Available plans</h2>
          <p className="mt-2 text-sm text-slate-600">Prices and limits come from backend plan data.</p>
        </div>
        <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />
      </div>
      <div className="grid gap-4 xl:grid-cols-4">
        {plans.map((plan) => (
          <PricingPlanCard
            key={plan._id}
            plan={plan}
            billingCycle={billingCycle}
            recommended={plan.code === "growth"}
            current={plan.code === subscription.planId.code}
            onChoose={() => navigate(`/checkout?plan=${plan.code}&cycle=${billingCycle}`)}
          />
        ))}
      </div>
    </div>
  );
}
