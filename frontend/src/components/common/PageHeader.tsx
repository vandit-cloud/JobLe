import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="hero-panel flex flex-col gap-5 px-6 py-6 md:px-8 md:py-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.32em] text-tide">{eyebrow}</p> : null}
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[0.95rem]">{description}</p>
      </div>
      {action ? <div className="flex flex-wrap gap-3 lg:justify-end">{action}</div> : null}
    </div>
  );
}
