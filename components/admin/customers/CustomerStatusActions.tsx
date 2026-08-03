"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Ban,
  CheckCircle2,
  PauseCircle,
} from "lucide-react";

import ConfirmDialog from "@/components/admin/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { changeCustomerStatusAction } from "@/app/admin/(protected)/customers/actions";
import type {
  CustomerStatus,
} from "@/lib/repositories/customer.repository";

interface CustomerStatusActionsProps {
  customerId: string;
  currentStatus: CustomerStatus;
}

export default function CustomerStatusActions({
  customerId,
  currentStatus,
}: CustomerStatusActionsProps) {
  const router = useRouter();

  const [message, setMessage] =
    useState<string | null>(null);

  const [isError, setIsError] =
    useState(false);

  async function updateStatus(
    status: CustomerStatus,
  ): Promise<void> {
    setMessage(null);
    setIsError(false);

    const result =
      await changeCustomerStatusAction(
        customerId,
        status,
      );

    setMessage(result.message);
    setIsError(!result.success);

    if (!result.success) {
      throw new Error(
        result.message ??
          "Unable to update customer status.",
      );
    }

    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      {currentStatus !== "active" ? (
        <ConfirmDialog
          title="Activate customer?"
          description="This customer will become available for new quotations, orders, invoices and other transactions."
          confirmLabel="Activate"
          trigger={
            <Button
              type="button"
              variant="default"
            >
              <CheckCircle2 className="size-4" />
              Activate
            </Button>
          }
          onConfirm={() =>
            updateStatus("active")
          }
        />
      ) : null}

      {currentStatus !== "inactive" ? (
        <ConfirmDialog
          title="Mark customer inactive?"
          description="The customer record and transaction history will remain available, but the customer should no longer be selected for new transactions."
          confirmLabel="Mark Inactive"
          trigger={
            <Button
              type="button"
              variant="outline"
            >
              <PauseCircle className="size-4" />
              Mark Inactive
            </Button>
          }
          onConfirm={() =>
            updateStatus("inactive")
          }
        />
      ) : null}

      {currentStatus !== "blocked" ? (
        <ConfirmDialog
          title="Block customer?"
          description="Blocking should be used when new sales transactions must be prevented. Existing records and transaction history will remain unchanged."
          confirmLabel="Block Customer"
          variant="destructive"
          trigger={
            <Button
              type="button"
              variant="destructive"
            >
              <Ban className="size-4" />
              Block
            </Button>
          }
          onConfirm={() =>
            updateStatus("blocked")
          }
        />
      ) : null}

      {message ? (
        <p
          role="status"
          className={
            isError
              ? "w-full text-sm text-destructive"
              : "w-full text-sm text-emerald-700"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}