"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  archiveProductSupplier,
  createProductSupplier,
  restoreProductSupplier,
  setPreferredProductSupplier,
  updateProductSupplier,
} from "@/lib/repositories/product-supplier.repository";
import {
  productSupplierSchema,
} from "@/schemas/product-supplier.schema";

export type SupplierActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

const supplierMappingIdentitySchema = z.object({
  productId: z.string().uuid(
    "A valid product is required.",
  ),
  mappingId: z.string().uuid(
    "A valid supplier mapping is required.",
  ),
});

function optionalFormValue(
  formData: FormData,
  key: string,
): string | undefined {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.trim();

  return cleaned || undefined;
}

function requiredFormValue(
  formData: FormData,
  key: string,
): string {
  const value = formData.get(key);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function checkboxValue(
  formData: FormData,
  key: string,
): boolean {
  const value = formData.get(key);

  return (
    value === "on" ||
    value === "true" ||
    value === "1"
  );
}

function supplierInputFromFormData(
  formData: FormData,
) {
  return {
    productId: requiredFormValue(
      formData,
      "productId",
    ),

    supplierId: requiredFormValue(
      formData,
      "supplierId",
    ),

    supplierSku: optionalFormValue(
      formData,
      "supplierSku",
    ),

    costPrice: optionalFormValue(
      formData,
      "costPrice",
    ),

    currencyCode:
      optionalFormValue(
        formData,
        "currencyCode",
      ) ?? "AED",

    moq: optionalFormValue(formData, "moq"),

    leadTime: optionalFormValue(
      formData,
      "leadTime",
    ),

    leadTimeDays: optionalFormValue(
      formData,
      "leadTimeDays",
    ),

    packaging: optionalFormValue(
      formData,
      "packaging",
    ),

    paymentTerms: optionalFormValue(
      formData,
      "paymentTerms",
    ),

    incoterm: optionalFormValue(
      formData,
      "incoterm",
    ),

    loadingPort: optionalFormValue(
      formData,
      "loadingPort",
    ),

    priority:
      optionalFormValue(
        formData,
        "priority",
      ) ?? "0",

    lastPurchasePrice: optionalFormValue(
      formData,
      "lastPurchasePrice",
    ),

    notes: optionalFormValue(
      formData,
      "notes",
    ),

    isPreferred: checkboxValue(
      formData,
      "isPreferred",
    ),

    /*
     * Add/edit forms represent active mappings.
     * Archive and restore have dedicated actions.
     */
    isActive: true,
  };
}

function revalidateSupplierPages(
  productId: string,
) {
  revalidatePath("/admin/products");

  /*
   * This is safe even if the product-detail route is
   * introduced later.
   */
  revalidatePath(
    `/admin/products/${productId}`,
  );

  revalidatePath("/");
}

function actionError(
  error: unknown,
  fallbackMessage: string,
): SupplierActionState {
  console.error(error);

  return {
    success: false,
    message:
      error instanceof Error
        ? error.message
        : fallbackMessage,
  };
}

export async function createProductSupplierAction(
  _previousState: SupplierActionState,
  formData: FormData,
): Promise<SupplierActionState> {
  await requireAdmin();

  const parsed = productSupplierSchema.safeParse(
    supplierInputFromFormData(formData),
  );

  if (!parsed.success) {
    return {
      success: false,
      message:
        "Please correct the highlighted fields.",
      errors:
        parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createProductSupplier(parsed.data);

    revalidateSupplierPages(
      parsed.data.productId,
    );

    return {
      success: true,
      message:
        "Supplier added to the product successfully.",
    };
  } catch (error) {
    return actionError(
      error,
      "Unable to add the supplier.",
    );
  }
}

export async function updateProductSupplierAction(
  _previousState: SupplierActionState,
  formData: FormData,
): Promise<SupplierActionState> {
  await requireAdmin();

  const mappingId = requiredFormValue(
    formData,
    "mappingId",
  );

  const parsedIdentity =
    supplierMappingIdentitySchema
      .pick({ mappingId: true })
      .safeParse({ mappingId });

  const parsedInput =
    productSupplierSchema.safeParse(
      supplierInputFromFormData(formData),
    );

  if (
    !parsedIdentity.success ||
    !parsedInput.success
  ) {
    return {
      success: false,
      message:
        "Please correct the highlighted fields.",
      errors: {
        ...(parsedInput.success
          ? {}
          : parsedInput.error.flatten()
              .fieldErrors),

        ...(parsedIdentity.success
          ? {}
          : parsedIdentity.error.flatten()
              .fieldErrors),
      },
    };
  }

  try {
    await updateProductSupplier({
      id: parsedIdentity.data.mappingId,
      ...parsedInput.data,
    });

    revalidateSupplierPages(
      parsedInput.data.productId,
    );

    return {
      success: true,
      message:
        "Supplier information updated successfully.",
    };
  } catch (error) {
    return actionError(
      error,
      "Unable to update the supplier.",
    );
  }
}

export async function archiveProductSupplierAction(
  formData: FormData,
): Promise<SupplierActionState> {
  await requireAdmin();

  const parsed =
    supplierMappingIdentitySchema.safeParse({
      productId: requiredFormValue(
        formData,
        "productId",
      ),
      mappingId: requiredFormValue(
        formData,
        "mappingId",
      ),
    });

  if (!parsed.success) {
    return {
      success: false,
      message:
        "The supplier mapping could not be identified.",
      errors:
        parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await archiveProductSupplier(
      parsed.data.productId,
      parsed.data.mappingId,
    );

    revalidateSupplierPages(
      parsed.data.productId,
    );

    return {
      success: true,
      message:
        "Supplier archived successfully.",
    };
  } catch (error) {
    return actionError(
      error,
      "Unable to archive the supplier.",
    );
  }
}

export async function restoreProductSupplierAction(
  formData: FormData,
): Promise<SupplierActionState> {
  await requireAdmin();

  const parsed =
    supplierMappingIdentitySchema.safeParse({
      productId: requiredFormValue(
        formData,
        "productId",
      ),
      mappingId: requiredFormValue(
        formData,
        "mappingId",
      ),
    });

  if (!parsed.success) {
    return {
      success: false,
      message:
        "The supplier mapping could not be identified.",
      errors:
        parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await restoreProductSupplier(
      parsed.data.productId,
      parsed.data.mappingId,
    );

    revalidateSupplierPages(
      parsed.data.productId,
    );

    return {
      success: true,
      message:
        "Supplier restored successfully.",
    };
  } catch (error) {
    return actionError(
      error,
      "Unable to restore the supplier.",
    );
  }
}

export async function setPreferredSupplierAction(
  formData: FormData,
): Promise<SupplierActionState> {
  await requireAdmin();

  const parsed =
    supplierMappingIdentitySchema.safeParse({
      productId: requiredFormValue(
        formData,
        "productId",
      ),
      mappingId: requiredFormValue(
        formData,
        "mappingId",
      ),
    });

  if (!parsed.success) {
    return {
      success: false,
      message:
        "The supplier mapping could not be identified.",
      errors:
        parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await setPreferredProductSupplier(
      parsed.data.productId,
      parsed.data.mappingId,
    );

    revalidateSupplierPages(
      parsed.data.productId,
    );

    return {
      success: true,
      message:
        "Preferred supplier updated successfully.",
    };
  } catch (error) {
    return actionError(
      error,
      "Unable to set the preferred supplier.",
    );
  }
}