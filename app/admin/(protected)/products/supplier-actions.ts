"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  archiveProductSupplier,
  restoreProductSupplier,
  setPreferredProductSupplier,
} from "@/lib/repositories/product-supplier.repository";

function getRequiredFormValue(
  formData: FormData,
  key: string,
): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function revalidateSupplierPages(productId: string) {
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(
    `/admin/products/${productId}/suppliers`,
  );
}

export async function setPreferredSupplierAction(
  formData: FormData,
) {
  await requireAdmin();

  const productId = getRequiredFormValue(
    formData,
    "productId",
  );
  const mappingId = getRequiredFormValue(
    formData,
    "mappingId",
  );

  await setPreferredProductSupplier({
    productId,
    mappingId,
  });

  revalidateSupplierPages(productId);
}

export async function archiveProductSupplierAction(
  formData: FormData,
) {
  await requireAdmin();

  const productId = getRequiredFormValue(
    formData,
    "productId",
  );
  const mappingId = getRequiredFormValue(
    formData,
    "mappingId",
  );

  await archiveProductSupplier({
    productId,
    mappingId,
  });

  revalidateSupplierPages(productId);
}

export async function restoreProductSupplierAction(
  formData: FormData,
) {
  await requireAdmin();

  const productId = getRequiredFormValue(
    formData,
    "productId",
  );
  const mappingId = getRequiredFormValue(
    formData,
    "mappingId",
  );

  await restoreProductSupplier({
    productId,
    mappingId,
  });

  revalidateSupplierPages(productId);
}