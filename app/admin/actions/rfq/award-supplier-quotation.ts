"use server";

import { revalidatePath } from "next/cache";

import { awardSupplierQuotation } from "@/lib/repositories/rfq";

export type AwardSupplierQuotationActionResult = {
  success: boolean;
  message: string;
};

export async function awardSupplierQuotationAction(
  rfqId: string,
  quotationId: string,
): Promise<AwardSupplierQuotationActionResult> {
  if (!rfqId.trim()) {
    return {
      success: false,
      message: "RFQ ID is required.",
    };
  }

  if (!quotationId.trim()) {
    return {
      success: false,
      message: "Quotation ID is required.",
    };
  }

  try {
    await awardSupplierQuotation(
      rfqId,
      quotationId,
    );

    revalidatePath(
      `/admin/rfqs/${rfqId}`,
    );

    revalidatePath(
      `/admin/rfqs/${rfqId}/comparison`,
    );

    revalidatePath(
      `/admin/rfqs`,
    );

    return {
      success: true,
      message:
        "Supplier quotation awarded successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to award the supplier quotation.",
    };
  }
}