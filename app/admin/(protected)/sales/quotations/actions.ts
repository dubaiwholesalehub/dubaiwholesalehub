"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    addSalesQuotationItem,
    addSalesQuotationItems,
    createSalesQuotation,
    deleteDraftSalesQuotation,
    getProductQuotationPricingInsight,
    getSalesQuotationById,
    setSalesQuotationStatus,
    updateSalesQuotation,
    updateSalesQuotationItem,
    type BulkSalesQuotationItemInput,
    type ProductQuotationPricingInsight,
    type SalesQuotationStatus,
} from "@/lib/repositories/sales-quotation.repository";
import {
    convertQuotationToSalesOrder,
} from "@/lib/repositories/sales-order.repository";
import {
    salesQuotationSchema,
    salesQuotationItemSchema,
    type SalesQuotationItemValidatedValues,
    type SalesQuotationValidatedValues,
} from "@/lib/validation/sales-quotation.schema";

const QUOTATION_LIST_URL =
    "/admin/sales/quotations";

function getErrorMessage(
    error: unknown,
    fallback: string,
): string {
    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
    ) {
        return error.message;
    }

    return fallback;
}

/* =========================================================
 * Create
 * ========================================================= */

export async function createSalesQuotationAction(
    values: SalesQuotationValidatedValues,
): Promise<void> {
    let quotationId: string;

    try {
        const validated =
            salesQuotationSchema.parse(values);

        const quotation =
            await createSalesQuotation({
                customer_id:
                    validated.customer_id,

                customer_contact_id:
                    validated.customer_contact_id ??
                    null,

                billing_address_id:
                    validated.billing_address_id ??
                    null,

                shipping_address_id:
                    validated.shipping_address_id ??
                    null,

                warehouse_id:
                    validated.warehouse_id ?? null,

                quotation_date:
                    validated.quotation_date,

                valid_until:
                    validated.valid_until ?? null,

                status: "draft",

                source:
                    validated.source,

                external_reference:
                    validated.external_reference ??
                    null,

                customer_reference:
                    validated.customer_reference ??
                    null,

                currency_code:
                    validated.currency_code,

                exchange_rate:
                    validated.exchange_rate,

                shipping_amount:
                    validated.shipping_amount,

                payment_terms_days:
                    validated.payment_terms_days,

                delivery_terms:
                    validated.delivery_terms ?? null,

                payment_terms:
                    validated.payment_terms ?? null,

                customer_notes:
                    validated.customer_notes ?? null,

                internal_notes:
                    validated.internal_notes ?? null,
            });

        quotationId = quotation.id;
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to create the sales quotation.",
            ),
        );
    }

    revalidatePath(QUOTATION_LIST_URL);

    redirect(
        `/admin/sales/quotations/${quotationId}`,
    );
}

/* =========================================================
 * Update
 * ========================================================= */

export async function updateSalesQuotationAction(
    quotationId: string,
    values: SalesQuotationValidatedValues,
): Promise<void> {
    const id = quotationId.trim();

    if (!id) {
        throw new Error(
            "Sales quotation ID is required.",
        );
    }

    try {
        const validated =
            salesQuotationSchema.parse(values);

        await updateSalesQuotation(id, {
            customer_id:
                validated.customer_id,

            customer_contact_id:
                validated.customer_contact_id ??
                null,

            billing_address_id:
                validated.billing_address_id ??
                null,

            shipping_address_id:
                validated.shipping_address_id ??
                null,

            warehouse_id:
                validated.warehouse_id ?? null,

            quotation_date:
                validated.quotation_date,

            valid_until:
                validated.valid_until ?? null,

            source:
                validated.source,

            external_reference:
                validated.external_reference ??
                null,

            customer_reference:
                validated.customer_reference ??
                null,

            currency_code:
                validated.currency_code,

            exchange_rate:
                validated.exchange_rate,

            shipping_amount:
                validated.shipping_amount,

            payment_terms_days:
                validated.payment_terms_days,

            delivery_terms:
                validated.delivery_terms ?? null,

            payment_terms:
                validated.payment_terms ?? null,

            customer_notes:
                validated.customer_notes ?? null,

            internal_notes:
                validated.internal_notes ?? null,
        });
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to update the sales quotation.",
            ),
        );
    }

    revalidatePath(QUOTATION_LIST_URL);

    revalidatePath(
        `/admin/sales/quotations/${id}`,
    );

    redirect(
        `/admin/sales/quotations/${id}`,
    );
}

/* =========================================================
 * Status
 * ========================================================= */

export interface SalesQuotationStatusActionState {
    success: boolean;
    message: string | null;
}

export async function changeSalesQuotationStatusAction(
    quotationId: string,
    status: SalesQuotationStatus,
): Promise<SalesQuotationStatusActionState> {
    const id = quotationId.trim();

    if (!id) {
        return {
            success: false,
            message:
                "Sales quotation ID is required.",
        };
    }

    try {
        const quotation =
            await setSalesQuotationStatus(
                id,
                status,
            );

        revalidatePath(QUOTATION_LIST_URL);

        revalidatePath(
            `/admin/sales/quotations/${id}`,
        );

        const messages: Record<
            SalesQuotationStatus,
            string
        > = {
            draft:
                "Quotation returned to draft.",

            sent:
                "Quotation marked as sent.",

            accepted:
                "Quotation accepted successfully.",

            rejected:
                "Quotation marked as rejected.",

            expired:
                "Quotation marked as expired.",

            cancelled:
                "Quotation cancelled successfully.",

            converted:
                "Quotation converted successfully.",
        };

        return {
            success: true,
            message:
                messages[quotation.status],
        };
    } catch (error) {
        return {
            success: false,
            message: getErrorMessage(
                error,
                "Unable to update the quotation status.",
            ),
        };
    }
}

