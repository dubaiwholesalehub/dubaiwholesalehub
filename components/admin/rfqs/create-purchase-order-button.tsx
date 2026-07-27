"use client";

import { useState, useTransition } from "react";

import { createPurchaseOrderFromAwardAction } from "@/lib/actions/purchase-order/create-from-award";

interface CreatePurchaseOrderButtonProps {
  rfqId: string;
}

export function CreatePurchaseOrderButton({
  rfqId,
}: CreatePurchaseOrderButtonProps) {
  const [isPending, startTransition] =
    useTransition();

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  function handleCreatePurchaseOrder() {
    setErrorMessage(null);

    startTransition(async () => {
      const result =
        await createPurchaseOrderFromAwardAction(
          rfqId,
        );

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      if (!result.purchaseOrderId) {
        setErrorMessage(
          "The Purchase Order was created, but its ID was not returned.",
        );
        return;
      }

      window.location.assign(
        `/admin/purchase-orders/${result.purchaseOrderId}`,
      );
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <button
        type="button"
        onClick={handleCreatePurchaseOrder}
        disabled={isPending}
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Opening Purchase Order..."
          : "Create Purchase Order"}
      </button>

      {errorMessage ? (
        <p
          role="alert"
          className="max-w-sm text-sm text-destructive lg:text-right"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}