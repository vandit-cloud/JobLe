import type { ReactNode } from "react";

export function FilterPanel({
  title = "Filters",
  children,
  actions,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="glass-panel p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Refine results</p>
          <h2 className="mt-1 text-lg font-bold text-slate-800">{title}</h2>
        </div>
        {actions}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}
