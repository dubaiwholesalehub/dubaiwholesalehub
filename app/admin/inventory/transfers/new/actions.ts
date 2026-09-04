"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";

import { createInventoryTransfer } from "@/lib/repositories/inventory-transfer.repository";

export type CreateInventoryTransferActionState = {
  error: string | null;

  fieldErrors: {
    sourceWarehouseId?: string;
    destinationWarehouseId?: string;
    transferDate?: string;
    expectedArrivalDate?: string;
  };
};


function getRequiredString(
  formData: FormData,
  fieldName: string,
): string {
  const value = formData.get(fieldName);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function getOptionalString(
  formData: FormData,
  fieldName: string,
): string | null {
  const value = getRequiredString(
    formData,
    fieldName,
  );

  return value || null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime());
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unable to create the inventory transfer.";
}

export async function createInventoryTransferAction(
  _previousState: CreateInventoryTransferActionState,
  formData: FormData,
): Promise<CreateInventoryTransferActionState> {
  await requireAdmin();
  const sourceWarehouseId = getRequiredString(
    formData,
    "sourceWarehouseId",
  );

  const destinationWarehouseId =
    getRequiredString(
      formData,
      "destinationWarehouseId",
    );

  const transferDate = getRequiredString(
    formData,
    "transferDate",
  );

  const expectedArrivalDate =
    getOptionalString(
      formData,
      "expectedArrivalDate",
    );

  const referenceNumber = getOptionalString(
    formData,
    "referenceNumber",
  );

  const reason = getOptionalString(
    formData,
    "reason",
  );

  const internalNotes = getOptionalString(
    formData,
    "internalNotes",
  );

  const fieldErrors:
    CreateInventoryTransferActionState["fieldErrors"] =
    {};

  if (!sourceWarehouseId) {
    fieldErrors.sourceWarehouseId =
      "Select a source warehouse.";
  }

  if (!destinationWarehouseId) {
    fieldErrors.destinationWarehouseId =
      "Select a destination warehouse.";
  }

  if (
    sourceWarehouseId &&
    destinationWarehouseId &&
    sourceWarehouseId === destinationWarehouseId
  ) {
    fieldErrors.destinationWarehouseId =
      "The destination must be different from the source warehouse.";
  }

  if (!transferDate) {
    fieldErrors.transferDate =
      "Transfer date is required.";
  } else if (!isValidDate(transferDate)) {
    fieldErrors.transferDate =
      "Enter a valid transfer date.";
  }

  if (
    expectedArrivalDate &&
    !isValidDate(expectedArrivalDate)
  ) {
    fieldErrors.expectedArrivalDate =
      "Enter a valid expected arrival date.";
  }

  if (
    transferDate &&
    expectedArrivalDate &&
    isValidDate(transferDate) &&
    isValidDate(expectedArrivalDate) &&
    expectedArrivalDate < transferDate
  ) {
    fieldErrors.expectedArrivalDate =
      "Expected arrival cannot be before the transfer date.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error:
        "Review the highlighted fields and try again.",
      fieldErrors,
    };
  }

  let transferId: string;

  try {
    const transfer =
      await createInventoryTransfer({
        source_warehouse_id:
          sourceWarehouseId,

        destination_warehouse_id:
          destinationWarehouseId,

        transfer_date: transferDate,

        expected_arrival_date:
          expectedArrivalDate,

        reference_number:
          referenceNumber,

        reason,

        internal_notes:
          internalNotes,
      });

    transferId = transfer.id;
  } catch (error) {
    return {
      error: getErrorMessage(error),
      fieldErrors: {},
    };
  }

  revalidatePath(
    "/admin/inventory/transfers",
  );

  redirect(
    `/admin/inventory/transfers/${transferId}`,
  );
}