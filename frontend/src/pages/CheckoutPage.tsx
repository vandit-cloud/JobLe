import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createSubscriptionCheckout, fetchPublicSubscriptionPlans, fetchSubscriptionOverview, validateSubscriptionCoupon, verifySubscriptionPayment } from "../api/recruiter";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { PageHeader } from "../components/common/PageHeader";
import type { SubscriptionPlan } from "../types";
import { formatCurrency } from "../lib/utils";
import { useToast } from "../context/ToastContext";

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [couponResult, setCouponResult] = useState<number>(0);
  const [couponCode, setCouponCode] = useState("");
  const planCode = searchParams.get("plan") || "starter";
  const billingCycle = (searchParams.get("cycle") as "monthly" | "yearly") || "monthly";

  const [billingProfile, setBillingProfile] = useState({
    legalName: "",
    billingEmail: "",
    billingPhone: "",
    country: "",
    state: "",
    city: "",
    address: "",
    postalCode: "",
    taxNumber: "",
  });

  useEffect(() => {
    Promise.all([fetchPublicSubscriptionPlans(), fetchSubscriptionOverview().catch(() => null)])
      .then(([planItems, overview]) => {
        setPlans(planItems);
        if (overview?.billingProfile) {
          setBillingProfile((current) => ({
            ...current,
            legalName: overview.billingProfile.legalName || "",
            billingEmail: overview.billingProfile.billingEmail || "",
            billingPhone: overview.billingProfile.billingPhone || "",
            country: overview.billingProfile.country || "",
            state: overview.billingProfile.state || "",
            city: overview.billingProfile.city || "",
            address: overview.billingProfile.address || "",
            postalCode: overview.billingProfile.postalCode || "",
            taxNumber: overview.billingProfile.taxNumber || "",
          }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const plan = useMemo(() => plans.find((item) => item.code === planCode) || null, [planCode, plans]);
  const basePrice = plan ? (billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice) : 0;
  const yearlyDiscount = billingCycle === "yearly" ? Math.round(basePrice * 0.1) : 0;
  const subtotal = Math.max(basePrice - yearlyDiscount - couponResult, 0);
  const tax = Math.round(subtotal * 0.08);
  const total = subtotal + tax;

  if (loading || !plan) return <LoadingSkeleton className="m-6 h-80" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Checkout" title={`Checkout for ${plan.name}`} description="Backend verification still decides activation. Frontend success alone never activates a paid subscription." />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">Billing details</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {Object.entries(billingProfile).map(([key, value]) => (
              <div key={key} className={key === "address" ? "md:col-span-2" : ""}>
                <label className="label">{key}</label>
                <input className="input" value={value} onChange={(event) => setBillingProfile((current) => ({ ...current, [key]: event.target.value }))} />
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">Checkout summary</h2>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <div className="flex justify-between"><span>Selected plan</span><span className="font-semibold text-slate-800">{plan.name}</span></div>
            <div className="flex justify-between"><span>Billing cycle</span><span className="font-semibold text-slate-800">{billingCycle}</span></div>
            <div className="flex justify-between"><span>Base price</span><span className="font-semibold text-slate-800">{formatCurrency(basePrice, plan.currency)}</span></div>
            <div className="flex justify-between"><span>Yearly discount</span><span className="font-semibold text-slate-800">-{formatCurrency(yearlyDiscount, plan.currency)}</span></div>
            <div className="flex justify-between"><span>Coupon discount</span><span className="font-semibold text-slate-800">-{formatCurrency(couponResult, plan.currency)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span className="font-semibold text-slate-800">{formatCurrency(tax, plan.currency)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base"><span>Total payable</span><span className="font-extrabold text-ink">{formatCurrency(total, plan.currency)}</span></div>
          </div>
          <div className="mt-5 flex gap-3">
            <input className="input" placeholder="Coupon code" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} />
            <button
              className="btn-secondary"
              onClick={async () => {
                if (!couponCode) return;
                const response = await validateSubscriptionCoupon({ code: couponCode, planCode: plan.code, amount: basePrice });
                setCouponResult(response.discount || 0);
                showToast("Coupon validated.", "success");
              }}
              type="button"
            >
              Apply
            </button>
          </div>
          <button
            className="btn-primary mt-6 w-full"
            onClick={async () => {
              const checkout = await createSubscriptionCheckout({
                planCode: plan.code,
                billingCycle,
                couponCode: couponCode || undefined,
                billingProfile,
              });
              await verifySubscriptionPayment({ checkoutId: checkout.checkout.checkoutId });
              showToast("Payment verified and subscription activated on the backend.", "success");
              navigate("/recruiter/subscription");
            }}
            type="button"
          >
            Complete checkout
          </button>
        </div>
      </div>
    </div>
  );
}
