"use client";

import { useState, useTransition } from "react";

import { Ban, Loader2, X } from "lucide-react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { cancelSupplierPaymentAction } from "@/app/admin/(protected)/purchasing/supplier-payments/[id]/actions";

interface CancelSupplierPaymentButtonProps {
  paymentId: string;
  paymentNumber: string;
}

export default function CancelSupplierPaymentButton({
  paymentId,
  paymentNumber,
}: CancelSupplierPaymentButtonProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [reason, setReason] = useState("");

  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    if (!reason.trim()) {
      toast.error("Please enter a cancellation reason.");

      return;
    }

    startTransition(async () => {
      const result = await cancelSupplierPaymentAction(paymentId, reason);

      if (!result.success) {
        toast.error(result.message);

        return;
      }

      toast.success(result.message);

      setOpen(false);

      setReason("");

      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        <Ban className="size-4" />
        Cancel Payment
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-red-900">
            Cancel {paymentNumber}?
          </h3>

          <p className="mt-1 text-sm leading-6 text-red-800">
            This will reverse the payment&apos;s effect from all allocated Quick
            Purchases. The payment will remain in the audit history as
            Cancelled.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setOpen(false);

            setReason("");
          }}
          className="rounded-md p-1 text-red-700 hover:bg-red-100"
          aria-label="Close cancellation"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-4">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-red-900">
            Cancellation Reason
          </span>

          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Example: Payment entered by mistake"
            disabled={isPending}
            className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-60"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Ban className="size-4" />
          )}

          {isPending ? "Cancelling..." : "Confirm Cancellation"}
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false);

            setReason("");
          }}
          disabled={isPending}
          className="inline-flex h-10 items-center rounded-md border bg-white px-4 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          Keep Payment
        </button>
      </div>
    </div>
  );
}
