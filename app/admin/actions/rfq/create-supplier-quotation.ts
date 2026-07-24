"use server";

import { revalidatePath } from "next/cache";

import { createSupplierQuotation } from "@/lib/repositories/rfq";
import {
  supplierQuotationSchema,
  type SupplierQuotationInput,
} from "@/lib/validation/rfq/supplier-quotation";

export type CreateSupplierQuotationActionResult = {
  success: boolean;
  quotationId?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createSupplierQuotationAction(
  input: SupplierQuotationInput,
): Promise<CreateSupplierQuotationActionResult> {
  const validationResult =
    supplierQuotationSchema.safeParse(input);

  if (!validationResult.success) {
    return {
      success: false,
      message:
        "Please correct the highlighted quotation fields.",
      fieldErrors:
        validationResult.error.flatten().fieldErrors,
    };
  }

  try {
    const quotationId =
      await createSupplierQuotation({
        ...validationResult.data,

        // The RPC derives the actual supplier from rfqSupplierId.
        // This field remains required by the existing repository type.
        supplierId: "",
      });

    revalidatePath(
      `/admin/rfqs/${validationResult.data.rfqId}`,
    );

    revalidatePath(
      `/admin/rfqs/${validationResult.data.rfqId}/quotations`,
    );

    revalidatePath(
      `/admin/rfqs/${validationResult.data.rfqId}/comparison`,
    );

    return {
      success: true,
      quotationId,
      message:
        "Supplier quotation saved successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to save the supplier quotation.",
    };
  }
}