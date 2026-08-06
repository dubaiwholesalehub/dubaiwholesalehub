"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";

import {
  changeSalesQuotationStatusAction,
} from "@/app/admin/(protected)/sales/quotations/actions";
import { Button } from "@/components/ui/button";
import type {
  SalesQuotationStatus,
} from "@/lib/repositories/sales-quotation.repository";

interface SalesQuotationWorkflowActionsProps {
  quotationId: string;
  status: SalesQuotationStatus;
  hasItems: boolean;
}

export default function SalesQuotationWorkflowActions({
  quotationId,
  status,
  hasItems,
}: SalesQuotationWorkflowActionsProps) {
  const [
    pendingStatus,
    setPendingStatus,
  ] = useState<SalesQuotationStatus | null>(
    null,
  );

  const [error, setError] =
    useState<string | null>(null);

  async function changeStatus(
    nextStatus: SalesQuotationStatus,
  ) {
    const confirmationMessages:
      Partial<
        Record<
          SalesQuotationStatus,
          string
        >
      > = {
      sent:
        "Mark this quotation as sent to the customer?",
      accepted:
        "Mark this quotation as accepted by the customer?",
      rejected:
        "Mark this quotation as rejected?",
      cancelled:
        "Cancel this quotation?",
    };

    const message =
      confirmationMessages[nextStatus];

    if (
      message &&
      !window.confirm(message)
    ) {
      return;
    }

    setError(null);
    setPendingStatus(nextStatus);

    try {
      const result =
        await changeSalesQuotationStatusAction(
          quotationId,
          nextStatus,
        );

      if (!result.success) {
        throw new Error(
          result.message ??
            "Unable to update quotation status.",
        );
      }

      window.location.reload();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update quotation status.",
      );

      setPendingStatus(null);
    }
  }

  const isPending =
    pendingStatus !== null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === "draft" ? (
          <Button
            type="button"
            variant="outline"
            disabled={
              isPending || !hasItems
            }
            onClick={() =>
              changeStatus("sent")
            }
          >
            {pendingStatus === "sent" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}

            {pendingStatus === "sent"
              ? "Updating..."
              : "Mark as Sent"}
          </Button>
        ) : null}

        {status === "sent" ? (
          <>
            <Button
              type="button"
              disabled={isPending}
              onClick={() =>
                changeStatus("accepted")
              }
            >
              {pendingStatus ===
              "accepted" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}

              {pendingStatus ===
              "accepted"
                ? "Updating..."
                : "Accept Quotation"}
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                changeStatus("rejected")
              }
            >
              {pendingStatus ===
              "rejected" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}

              {pendingStatus ===
              "rejected"
                ? "Updating..."
                : "Reject"}
            </Button>
          </>
        ) : null}

        {status !== "converted" &&
        status !== "cancelled" &&
        status !== "rejected" ? (
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() =>
              changeStatus("cancelled")
            }
          >
            Cancel Quotation
          </Button>
        ) : null}
      </div>

      {status === "draft" &&
      !hasItems ? (
        <p className="text-xs text-muted-foreground">
          Add at least one item before
          marking this quotation as sent.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}