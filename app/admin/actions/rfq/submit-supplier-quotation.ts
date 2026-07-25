"use server";

import { revalidatePath } from "next/cache";

import { submitSupplierQuotation } from "@/lib/repositories/rfq";

export type SubmitSupplierQuotationActionResult = {
    success: boolean;
    message: string;
};

export async function submitSupplierQuotationAction(
    rfqId: string,
    quotationId: string,
): Promise<SubmitSupplierQuotationActionResult> {
    try {
        const quotation =
            await submitSupplierQuotation(quotationId);

        if (!quotation || quotation.status !== "submitted") {
            return {
                success: false,
                message:
                    "The quotation submission completed without returning submitted status.",
            };
        }

        revalidatePath(`/admin/rfqs/${rfqId}`);
        revalidatePath(`/admin/rfqs/${rfqId}/quotations`);
        revalidatePath(`/admin/rfqs`);

        return {
            success: true,
            message: "Quotation submitted successfully.",
        };
    } catch (error) {
        return {
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Unable to submit quotation.",
        };
    }
}