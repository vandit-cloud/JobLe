import type { ReactNode } from "react";
import type { PaymentMethodRecord } from "../../types";

export function PaymentMethodCard({ method, actions }: { method: PaymentMethodRecord; actions?: ReactNode }) {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-ink">
            {method.brand} ending in {method.lastFour}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {method.type} • Expires {method.expiryMonth}/{method.expiryYear}
          </p>
        </div>
        {method.isDefault ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Default</span> : null}
      </div>
      {actions ? <div className="mt-5">{actions}</div> : null}
    </div>
  );
}
