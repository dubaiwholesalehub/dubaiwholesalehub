import type { LucideIcon } from "lucide-react";

interface InventorySummaryCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

export function InventorySummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: InventorySummaryCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-600">
            {title}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {value}
          </p>
        </div>

        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>

      <p className="mt-3 text-sm text-neutral-500">
        {description}
      </p>
    </div>
  );
}