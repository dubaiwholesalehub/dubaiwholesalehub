"use client";

import {
  useTransition,
} from "react";

import {
  CheckCircle2,
  Loader2,
  PackageCheck,
  ReceiptText,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  toast,
} from "sonner";

import {
  approveSupplierReturnAction,
  dispatchSupplierReturnAction,
  postSupplierReturnAction,
} from "@/app/admin/(protected)/purchasing/returns/[id]/actions";

import type {
  SupplierReturnStatus,
} from "@/lib/repositories/supplier-return.repository";


interface SupplierReturnWorkflowActionsProps {
  supplierReturnId: string;
  status: SupplierReturnStatus;
}


export default function SupplierReturnWorkflowActions({
  supplierReturnId,
  status,
}: SupplierReturnWorkflowActionsProps) {
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();


  function runAction(
    action:
      (
        supplierReturnId:
          string,
      ) => Promise<void>,

    successMessage:
      string,
  ) {
    startTransition(
      async () => {
        try {
          await action(
            supplierReturnId,
          );

          toast.success(
            successMessage,
          );

          router.refresh();
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to update Supplier Return.",
          );
        }
      },
    );
  }


  if (
    status === "posted" ||
    status === "cancelled"
  ) {
    return null;
  }


  return (
    <div className="flex flex-wrap gap-3">
      {status === "draft" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            runAction(
              approveSupplierReturnAction,
              "Supplier Return approved.",
            )
          }
          className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}

          Approve
        </button>
      ) : null}


      {status === "approved" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            runAction(
              dispatchSupplierReturnAction,
              "Supplier Return dispatched.",
            )
          }
          className="inline-flex h-10 items-center gap-2 rounded-md bg-orange-600 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PackageCheck className="size-4" />
          )}

          Dispatch Inventory
        </button>
      ) : null}


      {status === "dispatched" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            runAction(
              postSupplierReturnAction,
              "Supplier Return posted to General Ledger.",
            )
          }
          className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ReceiptText className="size-4" />
          )}

          Post to GL
        </button>
      ) : null}
    </div>
  );
}