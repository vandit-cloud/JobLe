export function BillingCycleToggle({
  value,
  onChange,
}: {
  value: "monthly" | "yearly";
  onChange: (value: "monthly" | "yearly") => void;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
      {(["monthly", "yearly"] as const).map((cycle) => (
        <button
          key={cycle}
          className={value === cycle ? "rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white" : "rounded-xl px-4 py-2 text-sm font-semibold text-slate-600"}
          onClick={() => onChange(cycle)}
          type="button"
        >
          {cycle === "monthly" ? "Monthly" : "Yearly"}
        </button>
      ))}
    </div>
  );
}

