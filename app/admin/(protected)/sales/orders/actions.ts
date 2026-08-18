"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    cancelSalesOrder,
    confirmSalesOrder,
    createSalesOrder,
    updateSalesOrder,
    approveSalesMarginException,
} from "@/lib/repositories/sales-order.repository";
import {
    salesOrderSchema,
    type SalesOrderValidatedValues,
} from "@/lib/validation/sales-order.schema";

const SALES_ORDER_LIST_URL =
    "/admin/sales/orders";

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
 * Create Sales Order
 * ========================================================= */

export async function createSalesOrderAction(
    values: SalesOrderValidatedValues,
): Promise<void> {
    let salesOrderId: string;

    try {
        const validated =
            salesOrderSchema.parse(values);

        const salesOrder =
            await createSalesOrder({
                quotation_id:
                    validated.quotation_id ??
                    null,

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
                    validated.warehouse_id ??
                    null,

                order_date:
                    validated.order_date,

                requested_delivery_date:
                    validated.requested_delivery_date ??
                    null,

                expected_delivery_date:
                    validated.expected_delivery_date ??
                    null,

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
                    validated.delivery_terms ??
                    null,

                payment_terms:
                    validated.payment_terms ??
                    null,

                customer_notes:
                    validated.customer_notes ??
                    null,

                internal_notes:
                    validated.internal_notes ??
                    null,
            });

        salesOrderId =
            salesOrder.id;
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to create the sales order.",
            ),
        );
    }

    revalidatePath(
        SALES_ORDER_LIST_URL,
    );

    redirect(
        `/admin/sales/orders/${salesOrderId}`,
    );
}

/* =========================================================
 * Update Sales Order
 * ========================================================= */

export async function updateSalesOrderAction(
    salesOrderId: string,
    values: SalesOrderValidatedValues,
): Promise<void> {
    const id =
        salesOrderId.trim();

    if (!id) {
        throw new Error(
            "Sales order ID is required.",
        );
    }

    try {
        const validated =
            salesOrderSchema.parse(values);

        await updateSalesOrder(id, {
            quotation_id:
                validated.quotation_id ??
                null,

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
                validated.warehouse_id ??
                null,

            order_date:
                validated.order_date,

            requested_delivery_date:
                validated.requested_delivery_date ??
                null,

            expected_delivery_date:
                validated.expected_delivery_date ??
                null,

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
                validated.delivery_terms ??
                null,

            payment_terms:
                validated.payment_terms ??
                null,

            customer_notes:
                validated.customer_notes ??
                null,

            internal_notes:
                validated.internal_notes ??
                null,
        });
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to update the sales order.",
            ),
        );
    }

    revalidatePath(
        SALES_ORDER_LIST_URL,
    );

    revalidatePath(
        `/admin/sales/orders/${id}`,
    );

    redirect(
        `/admin/sales/orders/${id}`,
    );
}

/* =========================================================
 * Confirm Sales Order
 * ========================================================= */

export async function confirmSalesOrderAction(
    salesOrderId: string,
): Promise<void> {
    const id = salesOrderId.trim();

    if (!id) {
        throw new Error(
            "Sales order ID is required.",
        );
    }

    try {
        await confirmSalesOrder(id);
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to confirm the sales order.",
            ),
        );
    }

    revalidatePath(
        SALES_ORDER_LIST_URL,
    );

    revalidatePath(
        `/admin/sales/orders/${id}`,
    );

    redirect(
        `/admin/sales/orders/${id}`,
    );
}

/* =========================================================
 * Cancel Sales Order
 * ========================================================= */

export async function cancelSalesOrderAction(
    salesOrderId: string,
): Promise<void> {
    const id = salesOrderId.trim();

    if (!id) {
        throw new Error(
            "Sales order ID is required.",
        );
    }

    try {
        await cancelSalesOrder(id);
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to cancel the sales order.",
            ),
        );
    }

    revalidatePath(
        SALES_ORDER_LIST_URL,
    );

    revalidatePath(
        `/admin/sales/orders/${id}`,
    );

    redirect(
        `/admin/sales/orders/${id}`,
    );
}

export async function approveAndConfirmSalesOrderAction(
    formData: FormData,
) {
    const salesOrderId =
        String(
            formData.get(
                "salesOrderId",
            ) ?? "",
        ).trim();

    const reason =
        String(
            formData.get(
                "reason",
            ) ?? "",
        ).trim();


    if (!salesOrderId) {
        throw new Error(
            "Sales Order ID is required.",
        );
    }


    if (!reason) {
        throw new Error(
            "Approval reason is required.",
        );
    }


    await approveSalesMarginException(
        salesOrderId,
        reason,
    );


    await confirmSalesOrder(
        salesOrderId,
    );


    revalidatePath(
        `/admin/sales/orders/${salesOrderId}`,
    );

    revalidatePath(
        "/admin/sales/orders",
    );


    redirect(
        `/admin/sales/orders/${salesOrderId}?success=margin-approved`,
    );
}