import type { InventoryTransferStatus } from "@/lib/repositories/inventory-transfer.repository";

interface InventoryTransferStatusBadgeProps {
  status: InventoryTransferStatus;
}

const statusStyles: Record<
  InventoryTransferStatus,
  string
> = {
  draft:
    "border-slate-200 bg-slate-100 text-slate-700",

  approved:
    "border-blue-200 bg-blue-50 text-blue-700",

  dispatched:
    "border-violet-200 bg-violet-50 text-violet-700",

  in_transit:
    "border-amber-200 bg-amber-50 text-amber-700",

  received:
    "border-cyan-200 bg-cyan-50 text-cyan-700",

  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700",

  cancelled:
    "border-red-200 bg-red-50 text-red-700",
};

function formatStatus(
  status: InventoryTransferStatus,
): string {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

export function InventoryTransferStatusBadge({
  status,
}: InventoryTransferStatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusStyles[status],
      ].join(" ")}
    >
      {formatStatus(status)}
    </span>
  );
}