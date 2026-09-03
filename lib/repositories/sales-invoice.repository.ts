import { createClient } from "@/lib/supabase/server";
import type { CompanyProfile } from "@/lib/repositories/company-profile.repository";
import type { SalesOrderDetails } from "@/lib/repositories/sales-order.repository";
import type { Json } from "@/lib/database.types";

export type SalesInvoiceTemplateType =
    | "uae_tax"
    | "simple"
    | "export";

export type SalesInvoiceStatus =
    | "issued"
    | "cancelled";

export type SalesInvoiceDisplaySettings =
    Record<string, boolean>;
export type SalesInvoiceSnapshot =
    Record<string, Json | undefined>;
export interface SalesInvoiceDocument {
    id: string;
    sales_order_id: string;
    invoice_number: string;
    invoice_date: string;
    supply_date: string;
    template_type: SalesInvoiceTemplateType;
    status: SalesInvoiceStatus;
    customer_display_name: string | null;
    customer_mark: string | null;
    seller_snapshot: SalesInvoiceSnapshot | null;
    buyer_snapshot: SalesInvoiceSnapshot | null;
    display_settings: SalesInvoiceDisplaySettings;
    created_at: string;
    updated_at: string;
}

export interface UpdateSalesInvoicePresentationInput {
    invoice_date?: string;
    supply_date?: string;
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
        supply_date: string;
        template_type: string;
        status: string;
        customer_display_name: string | null;
        customer_mark: string | null;
        seller_snapshot: unknown;
        buyer_snapshot: unknown;
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
        supply_date: row.supply_date,
        template_type:
            row.template_type as SalesInvoiceTemplateType,
        status:
            row.status as SalesInvoiceStatus,
        customer_display_name:
            row.customer_display_name,

        customer_mark:
            row.customer_mark,

        seller_snapshot:
            row.seller_snapshot &&
                typeof row.seller_snapshot === "object" &&
                !Array.isArray(row.seller_snapshot)
                ? (row.seller_snapshot as SalesInvoiceSnapshot)
                : null,

