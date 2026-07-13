import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
            {eyebrow}
          </p>
        )}

        <h1 className="mt-2 text-3xl font-bold text-slate-950 lg:text-4xl">
          {title}
        </h1>

        {description && (
          <p className="mt-3 max-w-2xl text-slate-600">
            {description}
          </p>
        )}
      </div>

      {actions && <div>{actions}</div>}
    </div>
  );
}