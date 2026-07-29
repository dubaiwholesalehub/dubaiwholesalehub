"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  completeGoodsReceipt,
  type CompleteGoodsReceiptState,
} from "@/app/admin/actions/goods-receipts/complete";

interface CompleteGoodsReceiptButtonProps {
  goodsReceiptId: string;
}

const initialState: CompleteGoodsReceiptState = {
  status: "idle",
  message: "",
};

export default function CompleteGoodsReceiptButton({
  goodsReceiptId,
}: CompleteGoodsReceiptButtonProps) {
  const router = useRouter();

  const [state, formAction] = useActionState(
    completeGoodsReceipt,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="goodsReceiptId" value={goodsReceiptId} />

        <SubmitButton />
      </form>

      {state.status === "error" && (
        <div
          role="alert"
          className="max-w-md rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.message}
        </div>
      )}

      {state.status === "success" && (
        <div
          role="status"
          className="max-w-md rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
        >
          {state.message}
        </div>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center rounded-md bg-orange-600 px-4 text-sm font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Completing..." : "Complete Goods Receipt"}
    </button>
  );
}
