"use client";

import { useState, useTransition } from "react";

import { Loader2, Send } from "lucide-react";

import { markPurchaseOrderSentAction } from "@/app/admin/(protected)/purchase-orders/[id]/send-actions";

interface PurchaseOrderSendButtonProps {
  purchaseOrderId: string;
  supplierName: string;
}

export function PurchaseOrderSendButton({
  purchaseOrderId,
  supplierName,
}: PurchaseOrderSendButtonProps) {
  const [isPending, startTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);

  function handleSend() {
    const confirmed = window.confirm(
      `Mark this Purchase Order as sent to ${supplierName}?`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await markPurchaseOrderSentAction(purchaseOrderId);

      if (!result.success) {
        setError(result.message);

        return;
      }

      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleSend}
        disabled={isPending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}

        {isPending ? "Updating..." : "Send to Supplier"}
      </button>

      {error ? (
        <p className="max-w-sm text-right text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