/* =========================================================
 * Delete Draft
 * ========================================================= */

export interface DeleteSalesQuotationActionState {
    success: boolean;
    message: string | null;
}

export async function deleteDraftSalesQuotationAction(
    quotationId: string,
): Promise<DeleteSalesQuotationActionState> {
    const id = quotationId.trim();

    if (!id) {
        return {
            success: false,
            message:
                "Sales quotation ID is required.",
        };
    }

    try {
        await deleteDraftSalesQuotation(id);

        revalidatePath(QUOTATION_LIST_URL);

        return {
            success: true,
            message:
                "Draft quotation deleted successfully.",
        };
    } catch (error) {
        return {
            success: false,
            message: getErrorMessage(
                error,
                "Unable to delete the draft quotation.",
            ),
        };
    }
}

export async function addSalesQuotationItemAction(
    quotationId: string,
    values: SalesQuotationItemValidatedValues,
): Promise<void> {
    const id = quotationId.trim();

    if (!id) {
        throw new Error(
            "Sales quotation ID is required.",
        );
    }

    try {
        const validated =
            salesQuotationItemSchema.parse(
                values,
            );

        await addSalesQuotationItem({
            sales_quotation_id: id,

            product_id:
                validated.product_id ?? null,

            unit_id:
                validated.unit_id ?? null,

            sku:
                validated.sku ?? null,

            item_name:
                validated.item_name,

            description:
                validated.description ?? null,

            quantity:
                validated.quantity,

            unit_price:
                validated.unit_price,

            discount_percentage:
                validated.discount_percentage,

            tax_percentage:
                validated.tax_percentage,

            requested_delivery_date:
                validated.requested_delivery_date ??
                null,

            line_notes:
                validated.line_notes ?? null,
        });
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to add the quotation item.",
            ),
        );
    }

    revalidatePath(
        `/admin/sales/quotations/${id}`,
    );

    revalidatePath(QUOTATION_LIST_URL);

    redirect(
        `/admin/sales/quotations/${id}`,
    );
}

export async function updateSalesQuotationItemAction(
    quotationId: string,
    itemId: string,
    values: SalesQuotationItemValidatedValues,
): Promise<void> {
    const normalizedQuotationId =
        quotationId.trim();

    const normalizedItemId =
        itemId.trim();

    if (!normalizedQuotationId) {
        throw new Error(
            "Sales quotation ID is required.",
        );
    }

    if (!normalizedItemId) {
        throw new Error(
            "Sales quotation item ID is required.",
        );
    }

    try {
        const validated =
            salesQuotationItemSchema.parse(
                values,
            );

        await updateSalesQuotationItem(
            normalizedItemId,
            {
                product_id:
                    validated.product_id ?? null,

                unit_id:
                    validated.unit_id ?? null,

                sku:
                    validated.sku ?? null,

                item_name:
                    validated.item_name,

                description:
                    validated.description ?? null,

                quantity:
                    validated.quantity,

                unit_price:
                    validated.unit_price,

                discount_percentage:
                    validated.discount_percentage,

                tax_percentage:
                    validated.tax_percentage,

                requested_delivery_date:
                    validated.requested_delivery_date ??
                    null,

                line_notes:
                    validated.line_notes ?? null,
            },
        );
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to update the quotation item.",
            ),
        );
    }

    revalidatePath(
        `/admin/sales/quotations/${normalizedQuotationId}`,
    );

    revalidatePath(QUOTATION_LIST_URL);

    redirect(
        `/admin/sales/quotations/${normalizedQuotationId}`,
    );
}

export async function addSalesQuotationItemsAction(
    quotationId: string,
    items: BulkSalesQuotationItemInput[],
): Promise<void> {
    const id = quotationId.trim();

    if (!id) {
        throw new Error(
            "Sales quotation ID is required.",
        );
    }

    try {
        await addSalesQuotationItems(
            id,
            items,
        );
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to add quotation items.",
            ),
        );
    }

    revalidatePath(
        `/admin/sales/quotations/${id}`,
    );

    revalidatePath(
        QUOTATION_LIST_URL,
    );
}

export async function getQuotationProductPricingAction(
    quotationId: string,
    productId: string,
): Promise<ProductQuotationPricingInsight> {
    const normalizedQuotationId =
        quotationId.trim();

    const normalizedProductId =
        productId.trim();

    if (!normalizedQuotationId) {
        throw new Error(
            "Sales quotation ID is required.",
        );
    }

    if (!normalizedProductId) {
        throw new Error(
            "Product ID is required.",
        );
    }

    const quotation =
        await getSalesQuotationById(
            normalizedQuotationId,
        );

    if (!quotation) {
        throw new Error(
            "Sales quotation was not found.",
        );
    }

    if (quotation.status !== "draft") {
        throw new Error(
            "Pricing insights are only available while editing a draft quotation.",
        );
    }

    return getProductQuotationPricingInsight(
        normalizedProductId,
        quotation.customer_id,
        quotation.warehouse_id,
    );
}

/* =========================================================
 * Convert to Sales Order
 * ========================================================= */

export async function convertQuotationToSalesOrderAction(
  quotationId: string,
): Promise<void> {
  const id = quotationId.trim();

  if (!id) {
    throw new Error(
      "Sales quotation ID is required.",
    );
  }

  try {
    const order =
      await convertQuotationToSalesOrder(
        id,
      );

    revalidatePath(
      QUOTATION_LIST_URL,
    );

    revalidatePath(
      `/admin/sales/quotations/${id}`,
    );

    revalidatePath(
      "/admin/sales/orders",
    );

    redirect(
      `/admin/sales/orders/${order.id}`,
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Unable to convert quotation.",
      ),
    );
  }
}