        buyer_snapshot:
            row.buyer_snapshot &&
                typeof row.buyer_snapshot === "object" &&
                !Array.isArray(row.buyer_snapshot)
                ? (row.buyer_snapshot as SalesInvoiceSnapshot)
                : null,

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
            supply_date,
            template_type,
            status,
                        customer_display_name,
            customer_mark,
            seller_snapshot,
            buyer_snapshot,
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
            supply_date,
            template_type,
            status,
                        customer_display_name,
            customer_mark,
            seller_snapshot,
            buyer_snapshot,
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
function buildSellerSnapshot(
    companyProfile: CompanyProfile,
): SalesInvoiceSnapshot {
    return {
        legal_name: companyProfile.legal_name,
        trade_name: companyProfile.trade_name,
        arabic_name: companyProfile.arabic_name,
        tax_registration_number:
            companyProfile.tax_registration_number,
        trade_license_number:
            companyProfile.trade_license_number,
        phone: companyProfile.phone,
        whatsapp: companyProfile.whatsapp,
        email: companyProfile.email,
        website: companyProfile.website,
        address_line_1: companyProfile.address_line_1,
        address_line_2: companyProfile.address_line_2,
        city: companyProfile.city,
        state: companyProfile.state,
        country: companyProfile.country,
        postal_code: companyProfile.postal_code,
        po_box: companyProfile.po_box,
        logo_path: companyProfile.logo_path,
        document_footer: companyProfile.document_footer,
        bank_name: companyProfile.bank_name,
        bank_account_name:
            companyProfile.bank_account_name,
        bank_account_number:
            companyProfile.bank_account_number,
        bank_iban: companyProfile.bank_iban,
        bank_swift_code:
            companyProfile.bank_swift_code,
    };
}

function buildBuyerSnapshot(
    salesOrder: SalesOrderDetails,
): SalesInvoiceSnapshot {
    return {
        customer_id: salesOrder.customer?.id ?? null,

        customer: salesOrder.customer
            ? {
                id: salesOrder.customer.id,
                customer_number:
                    salesOrder.customer.customer_number,
                display_name:
                    salesOrder.customer.display_name,
                company_name:
                    salesOrder.customer.company_name,
                email: salesOrder.customer.email,
                phone: salesOrder.customer.phone,
                currency_code:
                    salesOrder.customer.currency_code,
                tax_registration_number:
                    salesOrder.customer
                        .tax_registration_number,
            }
            : null,

        customer_contact:
            salesOrder.customer_contact
                ? {
                    id: salesOrder.customer_contact.id,
                    contact_name:
                        salesOrder.customer_contact
                            .contact_name,
                    job_title:
                        salesOrder.customer_contact
                            .job_title,
                    email:
                        salesOrder.customer_contact.email,
                    phone:
                        salesOrder.customer_contact.phone,
                    whatsapp:
                        salesOrder.customer_contact
                            .whatsapp,
                }
                : null,

        billing_address:
            salesOrder.billing_address
                ? {
                    id: salesOrder.billing_address.id,
                    address_type:
                        salesOrder.billing_address
                            .address_type,
                    address_name:
                        salesOrder.billing_address
                            .address_name,
                    contact_name:
                        salesOrder.billing_address
                            .contact_name,
                    phone:
                        salesOrder.billing_address.phone,
                    address_line_1:
                        salesOrder.billing_address
                            .address_line_1,
                    address_line_2:
                        salesOrder.billing_address
                            .address_line_2,
                    city:
                        salesOrder.billing_address.city,
                    state:
                        salesOrder.billing_address.state,
                    country:
                        salesOrder.billing_address
                            .country,
                    postal_code:
                        salesOrder.billing_address
                            .postal_code,
                }
                : null,

        shipping_address:
            salesOrder.shipping_address
                ? {
                    id: salesOrder.shipping_address.id,
                    address_type:
                        salesOrder.shipping_address
                            .address_type,
                    address_name:
                        salesOrder.shipping_address
                            .address_name,
                    contact_name:
                        salesOrder.shipping_address
                            .contact_name,
                    phone:
                        salesOrder.shipping_address.phone,
                    address_line_1:
                        salesOrder.shipping_address
                            .address_line_1,
                    address_line_2:
                        salesOrder.shipping_address
                            .address_line_2,
                    city:
                        salesOrder.shipping_address.city,
                    state:
                        salesOrder.shipping_address.state,
                    country:
                        salesOrder.shipping_address
                            .country,
                    postal_code:
                        salesOrder.shipping_address
                            .postal_code,
                }
                : null,
    };
}

export async function getOrCreateSalesInvoice(
    salesOrderId: string,
    source: {
        salesOrder: SalesOrderDetails;
        companyProfile: CompanyProfile;
    },
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
            supply_date: source.salesOrder.order_date,
            template_type: "uae_tax",
            status: "issued",
            seller_snapshot:
                buildSellerSnapshot(
                    source.companyProfile,
                ),
            buyer_snapshot:
                buildBuyerSnapshot(
                    source.salesOrder,
                ),
            display_settings: {
                show_company_address: true,
                show_company_trn: true,
                show_customer_name: true,
                show_customer_trn: true,
                show_billing_address: true,
                show_vat: true,
            },
        })
        .select(`
            id,
            sales_order_id,
            invoice_number,
            invoice_date,
            supply_date,
            template_type,
            status,
                        customer_display_name,
            customer_mark,
            seller_snapshot,
            buyer_snapshot,
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
        supply_date?: string;
        template_type?: SalesInvoiceTemplateType;
        customer_display_name?: string | null;
        customer_mark?: string | null;
        display_settings?: SalesInvoiceDisplaySettings;
    } = {};

    if (input.invoice_date !== undefined) {
        payload.invoice_date =
            input.invoice_date;
    }

    if (input.supply_date !== undefined) {
        payload.supply_date =
            input.supply_date;
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
            supply_date,
            template_type,
            status,
                        customer_display_name,
            customer_mark,
            seller_snapshot,
            buyer_snapshot,
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