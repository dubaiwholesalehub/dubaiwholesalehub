import type { InventoryTransactionStatus } from "@/lib/inventory/inventory.repository";

interface InventoryTransactionStatusBadgeProps {
  status: InventoryTransactionStatus;
}

const statusConfig: Record<
  InventoryTransactionStatus,
  {
    label: string;
    className: string;
  }
> = {
  draft: {
    label: "Draft",
    className:
      "border-slate-200 bg-slate-50 text-slate-700",
  },

  posted: {
    label: "Posted",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },

  reversed: {
    label: "Reversed",
    className:
      "border-purple-200 bg-purple-50 text-purple-700",
  },

  cancelled: {
    label: "Cancelled",
    className:
      "border-red-200 bg-red-50 text-red-700",
  },
};

export function InventoryTransactionStatusBadge({
  status,
}: InventoryTransactionStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
        config.className,
      ].join(" ")}
    >
      {config.label}
    </span>
  );
}