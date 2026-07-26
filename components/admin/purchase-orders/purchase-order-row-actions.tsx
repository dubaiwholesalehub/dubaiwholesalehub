import Link from "next/link";

interface PurchaseOrderRowActionsProps {
  purchaseOrderId: string;
  canEdit?: boolean;
}

export function PurchaseOrderRowActions({
  purchaseOrderId,
  canEdit = false,
}: PurchaseOrderRowActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/purchase-orders/${purchaseOrderId}`}
        className="rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted"
      >
        View
      </Link>

      {canEdit ? (
        <Link
          href={`/admin/purchase-orders/${purchaseOrderId}/edit`}
          className="rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted"
        >
          Edit
        </Link>
      ) : null}
    </div>
  );
}