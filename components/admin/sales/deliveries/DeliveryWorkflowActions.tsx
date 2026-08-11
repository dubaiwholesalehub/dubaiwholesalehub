"use client";

import { useState } from "react";
import {
  Ban,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  PackageCheck,
  PackageOpen,
  Play,
  Truck,
} from "lucide-react";

import {
  cancelDeliveryOrderAction,
  confirmDeliveryPackedAction,
  confirmDeliveryPickedAction,
  dispatchDeliveryOrderAction,
  markDeliveryDeliveredAction,
  startDeliveryPackingAction,
  startDeliveryPickingAction,
} from "@/app/admin/(protected)/sales/deliveries/actions";
import { Button } from "@/components/ui/button";
import type { DeliveryOrderStatus } from "@/lib/repositories/delivery-order.repository";

interface DeliveryWorkflowActionsProps {
  deliveryOrderId: string;
  status: DeliveryOrderStatus;
  hasItems: boolean;
}

type PendingAction =
  | "start-picking"
  | "confirm-picked"
  | "start-packing"
  | "confirm-packed"
  | "dispatch"
  | "deliver"
  | "cancel"
  | null;

export default function DeliveryWorkflowActions({
  deliveryOrderId,
  status,
  hasItems,
}: DeliveryWorkflowActionsProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const [error, setError] = useState<string | null>(null);

  async function runAction(
    actionName: Exclude<PendingAction, null>,
    confirmationMessage: string,
    action: (id: string) => Promise<void>,
  ) {
    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setError(null);
    setPendingAction(actionName);

    try {
      await action(deliveryOrderId);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update the delivery order.",
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
            onClick={() =>
              runAction(
                "start-picking",
                "Start picking this delivery order?",
                startDeliveryPickingAction,
              )
            }
          >
            {pendingAction === "start-picking" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}

            {pendingAction === "start-picking"
              ? "Starting..."
              : "Start Picking"}
          </Button>
        ) : null}

        {status === "picking" ? (
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              runAction(
                "confirm-picked",
                "Confirm all entered picked quantities?",
                confirmDeliveryPickedAction,
              )
            }
          >
            {pendingAction === "confirm-picked" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ClipboardCheck className="size-4" />
            )}

            {pendingAction === "confirm-picked"
              ? "Confirming..."
              : "Confirm Picked"}
          </Button>
        ) : null}

        {status === "picked" ? (
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              runAction(
                "start-packing",
                "Start packing this delivery order?",
                startDeliveryPackingAction,
              )
            }
          >
            {pendingAction === "start-packing" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PackageOpen className="size-4" />
            )}

            {pendingAction === "start-packing"
              ? "Starting..."
              : "Start Packing"}
          </Button>
        ) : null}

        {status === "packing" ? (
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              runAction(
                "confirm-packed",
                "Confirm all entered packed quantities?",
                confirmDeliveryPackedAction,
              )
            }
          >
            {pendingAction === "confirm-packed" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PackageCheck className="size-4" />
            )}

            {pendingAction === "confirm-packed"
              ? "Confirming..."
              : "Confirm Packed"}
          </Button>
        ) : null}

        {status === "packed" ? (
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              runAction(
                "dispatch",
                "Dispatch this delivery? Stock will be issued, reservations released, and Sales Order fulfilment updated.",
                dispatchDeliveryOrderAction,
              )
            }
          >
            {pendingAction === "dispatch" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Truck className="size-4" />
            )}

            {pendingAction === "dispatch"
              ? "Dispatching..."
              : "Dispatch Delivery"}
          </Button>
        ) : null}

        {status === "dispatched" ? (
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              runAction(
                "deliver",
                "Mark this delivery as received by the customer?",
                markDeliveryDeliveredAction,
              )
            }
          >
            {pendingAction === "deliver" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}

            {pendingAction === "deliver" ? "Updating..." : "Mark Delivered"}
          </Button>
        ) : null}

        {status !== "dispatched" &&
        status !== "delivered" &&
        status !== "cancelled" ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              runAction(
                "cancel",
                "Cancel this delivery order? Picking and packing quantities will be reset.",
                cancelDeliveryOrderAction,
              )
            }
          >
            {pendingAction === "cancel" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Ban className="size-4" />
            )}

            {pendingAction === "cancel" ? "Cancelling..." : "Cancel Delivery"}
          </Button>
        ) : null}
      </div>

      {status === "draft" && !hasItems ? (
        <p className="text-xs text-muted-foreground">
          This delivery must contain at least one item before picking can start.
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
