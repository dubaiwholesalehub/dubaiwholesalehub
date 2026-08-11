"use client";

import {
  useState,
} from "react";
import {
  Check,
  Loader2,
  Pencil,
  X,
} from "lucide-react";

import {
  updateDeliveryItemQuantitiesAction,
} from "@/app/admin/(protected)/sales/deliveries/actions";
import { Button } from "@/components/ui/button";
import type {
  DeliveryOrderItem,
  DeliveryOrderStatus,
} from "@/lib/repositories/delivery-order.repository";

interface DeliveryQuantityEditorProps {
  deliveryOrderId: string;
  item: DeliveryOrderItem;
  status: DeliveryOrderStatus;
}

export default function DeliveryQuantityEditor({
  deliveryOrderId,
  item,
  status,
}: DeliveryQuantityEditorProps) {
  const [
    isEditing,
    setIsEditing,
  ] = useState(false);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    deliveryQuantity,
    setDeliveryQuantity,
  ] = useState(
    String(item.delivery_quantity),
  );

  const [
    pickedQuantity,
    setPickedQuantity,
  ] = useState(
    String(item.picked_quantity),
  );

  const [
    packedQuantity,
    setPackedQuantity,
  ] = useState(
    String(item.packed_quantity),
  );

  const canEditDelivery =
    status === "draft";

  const canEditPicked =
    status === "draft" ||
    status === "picking";

  const canEditPacked =
    status === "picked" ||
    status === "packing";

  const isEditable =
    canEditDelivery ||
    canEditPicked ||
    canEditPacked;

  function resetValues() {
    setDeliveryQuantity(
      String(
        item.delivery_quantity,
      ),
    );

    setPickedQuantity(
      String(
        item.picked_quantity,
      ),
    );

    setPackedQuantity(
      String(
        item.packed_quantity,
      ),
    );

    setError(null);
  }

  function handleCancel() {
    resetValues();
    setIsEditing(false);
  }

  async function handleSave() {
    const parsedDelivery =
      Number(deliveryQuantity);

    const parsedPicked =
      Number(pickedQuantity);

    const parsedPacked =
      Number(packedQuantity);

    if (
      canEditDelivery &&
      (
        !Number.isFinite(
          parsedDelivery,
        ) ||
        parsedDelivery <= 0
      )
    ) {
      setError(
        "Delivery quantity must be greater than zero.",
      );

      return;
    }

    if (
      canEditPicked &&
      (
        !Number.isFinite(
          parsedPicked,
        ) ||
        parsedPicked < 0 ||
        parsedPicked >
          parsedDelivery
      )
    ) {
      setError(
        "Picked quantity must be between zero and the delivery quantity.",
      );

      return;
    }

    if (
      canEditPacked &&
      (
        !Number.isFinite(
          parsedPacked,
        ) ||
        parsedPacked < 0 ||
        parsedPacked >
          parsedPicked
      )
    ) {
      setError(
        "Packed quantity must be between zero and the picked quantity.",
      );

      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await updateDeliveryItemQuantitiesAction(
        deliveryOrderId,
        item.id,
        {
          deliveryQuantity:
            canEditDelivery
              ? parsedDelivery
              : undefined,

          pickedQuantity:
            canEditPicked
              ? parsedPicked
              : undefined,

          packedQuantity:
            canEditPacked
              ? parsedPacked
              : undefined,
        },
      );

      setIsEditing(false);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to save quantities.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-end gap-2">
        {isEditable ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setIsEditing(true)
            }
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Read only
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-52 space-y-3 rounded-lg border bg-muted/20 p-3">
      {canEditDelivery ? (
        <QuantityField
          label="Planned"
          value={deliveryQuantity}
          max={
            item.ordered_quantity -
            item.previously_delivered_quantity
          }
          disabled={isSaving}
          onChange={
            setDeliveryQuantity
          }
        />
      ) : null}

      {canEditPicked ? (
        <QuantityField
          label="Picked"
          value={pickedQuantity}
          max={
            Number(
              deliveryQuantity,
            ) || 0
          }
          disabled={isSaving}
          onChange={
            setPickedQuantity
          }
        />
      ) : null}

      {canEditPacked ? (
        <QuantityField
          label="Packed"
          value={packedQuantity}
          max={
            Number(
              pickedQuantity,
            ) || 0
          }
          disabled={isSaving}
          onChange={
            setPackedQuantity
          }
        />
      ) : null}

      {error ? (
        <p
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSaving}
          onClick={handleCancel}
        >
          <X className="size-3.5" />
          Cancel
        </Button>

        <Button
          type="button"
          size="sm"
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}

          {isSaving
            ? "Saving..."
            : "Save"}
        </Button>
      </div>
    </div>
  );
}

function QuantityField({
  label,
  value,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  max: number;
  disabled: boolean;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>

      <input
        type="number"
        inputMode="decimal"
        min="0"
        max={max}
        step="0.0001"
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="h-9 w-full rounded-lg border bg-background px-3 text-right text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <span className="mt-1 block text-[11px] text-muted-foreground">
        Maximum:{" "}
        {formatQuantity(max)}
      </span>
    </label>
  );
}

function formatQuantity(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-AE",
    {
      maximumFractionDigits: 4,
    },
  ).format(value);
}