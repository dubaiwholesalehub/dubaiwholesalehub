import { createClient } from "@/lib/supabase/server";

export type SalesInvoiceTemplateType =
    | "uae_tax"
    | "simple"
    | "export";

export type SalesInvoiceStatus =
    | "issued"
    | "cancelled";

export type SalesInvoiceDisplaySettings =
    Record<string, boolean>;

export interface SalesInvoiceDocument {
    id: string;
    sales_order_id: string;
    invoice_number: string;
    invoice_date: string;
    template_type: SalesInvoiceTemplateType;
    status: SalesInvoiceStatus;
    customer_display_name: string | null;
    customer_mark: string | null;
    display_settings: SalesInvoiceDisplaySettings;
    created_at: string;
    updated_at: string;
}

export interface UpdateSalesInvoicePresentationInput {
    invoice_date?: string;
    template_type?: SalesInvoiceTemplateType;
    customer_display_name?: string | null;
    customer_mark?: string | null;
    display_settings?: SalesInvoiceDisplaySettings;
}

/* =========================================================
 * Helpers
 * ========================================================= */

function mapSalesInvoiceDocument(
    row: {
        id: string;
        sales_order_id: string;
        invoice_number: string;
        invoice_date: string;
        template_type: string;
        status: string;
        customer_display_name: string | null;
        customer_mark: string | null;
        display_settings: unknown;
        created_at: string;
        updated_at: string;
    },
): SalesInvoiceDocument {
    const displaySettings =
        row.display_settings &&
            typeof row.display_settings === "object" &&
            !Array.isArray(row.display_settings)
            ? (row.display_settings as SalesInvoiceDisplaySettings)
            : {};

    return {
        id: row.id,
        sales_order_id: row.sales_order_id,
        invoice_number: row.invoice_number,
        invoice_date: row.invoice_date,
        template_type:
            row.template_type as SalesInvoiceTemplateType,
        status:
            row.status as SalesInvoiceStatus,
        customer_display_name:
            row.customer_display_name,

        customer_mark:
            row.customer_mark,
        display_settings: displaySettings,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

/* =========================================================
 * Get invoice by Sales Order
 * ========================================================= */

export async function getSalesInvoiceBySalesOrderId(
    salesOrderId: string,
): Promise<SalesInvoiceDocument | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("sales_invoice_documents")
        .select(`
            id,
            sales_order_id,
            invoice_number,
            invoice_date,
            template_type,
            status,
            customer_display_name,
            customer_mark,
            display_settings,
            created_at,
            updated_at
        `)
        .eq("sales_order_id", salesOrderId)
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to load sales invoice: ${error.message}`,
        );
    }

    if (!data) {
        return null;
    }

    return mapSalesInvoiceDocument(data);
}

/* =========================================================
 * Get invoice by ID
 * ========================================================= */

export async function getSalesInvoiceById(
    invoiceId: string,
): Promise<SalesInvoiceDocument | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("sales_invoice_documents")
        .select(`
            id,
            sales_order_id,
            invoice_number,
            invoice_date,
            template_type,
            status,
            customer_display_name,
            customer_mark,
            display_settings,
            created_at,
            updated_at
        `)
        .eq("id", invoiceId)
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to load sales invoice: ${error.message}`,
        );
    }

    if (!data) {
        return null;
    }

    return mapSalesInvoiceDocument(data);
}

/* =========================================================
 * Get or create invoice for Sales Order
 *
 * One Sales Order = one Sales Invoice document.
 *
 * Reopening or printing the invoice does NOT create another
 * invoice number.
 * ========================================================= */

export async function getOrCreateSalesInvoice(
    salesOrderId: string,
): Promise<SalesInvoiceDocument> {
    const existing =
        await getSalesInvoiceBySalesOrderId(
            salesOrderId,
        );

    if (existing) {
        return existing;
    }

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("sales_invoice_documents")
        .insert({
            sales_order_id: salesOrderId,
            invoice_number: "",
            template_type: "uae_tax",
            status: "issued",
            display_settings: {},
        })
        .select(`
            id,
            sales_order_id,
            invoice_number,
            invoice_date,
            template_type,
            status,
            customer_display_name,
            customer_mark,
            display_settings,
            created_at,
            updated_at
        `)
        .single();

    if (!error && data) {
        return mapSalesInvoiceDocument(data);
    }

    /*
     * A concurrent request may have created the invoice after
     * our initial lookup. Because sales_order_id is UNIQUE,
     * retry the lookup before surfacing the insert error.
     */
    const concurrentInvoice =
        await getSalesInvoiceBySalesOrderId(
            salesOrderId,
        );

    if (concurrentInvoice) {
        return concurrentInvoice;
    }

    throw new Error(
        `Unable to create sales invoice: ${error?.message ??
        "Unknown database error"
        }`,
    );
}

/* =========================================================
 * Update invoice presentation only
 *
 * Does NOT touch:
 * - Sales Order
 * - GL
 * - Accounts Receivable
 * - VAT accounting
 * - Inventory
 * - Delivery
 * - Payments
 * ========================================================= */

export async function updateSalesInvoicePresentation(
    invoiceId: string,
    input: UpdateSalesInvoicePresentationInput,
): Promise<SalesInvoiceDocument> {
    const supabase = await createClient();

    const payload: {
        invoice_date?: string;
        template_type?: SalesInvoiceTemplateType;
        customer_display_name?: string | null;
        customer_mark?: string | null;
        display_settings?: SalesInvoiceDisplaySettings;
    } = {};

    if (input.invoice_date !== undefined) {
        payload.invoice_date =
            input.invoice_date;
    }

    if (input.template_type !== undefined) {
        payload.template_type =
            input.template_type;
    }

    if (input.customer_display_name !== undefined) {
        payload.customer_display_name =
            input.customer_display_name;
    }

    if (input.customer_mark !== undefined) {
        payload.customer_mark =
            input.customer_mark;
    }

    if (input.display_settings !== undefined) {
        payload.display_settings =
            input.display_settings;
    }

    const { data, error } = await supabase
        .from("sales_invoice_documents")
        .update(payload)
        .eq("id", invoiceId)
        .select(`
            id,
            sales_order_id,
            invoice_number,
            invoice_date,
            template_type,
            status,
            customer_display_name,
            customer_mark,
            display_settings,
            created_at,
            updated_at
        `)
        .single();

    if (error) {
        throw new Error(
            `Unable to update sales invoice: ${error.message}`,
        );
    }

    return mapSalesInvoiceDocument(data);
}