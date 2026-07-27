import type {
  PurchaseOrderHeader,
  PurchaseOrderStatus,
} from "@/lib/repositories/purchase-orders";

import { DetailSection } from "./detail-section";

interface PurchaseOrderWorkflowProps {
  purchaseOrder: PurchaseOrderHeader;
}

interface WorkflowRowProps {
  label: string;
  value: string;
  active?: boolean;
}

function WorkflowRow({ label, value, active = false }: WorkflowRowProps) {
  return (
    <div className="flex items-start justify-between gap-6 border-b py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span
          className={[
            "h-2.5 w-2.5 shrink-0 rounded-full",
            active ? "bg-emerald-500" : "bg-muted-foreground/30",
          ].join(" ")}
        />

        <span className="text-sm text-muted-foreground">{label}</span>
      </div>

      <span className="max-w-[65%] text-right text-sm font-medium">
        {value}
      </span>
    </div>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatStatus(status: PurchaseOrderStatus): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function hasReachedStatus(
  currentStatus: PurchaseOrderStatus,
  targetStatus: PurchaseOrderStatus,
): boolean {
  const statusOrder: PurchaseOrderStatus[] = [
    "draft",
    "approved",
    "sent",
    "partially_received",
    "received",
    "closed",
  ];

  if (currentStatus === "cancelled") {
    return targetStatus === "cancelled";
  }

  const currentIndex = statusOrder.indexOf(currentStatus);

  const targetIndex = statusOrder.indexOf(targetStatus);

  return (
    currentIndex !== -1 && targetIndex !== -1 && currentIndex >= targetIndex
  );
}

export function PurchaseOrderWorkflow({
  purchaseOrder,
}: PurchaseOrderWorkflowProps) {
  return (
    <DetailSection title="Workflow Information">
      <WorkflowRow
        label="Current Status"
        value={formatStatus(purchaseOrder.status)}
        active
      />

      <WorkflowRow
        label="Created"
        value={formatDateTime(purchaseOrder.created_at)}
        active
      />

      <WorkflowRow
        label="Approved"
        value={formatDateTime(purchaseOrder.approved_at)}
        active={hasReachedStatus(purchaseOrder.status, "approved")}
      />

      <WorkflowRow
        label="Sent to Supplier"
        value={formatDateTime(purchaseOrder.sent_at)}
        active={hasReachedStatus(purchaseOrder.status, "sent")}
      />

      <WorkflowRow
        label="Partially Received"
        value={formatDateTime(purchaseOrder.partially_received_at)}
        active={hasReachedStatus(purchaseOrder.status, "partially_received")}
      />

      <WorkflowRow
        label="Fully Received"
        value={formatDateTime(purchaseOrder.received_at)}
        active={hasReachedStatus(purchaseOrder.status, "received")}
      />

      <WorkflowRow
        label="Closed"
        value={formatDateTime(purchaseOrder.closed_at)}
        active={hasReachedStatus(purchaseOrder.status, "closed")}
      />

      <WorkflowRow
        label="Cancelled"
        value={formatDateTime(purchaseOrder.cancelled_at)}
        active={purchaseOrder.status === "cancelled"}
      />
    </DetailSection>
  );
}
