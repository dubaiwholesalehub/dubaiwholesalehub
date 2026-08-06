"use client";

import { useState } from "react";
import { Ban, CheckCircle2, Loader2 } from "lucide-react";

import {
  cancelSalesOrderAction,
  confirmSalesOrderAction,
} from "@/app/admin/(protected)/sales/orders/actions";
import { Button } from "@/components/ui/button";

interface SalesOrderWorkflowActionsProps {
  salesOrderId: string;
  status:
    | "draft"
    | "confirmed"
    | "processing"
    | "partially_fulfilled"
    | "fulfilled"
    | "completed"
    | "cancelled"
    | "closed";
  hasItems: boolean;
}

export default function SalesOrderWorkflowActions({
  salesOrderId,
  status,
  hasItems,
}: SalesOrderWorkflowActionsProps) {
  const [pendingAction, setPendingAction] = useState<
    "confirm" | "cancel" | null
  >(null);

  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (
      !window.confirm(
        "Confirm this sales order? Pricing and order details will become read-only, and inventory fulfilment planning will run.",
      )
    ) {
      return;
    }

    setError(null);
    setPendingAction("confirm");

    try {
      await confirmSalesOrderAction(salesOrderId);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to confirm the sales order.",
      );

      setPendingAction(null);
    }
  }

  async function handleCancel() {
    if (
      !window.confirm(
        "Cancel this sales order? Any reserved inventory will be released.",
      )
    ) {
      return;
    }

    setError(null);
    setPendingAction("cancel");

    try {
      await cancelSalesOrderAction(salesOrderId);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to cancel the sales order.",
      );

      setPendingAction(null);
    }
  }

  const isPending = pendingAction !== null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === "draft" ? (
          <Button
            type="button"
            disabled={isPending || !hasItems}
            onClick={handleConfirm}
          >
            {pendingAction === "confirm" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}

            {pendingAction === "confirm" ? "Confirming..." : "Confirm Order"}
          </Button>
        ) : null}

        {status !== "cancelled" &&
        status !== "completed" &&
        status !== "closed" ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleCancel}
          >
            {pendingAction === "cancel" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Ban className="size-4" />
            )}

            {pendingAction === "cancel" ? "Cancelling..." : "Cancel Order"}
          </Button>
        ) : null}
      </div>

      {status === "draft" && !hasItems ? (
        <p className="text-xs text-muted-foreground">
          Add at least one item before confirming this sales order.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
