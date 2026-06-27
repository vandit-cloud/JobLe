import { useEffect, useState } from "react";
import { createPaymentMethod, deletePaymentMethodRecord, fetchPaymentMethods, setDefaultPaymentMethod } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { PaymentMethodCard } from "../../components/subscription/PaymentMethodCard";
import type { PaymentMethodRecord } from "../../types";
import { useToast } from "../../context/ToastContext";

export function PaymentMethodsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<PaymentMethodRecord[]>([]);
  const [form, setForm] = useState({
    type: "card",
    brand: "",
    lastFour: "",
    expiryMonth: "",
    expiryYear: "",
    isDefault: false,
  });

  async function load() {
    setLoading(true);
    try {
      const response = await fetchPaymentMethods();
      setMethods(response);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingSkeleton className="h-80" />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Payment methods" title="Saved payment methods" description="Manage provider-tokenized payment methods without exposing raw card credentials." />
      <div className="glass-panel p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
              <option value="card">Card</option>
              <option value="bank_account">Bank account</option>
            </select>
          </div>
          <div>
            <label className="label">Brand</label>
            <input className="input" placeholder="Visa" value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} />
          </div>
          <div>
            <label className="label">Last four digits</label>
            <input
              className="input"
              inputMode="numeric"
              maxLength={4}
              placeholder="4242"
              value={form.lastFour}
              onChange={(event) => setForm((current) => ({ ...current, lastFour: event.target.value.replace(/\D/g, "").slice(0, 4) }))}
            />
          </div>
          <div>
            <label className="label">Expiry month</label>
            <input
              className="input"
              inputMode="numeric"
              maxLength={2}
              placeholder="12"
              value={form.expiryMonth}
              onChange={(event) => setForm((current) => ({ ...current, expiryMonth: event.target.value.replace(/\D/g, "").slice(0, 2) }))}
            />
          </div>
          <div>
            <label className="label">Expiry year</label>
            <input
              className="input"
              inputMode="numeric"
              maxLength={4}
              placeholder={String(new Date().getFullYear() + 3)}
              value={form.expiryYear}
              onChange={(event) => setForm((current) => ({ ...current, expiryYear: event.target.value.replace(/\D/g, "").slice(0, 4) }))}
            />
          </div>
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm font-medium text-slate-700">
          <input checked={form.isDefault} className="h-4 w-4 rounded border-slate-300" onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} type="checkbox" />
          Set as default payment method
        </label>
        <div className="mt-4 flex justify-end">
          <button
            className="btn-primary"
            onClick={async () => {
              if (!form.brand.trim() || form.lastFour.length !== 4 || !form.expiryMonth || !form.expiryYear) {
                showToast("Enter complete payment method details.", "error");
                return;
              }

              await createPaymentMethod({
                type: form.type,
                brand: form.brand.trim(),
                lastFour: form.lastFour,
                expiryMonth: Number(form.expiryMonth),
                expiryYear: Number(form.expiryYear),
                isDefault: form.isDefault,
              });
              showToast("Payment method added.", "success");
              setForm({
                type: "card",
                brand: "",
                lastFour: "",
                expiryMonth: "",
                expiryYear: "",
                isDefault: false,
              });
              load();
            }}
            type="button"
          >
            Save payment method
          </button>
        </div>
      </div>

      {methods.length === 0 ? (
        <EmptyState title="No payment methods saved" description="Add a provider-tokenized payment method to support renewals and upgrades." />
      ) : (
        <div className="grid gap-4">
          {methods.map((method) => (
            <PaymentMethodCard
              key={method._id}
              method={method}
              actions={
                <div className="flex flex-wrap gap-2">
                  {!method.isDefault ? (
                    <button className="btn-secondary" onClick={async () => {
                      await setDefaultPaymentMethod(method._id);
                      showToast("Default payment method updated.", "success");
                      load();
                    }} type="button">
                      Set default
                    </button>
                  ) : null}
                  <button className="btn-danger" onClick={async () => {
                    await deletePaymentMethodRecord(method._id);
                    showToast("Payment method removed.", "success");
                    load();
                  }} type="button">
                    Remove
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
