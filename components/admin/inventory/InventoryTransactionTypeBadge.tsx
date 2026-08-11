import type { InventoryTransactionType } from "@/lib/inventory/inventory.repository";

interface InventoryTransactionTypeBadgeProps {
  type: InventoryTransactionType;
}

const typeConfig: Record<
  InventoryTransactionType,
  {
    label: string;
    className: string;
  }
> = {
  goods_receipt: {
    label: "Goods Receipt",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },

  local_purchase: {
    label: "Local Purchase",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },

  sales_issue: {
    label: "Sales Issue",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },

  transfer_out: {
    label: "Transfer Out",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },

  transfer_in: {
    label: "Transfer In",
    className: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },

  adjustment_in: {
    label: "Adjustment In",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },

  adjustment_out: {
    label: "Adjustment Out",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },

  customer_return: {
    label: "Customer Return",
    className: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },

  supplier_return: {
    label: "Supplier Return",
    className: "border-pink-200 bg-pink-50 text-pink-700",
  },

  opening_balance: {
    label: "Opening Balance",
    className: "border-teal-200 bg-teal-50 text-teal-700",
  },

  stock_count: {
    label: "Stock Count",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

export function InventoryTransactionTypeBadge({
  type,
}: InventoryTransactionTypeBadgeProps) {
  const config = typeConfig[type];

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
