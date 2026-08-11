"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  BadgeCheck,
  Loader2,
} from "lucide-react";

import {
  approvePurchaseOrderAction,
} from "@/app/admin/(protected)/purchase-orders/[id]/actions";

interface PurchaseOrderApprovalButtonProps {
  purchaseOrderId: string;

  approvalDecision:
    | "ready"
    | "review"
    | "high_risk";
}

export function PurchaseOrderApprovalButton({
  purchaseOrderId,
  approvalDecision,
}: PurchaseOrderApprovalButtonProps) {
  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    message,
    setMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  function handleApprove() {
    /*
     * High-risk intelligence remains advisory.
     *
     * Human approval is still permitted,
     * but requires an explicit confirmation.
     */
    if (
      approvalDecision ===
      "high_risk"
    ) {
      const confirmed =
        window.confirm(
          "This Purchase Order has been classified as HIGH RISK by Approval Intelligence. Do you still want to approve it?",
        );

      if (!confirmed) {
        return;
      }
    } else if (
      approvalDecision ===
      "review"
    ) {
      const confirmed =
        window.confirm(
          "Approval Intelligence recommends reviewing this Purchase Order. Do you want to approve it anyway?",
        );

      if (!confirmed) {
        return;
      }
    }

    setMessage(null);
    setError(null);

    startTransition(
      async () => {
        const result =
          await approvePurchaseOrderAction(
            purchaseOrderId,
          );

        if (!result.success) {
          setError(
            result.message,
          );

          return;
        }

        setMessage(
          result.message,
        );

        /*
         * Server action revalidation refreshes
         * the Server Component data automatically.
         *
         * A hard navigation is not required.
         */
        window.location.reload();
      },
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={
          handleApprove
        }
        disabled={
          isPending
        }
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BadgeCheck className="size-4" />
        )}

        {isPending
          ? "Approving..."
          : "Approve Purchase Order"}
      </button>

      {message ? (
        <p className="text-xs font-medium text-emerald-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="max-w-sm text-right text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}