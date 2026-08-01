"use client";

import { useState } from "react";
import { CheckCircle2, Power } from "lucide-react";

import ConfirmDialog from "@/components/admin/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { changeWarehouseStatusAction } from "@/app/admin/(protected)/inventory/warehouses/actions";

interface WarehouseStatusButtonProps {
  warehouseId: string;
  isActive: boolean;
  isDefault: boolean;
}

export default function WarehouseStatusButton({
  warehouseId,
  isActive,
  isDefault,
}: WarehouseStatusButtonProps) {
  const [message, setMessage] = useState<string | null>(null);

  const [isError, setIsError] = useState(false);

  const cannotDeactivate = isActive && isDefault;

  async function handleStatusChange() {
    setMessage(null);
    setIsError(false);

    const result = await changeWarehouseStatusAction(warehouseId, !isActive);

    setIsError(!result.success);
    setMessage(result.message);

    if (!result.success) {
      throw new Error(result.message ?? "Unable to update warehouse status.");
    }
  }

  return (
    <div className="space-y-2">
      <ConfirmDialog
        title={isActive ? "Deactivate warehouse?" : "Activate warehouse?"}
        description={
          isActive
            ? "This warehouse will no longer be available for new inventory transactions. Existing history and records will remain unchanged."
            : "This warehouse will become available for inventory transactions and warehouse selections."
        }
        confirmLabel={isActive ? "Deactivate" : "Activate"}
        variant={isActive ? "destructive" : "default"}
        disabled={cannotDeactivate}
        trigger={
          <Button
            type="button"
            variant={isActive ? "destructive" : "default"}
            disabled={cannotDeactivate}
          >
            {isActive ? (
              <>
                <Power className="size-4" />
                Deactivate
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Activate
              </>
            )}
          </Button>
        }
        onConfirm={handleStatusChange}
      />

      {cannotDeactivate ? (
        <p className="max-w-sm text-xs text-muted-foreground">
          The default warehouse must remain active. Set another warehouse as
          default before deactivating this one.
        </p>
      ) : null}

      {message ? (
        <p
          role="status"
          className={
            isError ? "text-sm text-destructive" : "text-sm text-emerald-700"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
