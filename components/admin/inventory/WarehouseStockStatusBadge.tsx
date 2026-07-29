import type { WarehouseStockStatus } from "@/lib/inventory/inventory.repository";

interface WarehouseStockStatusBadgeProps {
  status: WarehouseStockStatus;
}

const statusConfig: Record<
  WarehouseStockStatus,
  {
    label: string;
    className: string;
  }
> = {
  in_stock: {
    label: "In Stock",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  low_stock: {
    label: "Low Stock",
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
  },
  out_of_stock: {
    label: "Out of Stock",
    className:
      "border-red-200 bg-red-50 text-red-700",
  },
};

export function WarehouseStockStatusBadge({
  status,
}: WarehouseStockStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        config.className,
      ].join(" ")}
    >
      {config.label}
    </span>
  );
}