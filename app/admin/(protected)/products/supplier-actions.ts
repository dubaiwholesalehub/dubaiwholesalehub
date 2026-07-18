"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  archiveProductSupplier,
  createProductSupplier,
  restoreProductSupplier,
  setPreferredProductSupplier,
  updateProductSupplier,
} from "@/lib/repositories/product-supplier.repository";
import { productSupplierSchema } from "@/schemas/product-supplier.schema";

import type {
  SupplierActionResult,
} from "@/components/admin/products/supplier-intelligence/types";

function getRequiredFormValue(
  formData: FormData,
  key: string,
): string {
  const value = formData.get(key);

  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function getOptionalString(
  formData: FormData,
  key: string,
): string {
  const value = formData.get(key);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function buildSupplierInput(formData: FormData) {
  return {
    productId: getOptionalString(
      formData,
      "productId",
    ),
    supplierId: getOptionalString(
      formData,
      "supplierId",
    ),
    supplierSku: getOptionalString(
      formData,
      "supplierSku",
    ),
    costPrice: getOptionalString(
      formData,
      "costPrice",
    ),
    currencyCode:
      getOptionalString(
        formData,
        "currencyCode",
      ) || "AED",
    moq: getOptionalString(formData, "moq"),
    leadTime: getOptionalString(
      formData,
      "leadTime",
    ),
    leadTimeDays: getOptionalString(
      formData,
      "leadTimeDays",
    ),
    packaging: getOptionalString(
      formData,
      "packaging",
    ),
    paymentTerms: getOptionalString(
      formData,
      "paymentTerms",
    ),
    incoterm:
      getOptionalString(formData, "incoterm") ||
      undefined,
    loadingPort: getOptionalString(
      formData,
      "loadingPort",
    ),
    priority:
      getOptionalString(formData, "priority") ||
      "0",
    lastPurchasePrice: getOptionalString(
      formData,
      "lastPurchasePrice",
    ),
    notes: getOptionalString(
      formData,
      "notes",
    ),
    isPreferred: formData.has("isPreferred"),
    isActive: formData.has("isActive"),
  };
}

function revalidateSupplierPages(
  productId: string,
) {
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(
    `/admin/products/${productId}/suppliers`,
  );
}

function validationFailure(
  fieldErrors: Record<string, string[] | undefined>,
): SupplierActionResult {
  const normalizedErrors = Object.fromEntries(
    Object.entries(fieldErrors).filter(
      (
        entry,
      ): entry is [string, string[]] =>
        Array.isArray(entry[1]),
    ),
  );

  return {
    success: false,
    message:
      "Please correct the highlighted fields.",
    fieldErrors: normalizedErrors,
  };
}

export async function createProductSupplierAction(
  formData: FormData,
): Promise<SupplierActionResult> {
  await requireAdmin();

  const parsed = productSupplierSchema.safeParse(
    buildSupplierInput(formData),
  );

  if (!parsed.success) {
    return validationFailure(
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    await createProductSupplier(parsed.data);

    revalidateSupplierPages(
      parsed.data.productId,
    );

    return {
      success: true,
      message:
        "Supplier connected to the product successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to connect the supplier.",
    };
  }
}

export async function updateProductSupplierAction(
  formData: FormData,
): Promise<SupplierActionResult> {
  await requireAdmin();

  const mappingId = getOptionalString(
    formData,
    "mappingId",
  );

  if (!mappingId) {
    return {
      success: false,
      message: "Supplier mapping ID is missing.",
    };
  }

  const parsed = productSupplierSchema.safeParse(
    buildSupplierInput(formData),
  );

  if (!parsed.success) {
    return validationFailure(
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    await updateProductSupplier({
      ...parsed.data,
      id: mappingId,
    });

    revalidateSupplierPages(
      parsed.data.productId,
    );

    return {
      success: true,
      message:
        "Supplier information updated successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update the supplier.",
    };
  }
}

export async function setPreferredSupplierAction(
  formData: FormData,
): Promise<SupplierActionResult> {
  await requireAdmin();

  try {
    const productId = getRequiredFormValue(
      formData,
      "productId",
    );

    const mappingId = getRequiredFormValue(
      formData,
      "mappingId",
    );

    await setPreferredProductSupplier(
      productId,
      mappingId,
    );

    revalidateSupplierPages(productId);

    return {
      success: true,
      message:
        "Preferred supplier updated successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update the preferred supplier.",
    };
  }
}

export async function archiveProductSupplierAction(
  formData: FormData,
): Promise<SupplierActionResult> {
  await requireAdmin();

  try {
    const productId = getRequiredFormValue(
      formData,
      "productId",
    );

    const mappingId = getRequiredFormValue(
      formData,
      "mappingId",
    );

    await archiveProductSupplier(
      productId,
      mappingId,
    );

    revalidateSupplierPages(productId);

    return {
      success: true,
      message:
        "Supplier mapping archived successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to archive the supplier mapping.",
    };
  }
}

export async function restoreProductSupplierAction(
  formData: FormData,
): Promise<SupplierActionResult> {
  await requireAdmin();

  try {
    const productId = getRequiredFormValue(
      formData,
      "productId",
    );

    const mappingId = getRequiredFormValue(
      formData,
      "mappingId",
    );

    await restoreProductSupplier(
      productId,
      mappingId,
    );

    revalidateSupplierPages(productId);

    return {
      success: true,
      message:
        "Supplier mapping restored successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to restore the supplier mapping.",
    };
  }
}