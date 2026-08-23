"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createSupplierReturn,
  getSupplierReturnEligibleItems,
  type CreateSupplierReturnInput,
  type SupplierReturnEligibleItem,
} from "@/lib/repositories/supplier-return.repository";


export async function loadSupplierReturnItemsAction(
  quickPurchaseId: string,
): Promise<SupplierReturnEligibleItem[]> {
  await requireAdmin();

  const id =
    quickPurchaseId.trim();

  if (!id) {
    throw new Error(
      "Quick Purchase is required.",
    );
  }

  return getSupplierReturnEligibleItems(
    id,
  );
}


export async function createSupplierReturnAction(
  input: CreateSupplierReturnInput,
): Promise<string> {
  await requireAdmin();

  if (!input.quickPurchaseId) {
    throw new Error(
      "Quick Purchase is required.",
    );
  }

  if (
    !input.reason ||
    input.reason.trim().length < 3
  ) {
    throw new Error(
      "A meaningful return reason is required.",
    );
  }

  if (
    !input.items ||
    input.items.length === 0
  ) {
    throw new Error(
      "Select at least one item to return.",
    );
  }

  const supplierReturnId =
    await createSupplierReturn({
      ...input,

      reason:
        input.reason.trim(),

      notes:
        input.notes?.trim() ||
        undefined,

      items:
        input.items.map(
          (item) => ({
            ...item,

            reason:
              item.reason?.trim() ||
              null,

            notes:
              item.notes?.trim() ||
              null,
          }),
        ),
    });

  revalidatePath(
    "/admin/purchasing/returns",
  );

  revalidatePath(
    `/admin/purchasing/returns/${supplierReturnId}`,
  );

  return supplierReturnId;
}