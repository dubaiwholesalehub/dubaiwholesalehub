"use server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";

import {
    SalesInvoiceDisplaySettings,
    SalesInvoiceTemplateType,
    updateSalesInvoicePresentation,
} from "@/lib/repositories/sales-invoice.repository";

function stringValue(
    formData: FormData,
    key: string,
): string {
    return String(
        formData.get(key) ?? "",
    ).trim();
}

function booleanValue(
    formData: FormData,
    key: string,
): boolean {
    return formData.get(key) === "true";
}

export async function updateSalesInvoicePresentationAction(
    salesOrderId: string,
    invoiceId: string,
    formData: FormData,
) {
    await requireAdmin();
    const templateValue =
        stringValue(
            formData,
            "template_type",
        );

    const templateType: SalesInvoiceTemplateType =
        templateValue === "simple" ||
            templateValue === "export"
            ? templateValue
            : "uae_tax";

    const displaySettings: SalesInvoiceDisplaySettings = {
        show_company_trade_name:
            booleanValue(
                formData,
                "show_company_trade_name",
            ),

        show_company_arabic_name:
            booleanValue(
                formData,
                "show_company_arabic_name",
            ),

        show_company_trn:
            booleanValue(
                formData,
                "show_company_trn",
            ),

        show_company_license:
            booleanValue(
                formData,
                "show_company_license",
            ),

        show_company_contact:
            booleanValue(
                formData,
                "show_company_contact",
            ),

        show_company_address:
            booleanValue(
                formData,
                "show_company_address",
            ),

        show_customer_name:
            booleanValue(
                formData,
                "show_customer_name",
            ),

        show_customer_mark:
            booleanValue(
                formData,
                "show_customer_mark",
            ),

        show_customer_trn:
            booleanValue(
                formData,
                "show_customer_trn",
            ),

        show_customer_contact:
            booleanValue(
                formData,
                "show_customer_contact",
            ),

        show_billing_address:
            booleanValue(
                formData,
                "show_billing_address",
            ),

        show_shipping_address:
            booleanValue(
                formData,
                "show_shipping_address",
            ),

        show_customer_reference:
            booleanValue(
                formData,
                "show_customer_reference",
            ),

        show_sku:
            booleanValue(
                formData,
                "show_sku",
            ),

        show_unit:
            booleanValue(
                formData,
                "show_unit",
            ),

        show_discount:
            booleanValue(
                formData,
                "show_discount",
            ),

        show_vat:
            booleanValue(
                formData,
                "show_vat",
            ),

        show_payment_status:
            booleanValue(
                formData,
                "show_payment_status",
            ),

        show_payment_terms:
            booleanValue(
                formData,
                "show_payment_terms",
            ),

        show_delivery_terms:
            booleanValue(
                formData,
                "show_delivery_terms",
            ),

        show_bank_details:
            booleanValue(
                formData,
                "show_bank_details",
            ),

        show_customer_notes:
            booleanValue(
                formData,
                "show_customer_notes",
            ),

        show_footer:
            booleanValue(
                formData,
                "show_footer",
            ),
    };

    const invoiceDate =
        stringValue(
            formData,
            "invoice_date",
        );

    const supplyDate =
        stringValue(
            formData,
            "supply_date",
        );

    const customerDisplayName =
        stringValue(
            formData,
            "customer_display_name",
        );

    const customerMark =
        stringValue(
            formData,
            "customer_mark",
        );

    await updateSalesInvoicePresentation(
        invoiceId,
        {
            invoice_date:
                invoiceDate || undefined,

            supply_date:
                supplyDate || undefined,

            template_type:
                templateType,

            customer_display_name:
                customerDisplayName || null,

            customer_mark:
                customerMark || null,

            display_settings:
                displaySettings,
        },
    );

    revalidatePath(
        `/admin/sales/orders/${salesOrderId}/invoice`,
    );
}