"use client";

import { useState } from "react";

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import {
  approveAndConfirmSalesOrderAction,
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

  requiresMarginApproval?: boolean;

  hasApprovedMarginException?: boolean;

  hasMarginWarning?: boolean;

  lowestMarginPercentage?: number | null;
}

export default function SalesOrderWorkflowActions({
  salesOrderId,
  status,
  hasItems,
  requiresMarginApproval = false,
  hasApprovedMarginException = false,
  hasMarginWarning = false,
  lowestMarginPercentage = null,
}: SalesOrderWorkflowActionsProps) {
  const [pendingAction, setPendingAction] = useState<
    "confirm" | "approve-confirm" | "cancel" | null
  >(null);

  const [error, setError] = useState<string | null>(null);

  const [showApprovalForm, setShowApprovalForm] = useState(false);

  const [approvalReason, setApprovalReason] = useState("");

  async function handleConfirm() {
    if (
      !window.confirm(
        hasMarginWarning
          ? "This Sales Order has a low-margin warning. Confirm anyway?"
          : "Confirm this sales order? Pricing and order details will become read-only, and inventory fulfilment planning will run.",
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

  async function handleApproveAndConfirm() {
    const reason = approvalReason.trim();

    if (!reason) {
      setError("Select an approval reason.");

      return;
    }

    if (
      !window.confirm(
        "Approve this margin exception and confirm the Sales Order?",
      )
    ) {
      return;
    }

    setError(null);

    setPendingAction("approve-confirm");

    try {
      const formData = new FormData();

      formData.set("salesOrderId", salesOrderId);

      formData.set("reason", reason);

      await approveAndConfirmSalesOrderAction(formData);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to approve and confirm the Sales Order.",
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

  const marginApprovalNeeded =
    requiresMarginApproval && !hasApprovedMarginException;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {status === "draft" && !marginApprovalNeeded ? (
          <Button
            type="button"
            disabled={isPending || !hasItems}
            onClick={handleConfirm}
          >
            {pendingAction === "confirm" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasApprovedMarginException ? (
              <ShieldCheck className="size-4" />
            ) : hasMarginWarning ? (
              <AlertTriangle className="size-4" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}

            {pendingAction === "confirm"
              ? "Confirming..."
              : hasApprovedMarginException
                ? "Confirm Approved Order"
                : hasMarginWarning
                  ? "Confirm Low Margin"
                  : "Confirm Order"}
          </Button>
        ) : null}

        {status === "draft" && marginApprovalNeeded ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || !hasItems}
            onClick={() => setShowApprovalForm((current) => !current)}
          >
            <ShieldCheck className="size-4" />
            Approve & Confirm
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

      {status === "draft" && hasMarginWarning && !requiresMarginApproval ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />

          <p>
            Low margin warning
            {lowestMarginPercentage !== null
              ? ` — lowest estimated margin ${lowestMarginPercentage.toFixed(
                  2,
                )}%`
              : ""}
            . Confirmation is still allowed.
          </p>
        </div>
      ) : null}

      {status === "draft" && hasApprovedMarginException ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />

          <p>Margin exception approved. Confirmation is permitted.</p>
        </div>
      ) : null}

      {status === "draft" && marginApprovalNeeded ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-700" />

            <div>
              <p className="text-sm font-semibold text-red-900">
                Admin approval required
              </p>

              <p className="mt-1 text-xs text-red-800/70">
                One or more Sales Order lines are below the minimum margin or
                require cost review.
                {lowestMarginPercentage !== null
                  ? ` Lowest estimated margin: ${lowestMarginPercentage.toFixed(
                      2,
                    )}%.`
                  : ""}
              </p>
            </div>
          </div>

          {showApprovalForm ? (
            <div className="mt-4 space-y-3">
              <select
                value={approvalReason}
                onChange={(event) => setApprovalReason(event.target.value)}
                disabled={isPending}
                className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
              >
                <option value="">Select approval reason</option>

                <option value="Customer retention">Customer retention</option>

                <option value="Strategic order">Strategic order</option>

                <option value="Clearance / old stock">
                  Clearance / old stock
                </option>

                <option value="Large volume deal">Large volume deal</option>

                <option value="Market competition">Market competition</option>

                <option value="Management decision">Management decision</option>
              </select>

              <Button
                type="button"
                variant="destructive"
                disabled={isPending || !approvalReason}
                onClick={handleApproveAndConfirm}
              >
                {pendingAction === "approve-confirm" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}

                {pendingAction === "approve-confirm"
                  ? "Approving & Confirming..."
                  : "Approve Exception & Confirm"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

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
