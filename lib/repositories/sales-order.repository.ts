import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import {
    getSalesQuotationById,
} from "@/lib/repositories/sales-quotation.repository";
import {
    applyCustomerAdvanceToSalesOrder,
} from "@/lib/repositories/customer-receipt.repository";

/* =========================================================
 * Database Types
 * ========================================================= */

type SalesOrderRow =
    Database["public"]["Tables"]["sales_orders"]["Row"];

type SalesOrderInsert =
    Database["public"]["Tables"]["sales_orders"]["Insert"];

type SalesOrderUpdate =
    Database["public"]["Tables"]["sales_orders"]["Update"];

type SalesOrderItemRow =
    Database["public"]["Tables"]["sales_order_items"]["Row"];

type SalesOrderItemInsert =
    Database["public"]["Tables"]["sales_order_items"]["Insert"];

type SalesOrderItemUpdate =
    Database["public"]["Tables"]["sales_order_items"]["Update"];

/* =========================================================
 * Strict Business Types
 * ========================================================= */

export type SalesOrderStatus =
    | "draft"
    | "confirmed"
    | "processing"
    | "partially_fulfilled"
    | "fulfilled"
    | "completed"
    | "cancelled"
    | "closed";

export type SalesOrderFulfilmentStatus =
    | "unplanned"
    | "awaiting_stock"
    | "awaiting_procurement"
    | "partially_allocated"
    | "allocated"
    | "partially_fulfilled"
    | "fulfilled"
    | "not_required";

export type SalesOrderItemFulfilmentStatus =
    | SalesOrderFulfilmentStatus
    | "cancelled";

export type SalesOrderPaymentStatus =
    | "unpaid"
    | "partially_paid"
    | "paid"
    | "overpaid"
    | "refunded";

export type SalesOrderSource =
    | "internal"
    | "hmshoponline"
    | "dubaiwholesalehub"
    | "import";

export type ProductFulfilmentMethod =
    | "stock"
    | "local_purchase"
    | "import_on_demand"
    | "dropship"
    | "service";

/* =========================================================
 * Relation Models
 * ========================================================= */

export interface SalesOrderCustomer {
    id: string;
    customer_number: string;
    display_name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    currency_code: string;
}

export interface SalesOrderCustomerContact {
    id: string;
    customer_id?: string;
    contact_name: string;
    job_title: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
}

export interface SalesOrderAddress {
    id: string;
    customer_id?: string;
    address_type: string;
    address_name: string | null;
    contact_name: string | null;
    phone: string | null;
    address_line_1: string;
    address_line_2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
}

export interface SalesOrderWarehouse {
    id: string;
    code: string;
    name: string;
}

export interface SalesOrderQuotationReference {
    id: string;
    quotation_number: string;
    quotation_date: string;
    status: string;
    grand_total: number;
}

export interface SalesOrderProduct {
    id: string;
    name: string;
    sku: string | null;
}

export interface SalesOrderUnit {
    id: string;
    name: string;
    short_name: string;
}

export interface SalesOrderMarginAnalysisRow {
    salesOrderItemId: string;
    lineNumber: number;

    productId:
    | string
    | null;

    itemName: string;

    sku:
    | string
    | null;

    fulfilmentMethod: string;

    warehouseId:
    | string
    | null;

    quantity: number;

    unitPrice: number;

    netSalesValue: number;

    effectiveUnitSellingPrice:
    number;

    currentUnitCost:
    | number
    | null;

    estimatedCogs:
    | number
    | null;

    estimatedGrossProfit:
    | number
    | null;

    estimatedMarginPercentage:
    | number
    | null;

    marginStatus:
    | "healthy"
    | "warning"
    | "blocked"
    | "cost_missing"
    | "cost_not_available";
}


export interface SalesMarginApproval {
    id: string;

    salesOrderId: string;

    status:
    | "pending"
    | "approved"
    | "rejected"
    | "cancelled";

    requestedReason: string;

    requestedAt: string;

    approvedAt:
    | string
    | null;

    rejectedAt:
    | string
    | null;

    decisionNotes:
    | string
    | null;

    lowestMarginPercentage:
    | number
    | null;

    policyMinimumPercentage:
    | number
    | null;

    policyWarningPercentage:
    | number
    | null;
}

/* =========================================================
 * Main Models
 * ========================================================= */

export interface SalesOrder {
    id: string;

    order_number: string;
    quotation_id: string | null;

    customer_id: string;
    customer_contact_id: string | null;

    billing_address_id: string | null;
    shipping_address_id: string | null;

    warehouse_id: string | null;

    order_date: string;

    requested_delivery_date: string | null;
    expected_delivery_date: string | null;

    status: SalesOrderStatus;

    fulfilment_status:
    SalesOrderFulfilmentStatus;

    payment_status:
    SalesOrderPaymentStatus;

    source: SalesOrderSource;

    external_reference: string | null;
    customer_reference: string | null;

    currency_code: string;
    exchange_rate: number;

    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    shipping_amount: number;
    grand_total: number;

    paid_amount: number;
    balance_due: number;

    payment_terms_days: number;

    delivery_terms: string | null;
    payment_terms: string | null;

    customer_notes: string | null;
    internal_notes: string | null;

    confirmed_at: string | null;
    processing_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    closed_at: string | null;

    created_by: string | null;
    updated_by: string | null;

    created_at: string;
    updated_at: string;
}

export interface SalesOrderItem {
    id: string;

    sales_order_id: string;
    quotation_item_id: string | null;

    line_number: number;

    product_id: string | null;
    unit_id: string | null;
    warehouse_id: string | null;

    sku: string | null;

    item_name: string;
    description: string | null;

    quantity: number;
    unit_price: number;

    discount_percentage: number;
    discount_amount: number;

    tax_percentage: number;
    tax_amount: number;

    line_subtotal: number;
    line_total: number;

    fulfilment_method:
    ProductFulfilmentMethod;

    procurement_lead_time_days: number;
    allow_backorder: boolean;
    procurement_notes: string | null;

    fulfilment_status:
    SalesOrderItemFulfilmentStatus;

    quantity_reserved: number;
    quantity_allocated: number;
    quantity_fulfilled: number;
    quantity_cancelled: number;

    shortage_quantity: number;

    procurement_required: boolean;

    requested_delivery_date: string | null;
    expected_delivery_date: string | null;

    line_notes: string | null;

    created_at: string;
    updated_at: string;

    product: SalesOrderProduct | null;
    unit: SalesOrderUnit | null;
    warehouse: SalesOrderWarehouse | null;
}

export interface SalesOrderDetails
    extends SalesOrder {
    customer: SalesOrderCustomer | null;

    customer_contact:
    | SalesOrderCustomerContact
    | null;

    billing_address:
    | SalesOrderAddress
    | null;

    shipping_address:
    | SalesOrderAddress
    | null;

    warehouse:
    | SalesOrderWarehouse
    | null;

    quotation:
    | SalesOrderQuotationReference
    | null;

    items: SalesOrderItem[];
}

/* =========================================================
 * Input Models
 * ========================================================= */

export interface CreateSalesOrderInput {
    quotation_id?: string | null;

    customer_id: string;

    customer_contact_id?: string | null;

    billing_address_id?: string | null;
    shipping_address_id?: string | null;

    warehouse_id?: string | null;

    order_date?: string;

    requested_delivery_date?: string | null;
    expected_delivery_date?: string | null;

    source?: SalesOrderSource;

    external_reference?: string | null;
    customer_reference?: string | null;

    currency_code?: string;
    exchange_rate?: number;

    shipping_amount?: number;

    payment_terms_days?: number;

    delivery_terms?: string | null;
    payment_terms?: string | null;

    customer_notes?: string | null;
    internal_notes?: string | null;
}

export type UpdateSalesOrderInput =
    Partial<CreateSalesOrderInput>;

export interface CreateSalesOrderItemInput {
    sales_order_id: string;

    quotation_item_id?: string | null;

    product_id?: string | null;
    unit_id?: string | null;
    warehouse_id?: string | null;

    sku?: string | null;

    item_name: string;
    description?: string | null;

    quantity: number;
    unit_price: number;

    discount_percentage?: number;
    tax_percentage?: number;

    fulfilment_method:
    ProductFulfilmentMethod;

    procurement_lead_time_days?: number;

    allow_backorder?: boolean;

    procurement_notes?: string | null;

    requested_delivery_date?: string | null;
    expected_delivery_date?: string | null;

    line_notes?: string | null;
}

export type UpdateSalesOrderItemInput =
    Partial<
        Omit<
            CreateSalesOrderItemInput,
            "sales_order_id"
        >
    >;

/* =========================================================
 * List and Summary Models
 * ========================================================= */

export interface GetSalesOrdersInput {
    search?: string;

    status?: SalesOrderStatus | "all";

    fulfilmentStatus?:
    | SalesOrderFulfilmentStatus
    | "all";

    paymentStatus?:
    | SalesOrderPaymentStatus
    | "all";

    source?: SalesOrderSource | "all";

    customerId?: string;

    dateFrom?: string;
    dateTo?: string;

    page?: number;
    pageSize?: number;
}

export interface SalesOrderListRow
    extends SalesOrder {
    customer: SalesOrderCustomer | null;
    warehouse: SalesOrderWarehouse | null;

    quotation:
    | SalesOrderQuotationReference
    | null;
}

export interface GetSalesOrdersResult {
    data: SalesOrderListRow[];

    count: number;

    page: number;
    pageSize: number;

    totalPages: number;
}

export interface SalesOrderSummary {
    total: number;

    draft: number;
    confirmed: number;
    processing: number;

    partiallyFulfilled: number;
    fulfilled: number;
    completed: number;

    cancelled: number;
    closed: number;

    awaitingProcurement: number;
    awaitingStock: number;

    unpaid: number;
    partiallyPaid: number;
    paid: number;

    totalOrderValue: number;
    totalOutstanding: number;
}

/* =========================================================
 * Form Options
 * ========================================================= */

export interface SalesOrderFormContact {
    id: string;
    customer_id: string;

    contact_name: string;
    job_title: string | null;

    email: string | null;
    phone: string | null;

    is_primary: boolean;
    is_active: boolean;
}

export interface SalesOrderFormAddress {
    id: string;
    customer_id: string;

    address_type: string;
    address_name: string | null;

    address_line_1: string;
    address_line_2: string | null;

    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;

    is_default: boolean;
    is_active: boolean;
}

export interface SalesOrderFormOptions {
    customers: SalesOrderCustomer[];

    contacts: SalesOrderFormContact[];

    addresses: SalesOrderFormAddress[];

    warehouses: SalesOrderWarehouse[];
}

/* =========================================================
 * Database Relation Shapes
 * ========================================================= */

interface SalesOrderListDatabaseRow
    extends SalesOrderRow {
    customer:
    | SalesOrderCustomer
    | SalesOrderCustomer[]
    | null;

    warehouse:
    | SalesOrderWarehouse
    | SalesOrderWarehouse[]
    | null;

    quotation:
    | SalesOrderQuotationReference
    | SalesOrderQuotationReference[]
    | null;
}

interface SalesOrderItemDatabaseRow
    extends SalesOrderItemRow {
    product:
    | SalesOrderProduct
    | SalesOrderProduct[]
    | null;

    unit:
    | SalesOrderUnit
    | SalesOrderUnit[]
    | null;

    warehouse:
    | SalesOrderWarehouse
    | SalesOrderWarehouse[]
    | null;
}

interface SalesOrderDetailsDatabaseRow
    extends SalesOrderRow {
    customer:
    | SalesOrderCustomer
    | SalesOrderCustomer[]
    | null;

    customer_contact:
    | SalesOrderCustomerContact
    | SalesOrderCustomerContact[]
    | null;

    billing_address:
    | SalesOrderAddress
    | SalesOrderAddress[]
    | null;

    shipping_address:
    | SalesOrderAddress
    | SalesOrderAddress[]
    | null;

    warehouse:
    | SalesOrderWarehouse
    | SalesOrderWarehouse[]
    | null;

    quotation:
    | SalesOrderQuotationReference
    | SalesOrderQuotationReference[]
    | null;

    sales_order_items:
    | SalesOrderItemDatabaseRow[]
    | null;
}

/* =========================================================
 * General Helpers
 * ========================================================= */

function requireId(
    value: string,
    fieldName: string,
): string {
    const normalized = value.trim();

    if (!normalized) {
        throw new Error(
            `${fieldName} is required.`,
        );
    }

    return normalized;
}

function normalizeNullableText(
    value: string | null | undefined,
): string | null {
    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    const normalized = value.trim();

    return normalized || null;
}

function normalizePage(
    value: number | undefined,
): number {
    if (
        value === undefined ||
        !Number.isFinite(value)
    ) {
        return 1;
    }

    return Math.max(
        Math.floor(value),
        1,
    );
}

function normalizePageSize(
    value: number | undefined,
): number {
    if (
        value === undefined ||
        !Number.isFinite(value)
    ) {
        return 25;
    }

    return Math.min(
        Math.max(
            Math.floor(value),
            1,
        ),
        100,
    );
}

function sanitizeSearchTerm(
    value: string,
): string {
    return value
        .trim()
        .replaceAll(",", " ")
        .replaceAll("(", " ")
        .replaceAll(")", " ")
        .replaceAll('"', " ")
        .replace(/\s+/g, " ");
}

function roundCurrency(
    value: number,
): number {
    return (
        Math.round(
            (value + Number.EPSILON) *
            100,
        ) / 100
    );
}

function getSingleRelation<T>(
    relation: T | T[] | null,
): T | null {
    if (Array.isArray(relation)) {
        return relation[0] ?? null;
    }

    return relation;
}

/* =========================================================
 * Mapping
 * ========================================================= */

function mapSalesOrderRow(
    row: SalesOrderRow,
): SalesOrder {
    return {
        id: row.id,

        order_number:
            row.order_number,

        quotation_id:
            row.quotation_id,

        customer_id:
            row.customer_id,

        customer_contact_id:
            row.customer_contact_id,

        billing_address_id:
            row.billing_address_id,

        shipping_address_id:
            row.shipping_address_id,

        warehouse_id:
            row.warehouse_id,

        order_date:
            row.order_date,

        requested_delivery_date:
            row.requested_delivery_date,

        expected_delivery_date:
            row.expected_delivery_date,

        status:
            row.status as SalesOrderStatus,

        fulfilment_status:
            row.fulfilment_status as
            SalesOrderFulfilmentStatus,

        payment_status:
            row.payment_status as
            SalesOrderPaymentStatus,

        source:
            row.source as SalesOrderSource,

        external_reference:
            row.external_reference,

        customer_reference:
            row.customer_reference,

        currency_code:
            row.currency_code,

        exchange_rate:
            Number(row.exchange_rate),

        subtotal:
            Number(row.subtotal),

        discount_amount:
            Number(row.discount_amount),

        tax_amount:
            Number(row.tax_amount),

        shipping_amount:
            Number(row.shipping_amount),

        grand_total:
            Number(row.grand_total),

        paid_amount:
            Number(row.paid_amount),

        balance_due:
            Number(row.balance_due),

        payment_terms_days:
            Number(row.payment_terms_days),

        delivery_terms:
            row.delivery_terms,

        payment_terms:
            row.payment_terms,

        customer_notes:
            row.customer_notes,

        internal_notes:
            row.internal_notes,

        confirmed_at:
            row.confirmed_at,

        processing_at:
            row.processing_at,

        completed_at:
            row.completed_at,

        cancelled_at:
            row.cancelled_at,

        closed_at:
            row.closed_at,

        created_by:
            row.created_by,

        updated_by:
            row.updated_by,

        created_at:
            row.created_at,

        updated_at:
            row.updated_at,
    };
}

function mapSalesOrderItemRow(
    row: SalesOrderItemDatabaseRow,
): SalesOrderItem {
    return {
        id: row.id,

        sales_order_id:
            row.sales_order_id,

        quotation_item_id:
            row.quotation_item_id,

        line_number:
            row.line_number,

        product_id:
            row.product_id,

        unit_id:
            row.unit_id,

        warehouse_id:
            row.warehouse_id,

        sku:
            row.sku,

        item_name:
            row.item_name,

        description:
            row.description,

        quantity:
            Number(row.quantity),

        unit_price:
            Number(row.unit_price),

        discount_percentage:
            Number(
                row.discount_percentage,
            ),

        discount_amount:
            Number(row.discount_amount),

        tax_percentage:
            Number(row.tax_percentage),

        tax_amount:
            Number(row.tax_amount),

        line_subtotal:
            Number(row.line_subtotal),

        line_total:
            Number(row.line_total),

        fulfilment_method:
            row.fulfilment_method as
            ProductFulfilmentMethod,

        procurement_lead_time_days:
            Number(
                row.procurement_lead_time_days,
            ),

        allow_backorder:
            row.allow_backorder,

        procurement_notes:
            row.procurement_notes,

        fulfilment_status:
            row.fulfilment_status as
            SalesOrderItemFulfilmentStatus,

        quantity_reserved:
            Number(row.quantity_reserved),

        quantity_allocated:
            Number(row.quantity_allocated),

        quantity_fulfilled:
            Number(row.quantity_fulfilled),

        quantity_cancelled:
            Number(row.quantity_cancelled),

        shortage_quantity:
            Number(row.shortage_quantity),

        procurement_required:
            row.procurement_required,

        requested_delivery_date:
            row.requested_delivery_date,

        expected_delivery_date:
            row.expected_delivery_date,

        line_notes:
            row.line_notes,

        created_at:
            row.created_at,

        updated_at:
            row.updated_at,

        product:
            getSingleRelation(
                row.product,
            ),

        unit:
            getSingleRelation(
                row.unit,
            ),

        warehouse:
            getSingleRelation(
                row.warehouse,
            ),
    };
}

/* =========================================================
 * List Operations
 * ========================================================= */

export async function getSalesOrderPage({
    search,
    status,
    fulfilmentStatus,
    paymentStatus,
    source,
    customerId,
    dateFrom,
    dateTo,
    page,
    pageSize,
}: GetSalesOrdersInput = {}): Promise<GetSalesOrdersResult> {
    const supabase = await createClient();

    const currentPage =
        normalizePage(page);

    const currentPageSize =
        normalizePageSize(pageSize);

    const rangeStart =
        (currentPage - 1) *
        currentPageSize;

    const rangeEnd =
        rangeStart +
        currentPageSize -
        1;

    const searchTerm =
        sanitizeSearchTerm(
            search ?? "",
        );

    let query = supabase
        .from("sales_orders")
        .select(
            `
        *,
        customer:customers (
          id,
          customer_number,
          display_name,
          company_name,
          email,
          phone,
          currency_code
        ),
        warehouse:warehouses (
          id,
          code,
          name
        ),
        quotation:sales_quotations (
          id,
          quotation_number,
          quotation_date,
          status,
          grand_total
        )
      `,
            {
                count: "exact",
            },
        );

    if (
        status &&
        status !== "all"
    ) {
        query = query.eq(
            "status",
            status,
        );
    }

    if (
        fulfilmentStatus &&
        fulfilmentStatus !== "all"
    ) {
        query = query.eq(
            "fulfilment_status",
            fulfilmentStatus,
        );
    }

    if (
        paymentStatus &&
        paymentStatus !== "all"
    ) {
        query = query.eq(
            "payment_status",
            paymentStatus,
        );
    }

    if (
        source &&
        source !== "all"
    ) {
        query = query.eq(
            "source",
            source,
        );
    }

    if (customerId?.trim()) {
        query = query.eq(
            "customer_id",
            customerId.trim(),
        );
    }

    if (dateFrom) {
        query = query.gte(
            "order_date",
            dateFrom,
        );
    }

    if (dateTo) {
        query = query.lte(
            "order_date",
            dateTo,
        );
    }

    if (searchTerm) {
        query = query.or(
            [
                `order_number.ilike.%${searchTerm}%`,
                `external_reference.ilike.%${searchTerm}%`,
                `customer_reference.ilike.%${searchTerm}%`,
            ].join(","),
        );
    }

    const {
        data,
        error,
        count,
    } = await query
        .order("order_date", {
            ascending: false,
        })
        .order("created_at", {
            ascending: false,
        })
        .range(
            rangeStart,
            rangeEnd,
        );

    if (error) {
        throw new Error(
            `Unable to load sales orders: ${error.message}`,
        );
    }

    const rows =
        (data ?? []) as unknown as
        SalesOrderListDatabaseRow[];

    const totalCount =
        count ?? 0;

    return {
        data: rows.map((row) => ({
            ...mapSalesOrderRow(row),

            customer:
                getSingleRelation(
                    row.customer,
                ),

            warehouse:
                getSingleRelation(
                    row.warehouse,
                ),

            quotation:
                getSingleRelation(
                    row.quotation,
                ),
        })),

        count:
            totalCount,

        page:
            currentPage,

        pageSize:
            currentPageSize,

        totalPages:
            Math.max(
                Math.ceil(
                    totalCount /
                    currentPageSize,
                ),
                1,
            ),
    };
}

/* =========================================================
 * Details
 * ========================================================= */

export async function getSalesOrderById(
    salesOrderId: string,
): Promise<SalesOrderDetails | null> {
    const id = requireId(
        salesOrderId,
        "Sales order ID",
    );

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("sales_orders")
        .select(`
      *,
      customer:customers (
        id,
        customer_number,
        display_name,
        company_name,
        email,
        phone,
        currency_code
      ),
      customer_contact:customer_contacts (
        id,
        customer_id,
        contact_name,
        job_title,
        email,
        phone,
        whatsapp
      ),
      billing_address:customer_addresses!sales_orders_billing_address_id_fkey (
        id,
        customer_id,
        address_type,
        address_name,
        contact_name,
        phone,
        address_line_1,
        address_line_2,
        city,
        state,
        country,
        postal_code
      ),
      shipping_address:customer_addresses!sales_orders_shipping_address_id_fkey (
        id,
        customer_id,
        address_type,
        address_name,
        contact_name,
        phone,
        address_line_1,
        address_line_2,
        city,
        state,
        country,
        postal_code
      ),
      warehouse:warehouses (
        id,
        code,
        name
      ),
      quotation:sales_quotations (
        id,
        quotation_number,
        quotation_date,
        status,
        grand_total
      ),
      sales_order_items (
        *,
        product:products (
          id,
          name,
          sku
        ),
        unit:units (
          id,
          name,
          short_name
        ),
        warehouse:warehouses (
          id,
          code,
          name
        )
      )
    `)
        .eq("id", id)
        .order("line_number", {
            referencedTable:
                "sales_order_items",
            ascending: true,
        })
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to load sales order: ${error.message}`,
        );
    }

    if (!data) {
        return null;
    }

    const row =
        data as unknown as
        SalesOrderDetailsDatabaseRow;

    return {
        ...mapSalesOrderRow(row),

        customer:
            getSingleRelation(
                row.customer,
            ),

        customer_contact:
            getSingleRelation(
                row.customer_contact,
            ),

        billing_address:
            getSingleRelation(
                row.billing_address,
            ),

        shipping_address:
            getSingleRelation(
                row.shipping_address,
            ),

        warehouse:
            getSingleRelation(
                row.warehouse,
            ),

        quotation:
            getSingleRelation(
                row.quotation,
            ),

        items:
            (
                row.sales_order_items ?? []
            ).map(
                mapSalesOrderItemRow,
            ),
    };
}

/* =========================================================
 * Summary
 * ========================================================= */

export async function getSalesOrderSummary(): Promise<SalesOrderSummary> {
    const supabase = await createClient();

    const [
        totalResult,
        draftResult,
        confirmedResult,
        processingResult,
        partiallyFulfilledResult,
        fulfilledResult,
        completedResult,
        cancelledResult,
        closedResult,
        awaitingProcurementResult,
        awaitingStockResult,
        unpaidResult,
        partiallyPaidResult,
        paidResult,
        valueResult,
    ] = await Promise.all([
        countSalesOrders(),

        countSalesOrdersByField(
            "status",
            "draft",
        ),

        countSalesOrdersByField(
            "status",
            "confirmed",
        ),

        countSalesOrdersByField(
            "status",
            "processing",
        ),

        countSalesOrdersByField(
            "status",
            "partially_fulfilled",
        ),

        countSalesOrdersByField(
            "status",
            "fulfilled",
        ),

        countSalesOrdersByField(
            "status",
            "completed",
        ),

        countSalesOrdersByField(
            "status",
            "cancelled",
        ),

        countSalesOrdersByField(
            "status",
            "closed",
        ),

        countSalesOrdersByField(
            "fulfilment_status",
            "awaiting_procurement",
        ),

        countSalesOrdersByField(
            "fulfilment_status",
            "awaiting_stock",
        ),

        countSalesOrdersByField(
            "payment_status",
            "unpaid",
        ),

        countSalesOrdersByField(
            "payment_status",
            "partially_paid",
        ),

        countSalesOrdersByField(
            "payment_status",
            "paid",
        ),

        supabase
            .from("sales_orders")
            .select(`
        grand_total,
        balance_due
      `)
            .not(
                "status",
                "in",
                '("cancelled","closed")',
            ),
    ]);

    const firstError =
        totalResult.error ??
        draftResult.error ??
        confirmedResult.error ??
        processingResult.error ??
        partiallyFulfilledResult.error ??
        fulfilledResult.error ??
        completedResult.error ??
        cancelledResult.error ??
        closedResult.error ??
        awaitingProcurementResult.error ??
        awaitingStockResult.error ??
        unpaidResult.error ??
        partiallyPaidResult.error ??
        paidResult.error ??
        valueResult.error;

    if (firstError) {
        throw new Error(
            `Unable to load sales order summary: ${firstError.message}`,
        );
    }

    const totalOrderValue =
        (valueResult.data ?? []).reduce(
            (total, order) =>
                total +
                Number(
                    order.grand_total,
                ),
            0,
        );

    const totalOutstanding =
        (valueResult.data ?? []).reduce(
            (total, order) =>
                total +
                Number(
                    order.balance_due,
                ),
            0,
        );

    return {
        total:
            totalResult.count ?? 0,

        draft:
            draftResult.count ?? 0,

        confirmed:
            confirmedResult.count ?? 0,

        processing:
            processingResult.count ?? 0,

        partiallyFulfilled:
            partiallyFulfilledResult.count ??
            0,

        fulfilled:
            fulfilledResult.count ?? 0,

        completed:
            completedResult.count ?? 0,

        cancelled:
            cancelledResult.count ?? 0,

        closed:
            closedResult.count ?? 0,

        awaitingProcurement:
            awaitingProcurementResult.count ??
            0,

        awaitingStock:
            awaitingStockResult.count ?? 0,

        unpaid:
            unpaidResult.count ?? 0,

        partiallyPaid:
            partiallyPaidResult.count ?? 0,

        paid:
            paidResult.count ?? 0,

        totalOrderValue:
            roundCurrency(
                totalOrderValue,
            ),

        totalOutstanding:
            roundCurrency(
                totalOutstanding,
            ),
    };
}

async function countSalesOrders() {
    const supabase = await createClient();

    return supabase
        .from("sales_orders")
        .select("id", {
            count: "exact",
            head: true,
        });
}

async function countSalesOrdersByField(
    field:
        | "status"
        | "fulfilment_status"
        | "payment_status",
    value: string,
) {
    const supabase = await createClient();

    return supabase
        .from("sales_orders")
        .select("id", {
            count: "exact",
            head: true,
        })
        .eq(field, value);
}

/* =========================================================
 * Form Options
 * ========================================================= */

export async function getSalesOrderFormOptions(): Promise<
    SalesOrderFormOptions
> {
    const supabase = await createClient();

    const [
        customersResult,
        contactsResult,
        addressesResult,
        warehousesResult,
    ] = await Promise.all([
        supabase
            .from("customers")
            .select(`
        id,
        customer_number,
        display_name,
        company_name,
        email,
        phone,
        currency_code
      `)
            .eq("status", "active")
            .order("display_name", {
                ascending: true,
            }),

        supabase
            .from("customer_contacts")
            .select(`
        id,
        customer_id,
        contact_name,
        job_title,
        email,
        phone,
        is_primary,
        is_active
      `)
            .eq("is_active", true)
            .order("is_primary", {
                ascending: false,
            })
            .order("contact_name", {
                ascending: true,
            }),

        supabase
            .from("customer_addresses")
            .select(`
        id,
        customer_id,
        address_type,
        address_name,
        address_line_1,
        address_line_2,
        city,
        state,
        country,
        postal_code,
        is_default,
        is_active
      `)
            .eq("is_active", true)
            .order("is_default", {
                ascending: false,
            })
            .order("created_at", {
                ascending: true,
            }),

        supabase
            .from("warehouses")
            .select(`
        id,
        code,
        name
      `)
            .eq("is_active", true)
            .order("name", {
                ascending: true,
            }),
    ]);

    const firstError =
        customersResult.error ??
        contactsResult.error ??
        addressesResult.error ??
        warehousesResult.error;

    if (firstError) {
        throw new Error(
            `Unable to load sales order form options: ${firstError.message}`,
        );
    }

    return {
        customers:
            customersResult.data ?? [],

        contacts:
            contactsResult.data ?? [],

        addresses:
            addressesResult.data ?? [],

        warehouses:
            warehousesResult.data ?? [],
    };
}

/* =========================================================
 * Draft Item Input
 * ========================================================= */

export interface BulkSalesOrderItemInput {
    quotation_item_id?: string | null;

    product_id?: string | null;
    unit_id?: string | null;
    warehouse_id?: string | null;

    sku?: string | null;

    item_name: string;
    description?: string | null;

    quantity: number;
    unit_price: number;

    discount_percentage?: number;
    tax_percentage?: number;

    fulfilment_method:
    ProductFulfilmentMethod;

    procurement_lead_time_days?: number;

    allow_backorder?: boolean;

    procurement_notes?: string | null;

    requested_delivery_date?: string | null;
    expected_delivery_date?: string | null;

    /*
     * Optional cost used only for pre-sale
     * margin analysis / approval.
     *
     * It does not replace actual inventory COGS.
     */
    margin_cost_override?: number | null;

    margin_cost_override_reason?: string | null;

    line_notes?: string | null;
}

/* =========================================================
 * Calculation Models
 * ========================================================= */

interface CalculatedSalesOrderItem {
    quantity: number;
    unitPrice: number;

    discountPercentage: number;
    discountAmount: number;

    taxPercentage: number;
    taxAmount: number;

    lineSubtotal: number;
    lineTotal: number;
}

/* =========================================================
 * Additional Helpers
 * ========================================================= */

function roundQuantity(
    value: number,
): number {
    return (
        Math.round(
            (value + Number.EPSILON) *
            10000,
        ) / 10000
    );
}

function getToday(): string {
    return new Date()
        .toISOString()
        .slice(0, 10);
}

function validateCurrencyCode(
    value: string,
): string {
    const normalized =
        value.trim().toUpperCase();

    if (normalized.length !== 3) {
        throw new Error(
            "Currency code must contain exactly 3 characters.",
        );
    }

    return normalized;
}

function validateSalesOrderHeaderInput(
    input: {
        customer_id: string;

        order_date?: string;

        requested_delivery_date?:
        | string
        | null;

        expected_delivery_date?:
        | string
        | null;

        currency_code?: string;

        exchange_rate?: number;

        shipping_amount?: number;

        payment_terms_days?: number;
    },
): void {
    requireId(
        input.customer_id,
        "Customer ID",
    );

    if (input.currency_code) {
        validateCurrencyCode(
            input.currency_code,
        );
    }

    if (
        input.exchange_rate !== undefined &&
        (
            !Number.isFinite(
                input.exchange_rate,
            ) ||
            input.exchange_rate <= 0
        )
    ) {
        throw new Error(
            "Exchange rate must be greater than zero.",
        );
    }

    if (
        input.shipping_amount !== undefined &&
        (
            !Number.isFinite(
                input.shipping_amount,
            ) ||
            input.shipping_amount < 0
        )
    ) {
        throw new Error(
            "Shipping amount cannot be negative.",
        );
    }

    if (
        input.payment_terms_days !==
        undefined &&
        (
            !Number.isInteger(
                input.payment_terms_days,
            ) ||
            input.payment_terms_days < 0
        )
    ) {
        throw new Error(
            "Payment terms must be a non-negative whole number.",
        );
    }

    const orderDate =
        input.order_date ?? getToday();

    if (
        input.requested_delivery_date &&
        input.requested_delivery_date <
        orderDate
    ) {
        throw new Error(
            "Requested delivery date cannot be earlier than the order date.",
        );
    }

    if (
        input.expected_delivery_date &&
        input.expected_delivery_date <
        orderDate
    ) {
        throw new Error(
            "Expected delivery date cannot be earlier than the order date.",
        );
    }
}

function validateSalesOrderItemInput(
    input: {
        item_name: string;

        quantity: number;
        unit_price: number;

        discount_percentage?: number;

        tax_percentage?: number;

        fulfilment_method:
        ProductFulfilmentMethod;

        procurement_lead_time_days?:
        number;
    },
): void {
    if (!input.item_name.trim()) {
        throw new Error(
            "Sales order item name is required.",
        );
    }

    if (
        !Number.isFinite(input.quantity) ||
        input.quantity <= 0
    ) {
        throw new Error(
            "Sales order quantity must be greater than zero.",
        );
    }

    if (
        !Number.isFinite(
            input.unit_price,
        ) ||
        input.unit_price < 0
    ) {
        throw new Error(
            "Sales order unit price cannot be negative.",
        );
    }

    const discountPercentage =
        input.discount_percentage ?? 0;

    if (
        !Number.isFinite(
            discountPercentage,
        ) ||
        discountPercentage < 0 ||
        discountPercentage > 100
    ) {
        throw new Error(
            "Discount percentage must be between 0 and 100.",
        );
    }

    const taxPercentage =
        input.tax_percentage ?? 0;

    if (
        !Number.isFinite(
            taxPercentage,
        ) ||
        taxPercentage < 0 ||
        taxPercentage > 100
    ) {
        throw new Error(
            "Tax percentage must be between 0 and 100.",
        );
    }

    const fulfilmentMethods:
        ProductFulfilmentMethod[] = [
            "stock",
            "local_purchase",
            "import_on_demand",
            "dropship",
            "service",
        ];

    if (
        !fulfilmentMethods.includes(
            input.fulfilment_method,
        )
    ) {
        throw new Error(
            "Invalid fulfilment method.",
        );
    }

    const leadTime =
        input.procurement_lead_time_days ??
        0;

    if (
        !Number.isInteger(leadTime) ||
        leadTime < 0
    ) {
        throw new Error(
            "Procurement lead time must be a non-negative whole number.",
        );
    }
}

function calculateSalesOrderItem(
    input: {
        quantity: number;
        unit_price: number;

        discount_percentage?: number;

        tax_percentage?: number;
    },
): CalculatedSalesOrderItem {
    const quantity =
        roundQuantity(input.quantity);

    const unitPrice =
        roundQuantity(input.unit_price);

    const discountPercentage =
        roundQuantity(
            input.discount_percentage ?? 0,
        );

    const taxPercentage =
        roundQuantity(
            input.tax_percentage ?? 0,
        );

    const grossAmount =
        roundCurrency(
            quantity * unitPrice,
        );

    const discountAmount =
        roundCurrency(
            grossAmount *
            (discountPercentage / 100),
        );

    const lineSubtotal =
        roundCurrency(
            grossAmount - discountAmount,
        );

    const taxAmount =
        roundCurrency(
            lineSubtotal *
            (taxPercentage / 100),
        );

    const lineTotal =
        roundCurrency(
            lineSubtotal + taxAmount,
        );

    return {
        quantity,
        unitPrice,

        discountPercentage,
        discountAmount,

        taxPercentage,
        taxAmount,

        lineSubtotal,
        lineTotal,
    };
}

function getInitialItemFulfilmentState(
    method: ProductFulfilmentMethod,
): {
    fulfilmentStatus:
    SalesOrderItemFulfilmentStatus;

    procurementRequired: boolean;
} {
    switch (method) {
        case "local_purchase":
        case "import_on_demand":
        case "dropship":
            return {
                fulfilmentStatus:
                    "unplanned",

                procurementRequired: true,
            };

        case "service":
            return {
                fulfilmentStatus:
                    "not_required",

                procurementRequired: false,
            };

        case "stock":
        default:
            return {
                fulfilmentStatus:
                    "unplanned",

                procurementRequired: false,
            };
    }
}

async function requireDraftSalesOrder(
    salesOrderId: string,
): Promise<SalesOrderDetails> {
    const order =
        await getSalesOrderById(
            salesOrderId,
        );

    if (!order) {
        throw new Error(
            "Sales order was not found.",
        );
    }

    if (order.status !== "draft") {
        throw new Error(
            "Only draft sales orders can be edited.",
        );
    }

    return order;
}

/* =========================================================
 * Create Sales Order
 * ========================================================= */

export async function createSalesOrder(
    input: CreateSalesOrderInput,
): Promise<SalesOrder> {
    validateSalesOrderHeaderInput({
        customer_id:
            input.customer_id,

        order_date:
            input.order_date,

        requested_delivery_date:
            input.requested_delivery_date,

        expected_delivery_date:
            input.expected_delivery_date,

        currency_code:
            input.currency_code,

        exchange_rate:
            input.exchange_rate,

        shipping_amount:
            input.shipping_amount,

        payment_terms_days:
            input.payment_terms_days,
    });

    const supabase = await createClient();

    const payload: SalesOrderInsert = {
        order_number: "",

        quotation_id:
            input.quotation_id ?? null,

        customer_id:
            requireId(
                input.customer_id,
                "Customer ID",
            ),

        customer_contact_id:
            input.customer_contact_id ??
            null,

        billing_address_id:
            input.billing_address_id ??
            null,

        shipping_address_id:
            input.shipping_address_id ??
            null,

        warehouse_id:
            input.warehouse_id ?? null,

        order_date:
            input.order_date ??
            getToday(),

        requested_delivery_date:
            input.requested_delivery_date ??
            null,

        expected_delivery_date:
            input.expected_delivery_date ??
            null,

        status: "draft",

        fulfilment_status:
            "unplanned",

        payment_status:
            "unpaid",

        source:
            input.source ?? "internal",

        external_reference:
            normalizeNullableText(
                input.external_reference,
            ),

        customer_reference:
            normalizeNullableText(
                input.customer_reference,
            ),

        currency_code:
            validateCurrencyCode(
                input.currency_code ??
                "AED",
            ),

        exchange_rate:
            input.exchange_rate ?? 1,

        subtotal: 0,
        discount_amount: 0,
        tax_amount: 0,

        shipping_amount:
            roundCurrency(
                input.shipping_amount ?? 0,
            ),

        grand_total:
            roundCurrency(
                input.shipping_amount ?? 0,
            ),

        paid_amount: 0,

        balance_due:
            roundCurrency(
                input.shipping_amount ?? 0,
            ),

        payment_terms_days:
            input.payment_terms_days ??
            0,

        delivery_terms:
            normalizeNullableText(
                input.delivery_terms,
            ),

        payment_terms:
            normalizeNullableText(
                input.payment_terms,
            ),

        customer_notes:
            normalizeNullableText(
                input.customer_notes,
            ),

        internal_notes:
            normalizeNullableText(
                input.internal_notes,
            ),
    };

    const { data, error } = await supabase
        .from("sales_orders")
        .insert(payload)
        .select("*")
        .single();

    if (error) {
        throw new Error(
            `Unable to create sales order: ${error.message}`,
        );
    }

    return mapSalesOrderRow(
        data as SalesOrderRow,
    );
}

/* =========================================================
 * Update Sales Order
 * ========================================================= */

export async function updateSalesOrder(
    salesOrderId: string,
    input: UpdateSalesOrderInput,
): Promise<SalesOrder> {
    const id = requireId(
        salesOrderId,
        "Sales order ID",
    );

    const existing =
        await requireDraftSalesOrder(id);

    validateSalesOrderHeaderInput({
        customer_id:
            input.customer_id ??
            existing.customer_id,

        order_date:
            input.order_date ??
            existing.order_date,

        requested_delivery_date:
            input.requested_delivery_date !==
                undefined
                ? input.requested_delivery_date
                : existing.requested_delivery_date,

        expected_delivery_date:
            input.expected_delivery_date !==
                undefined
                ? input.expected_delivery_date
                : existing.expected_delivery_date,

        currency_code:
            input.currency_code ??
            existing.currency_code,

        exchange_rate:
            input.exchange_rate ??
            existing.exchange_rate,

        shipping_amount:
            input.shipping_amount ??
            existing.shipping_amount,

        payment_terms_days:
            input.payment_terms_days ??
            existing.payment_terms_days,
    });

    const payload: SalesOrderUpdate = {};

    if (
        input.quotation_id !== undefined
    ) {
        payload.quotation_id =
            input.quotation_id;
    }

    if (
        input.customer_id !== undefined
    ) {
        payload.customer_id =
            requireId(
                input.customer_id,
                "Customer ID",
            );
    }

    if (
        input.customer_contact_id !==
        undefined
    ) {
        payload.customer_contact_id =
            input.customer_contact_id;
    }

    if (
        input.billing_address_id !==
        undefined
    ) {
        payload.billing_address_id =
            input.billing_address_id;
    }

    if (
        input.shipping_address_id !==
        undefined
    ) {
        payload.shipping_address_id =
            input.shipping_address_id;
    }

    if (
        input.warehouse_id !== undefined
    ) {
        payload.warehouse_id =
            input.warehouse_id;
    }

    if (
        input.order_date !== undefined
    ) {
        payload.order_date =
            input.order_date;
    }

    if (
        input.requested_delivery_date !==
        undefined
    ) {
        payload.requested_delivery_date =
            input.requested_delivery_date;
    }

    if (
        input.expected_delivery_date !==
        undefined
    ) {
        payload.expected_delivery_date =
            input.expected_delivery_date;
    }

    if (input.source !== undefined) {
        payload.source =
            input.source;
    }

    if (
        input.external_reference !==
        undefined
    ) {
        payload.external_reference =
            normalizeNullableText(
                input.external_reference,
            );
    }

    if (
        input.customer_reference !==
        undefined
    ) {
        payload.customer_reference =
            normalizeNullableText(
                input.customer_reference,
            );
    }

    if (
        input.currency_code !== undefined
    ) {
        payload.currency_code =
            validateCurrencyCode(
                input.currency_code,
            );
    }

    if (
        input.exchange_rate !== undefined
    ) {
        payload.exchange_rate =
            input.exchange_rate;
    }

    if (
        input.shipping_amount !== undefined
    ) {
        payload.shipping_amount =
            roundCurrency(
                input.shipping_amount,
            );
    }

    if (
        input.payment_terms_days !==
        undefined
    ) {
        payload.payment_terms_days =
            input.payment_terms_days;
    }

    if (
        input.delivery_terms !== undefined
    ) {
        payload.delivery_terms =
            normalizeNullableText(
                input.delivery_terms,
            );
    }

    if (
        input.payment_terms !== undefined
    ) {
        payload.payment_terms =
            normalizeNullableText(
                input.payment_terms,
            );
    }

    if (
        input.customer_notes !== undefined
    ) {
        payload.customer_notes =
            normalizeNullableText(
                input.customer_notes,
            );
    }

    if (
        input.internal_notes !== undefined
    ) {
        payload.internal_notes =
            normalizeNullableText(
                input.internal_notes,
            );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("sales_orders")
        .update(payload)
        .eq("id", id)
        .eq("status", "draft")
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to update sales order: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "Sales order was not found or is no longer editable.",
        );
    }

    return recalculateSalesOrderTotals(
        id,
    );
}

/* =========================================================
 * Get Sales Order Item
 * ========================================================= */

export async function getSalesOrderItemById(
    itemId: string,
): Promise<SalesOrderItem | null> {
    const id = requireId(
        itemId,
        "Sales order item ID",
    );

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("sales_order_items")
        .select(`
      *,
      product:products (
        id,
        name,
        sku
      ),
      unit:units (
        id,
        name,
        short_name
      ),
      warehouse:warehouses (
        id,
        code,
        name
      )
    `)
        .eq("id", id)
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to load sales order item: ${error.message}`,
        );
    }

    if (!data) {
        return null;
    }

    return mapSalesOrderItemRow(
        data as unknown as
        SalesOrderItemDatabaseRow,
    );
}

/* =========================================================
 * Add One Sales Order Item
 * ========================================================= */

export async function addSalesOrderItem(
    input: CreateSalesOrderItemInput,
): Promise<SalesOrderItem> {
    const salesOrderId =
        requireId(
            input.sales_order_id,
            "Sales order ID",
        );

    validateSalesOrderItemInput({
        item_name:
            input.item_name,

        quantity:
            input.quantity,

        unit_price:
            input.unit_price,

        discount_percentage:
            input.discount_percentage,

        tax_percentage:
            input.tax_percentage,

        fulfilment_method:
            input.fulfilment_method,

        procurement_lead_time_days:
            input.procurement_lead_time_days,
    });

    const order =
        await requireDraftSalesOrder(
            salesOrderId,
        );

    const calculation =
        calculateSalesOrderItem({
            quantity:
                input.quantity,

            unit_price:
                input.unit_price,

            discount_percentage:
                input.discount_percentage,

            tax_percentage:
                input.tax_percentage,
        });

    const nextLineNumber =
        order.items.reduce(
            (maximum, item) =>
                Math.max(
                    maximum,
                    item.line_number,
                ),
            0,
        ) + 1;

    const initialFulfilment =
        getInitialItemFulfilmentState(
            input.fulfilment_method,
        );

    const payload:
        SalesOrderItemInsert = {
        sales_order_id:
            salesOrderId,

        quotation_item_id:
            input.quotation_item_id ??
            null,

        line_number:
            nextLineNumber,

        product_id:
            input.product_id ?? null,

        unit_id:
            input.unit_id ?? null,

        warehouse_id:
            input.warehouse_id ??
            order.warehouse_id ??
            null,

        sku:
            normalizeNullableText(
                input.sku,
            ),

        item_name:
            input.item_name.trim(),

        description:
            normalizeNullableText(
                input.description,
            ),

        quantity:
            calculation.quantity,

        unit_price:
            calculation.unitPrice,

        discount_percentage:
            calculation.discountPercentage,

        discount_amount:
            calculation.discountAmount,

        tax_percentage:
            calculation.taxPercentage,

        tax_amount:
            calculation.taxAmount,

        line_subtotal:
            calculation.lineSubtotal,

        line_total:
            calculation.lineTotal,

        fulfilment_method:
            input.fulfilment_method,

        procurement_lead_time_days:
            input.procurement_lead_time_days ??
            0,

        allow_backorder:
            input.fulfilment_method ===
                "service"
                ? false
                : input.allow_backorder ??
                false,

        procurement_notes:
            normalizeNullableText(
                input.procurement_notes,
            ),

        fulfilment_status:
            initialFulfilment
                .fulfilmentStatus,

        quantity_reserved: 0,
        quantity_allocated: 0,
        quantity_fulfilled: 0,
        quantity_cancelled: 0,

        shortage_quantity: 0,

        procurement_required:
            initialFulfilment
                .procurementRequired,

        requested_delivery_date:
            input.requested_delivery_date ??
            null,

        expected_delivery_date:
            input.expected_delivery_date ??
            null,

        line_notes:
            normalizeNullableText(
                input.line_notes,
            ),
    };

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("sales_order_items")
        .insert(payload)
        .select(`
      *,
      product:products (
        id,
        name,
        sku
      ),
      unit:units (
        id,
        name,
        short_name
      ),
      warehouse:warehouses (
        id,
        code,
        name
      )
    `)
        .single();

    if (error) {
        throw new Error(
            `Unable to add sales order item: ${error.message}`,
        );
    }

    await recalculateSalesOrderTotals(
        salesOrderId,
    );

    return mapSalesOrderItemRow(
        data as unknown as
        SalesOrderItemDatabaseRow,
    );
}

/* =========================================================
 * Bulk Add Sales Order Items
 * ========================================================= */

export async function addSalesOrderItems(
    salesOrderId: string,
    items: BulkSalesOrderItemInput[],
): Promise<SalesOrderItem[]> {
    const id = requireId(
        salesOrderId,
        "Sales order ID",
    );

    if (items.length === 0) {
        throw new Error(
            "Add at least one sales order item.",
        );
    }

    if (items.length > 100) {
        throw new Error(
            "A maximum of 100 sales order items can be added at once.",
        );
    }

    const order =
        await requireDraftSalesOrder(id);

    const currentMaximumLine =
        order.items.reduce(
            (maximum, item) =>
                Math.max(
                    maximum,
                    item.line_number,
                ),
            0,
        );

    const payload:
        SalesOrderItemInsert[] =
        items.map((item, index) => {
            validateSalesOrderItemInput({
                item_name:
                    item.item_name,

                quantity:
                    item.quantity,

                unit_price:
                    item.unit_price,

                discount_percentage:
                    item.discount_percentage,

                tax_percentage:
                    item.tax_percentage,

                fulfilment_method:
                    item.fulfilment_method,

                procurement_lead_time_days:
                    item.procurement_lead_time_days,
            });

            const calculation =
                calculateSalesOrderItem({
                    quantity:
                        item.quantity,

                    unit_price:
                        item.unit_price,

                    discount_percentage:
                        item.discount_percentage,

                    tax_percentage:
                        item.tax_percentage,
                });

            const initialFulfilment =
                getInitialItemFulfilmentState(
                    item.fulfilment_method,
                );

            return {
                sales_order_id: id,

                quotation_item_id:
                    item.quotation_item_id ??
                    null,

                line_number:
                    currentMaximumLine +
                    index +
                    1,

                product_id:
                    item.product_id ?? null,

                unit_id:
                    item.unit_id ?? null,

                warehouse_id:
                    item.warehouse_id ??
                    order.warehouse_id ??
                    null,

                sku:
                    normalizeNullableText(
                        item.sku,
                    ),

                item_name:
                    item.item_name.trim(),

                description:
                    normalizeNullableText(
                        item.description,
                    ),

                quantity:
                    calculation.quantity,

                unit_price:
                    calculation.unitPrice,

                discount_percentage:
                    calculation.discountPercentage,

                discount_amount:
                    calculation.discountAmount,

                tax_percentage:
                    calculation.taxPercentage,

                tax_amount:
                    calculation.taxAmount,

                line_subtotal:
                    calculation.lineSubtotal,

                line_total:
                    calculation.lineTotal,

                fulfilment_method:
                    item.fulfilment_method,

                procurement_lead_time_days:
                    item.procurement_lead_time_days ??
                    0,

                allow_backorder:
                    item.fulfilment_method ===
                        "service"
                        ? false
                        : item.allow_backorder ??
                        false,

                procurement_notes:
                    normalizeNullableText(
                        item.procurement_notes,
                    ),

                fulfilment_status:
                    initialFulfilment
                        .fulfilmentStatus,

                quantity_reserved: 0,
                quantity_allocated: 0,
                quantity_fulfilled: 0,
                quantity_cancelled: 0,

                shortage_quantity: 0,

                procurement_required:
                    initialFulfilment
                        .procurementRequired,

                requested_delivery_date:
                    item.requested_delivery_date ??
                    null,

                expected_delivery_date:
                    item.expected_delivery_date ??
                    null,

                margin_cost_override:
                    item.margin_cost_override ??
                    null,

                margin_cost_override_reason:
                    normalizeNullableText(
                        item.margin_cost_override_reason,
                    ),

                line_notes:
                    normalizeNullableText(
                        item.line_notes,
                    ),
            };
        });

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("sales_order_items")
        .insert(payload)
        .select(`
      *,
      product:products (
        id,
        name,
        sku
      ),
      unit:units (
        id,
        name,
        short_name
      ),
      warehouse:warehouses (
        id,
        code,
        name
      )
    `);

    if (error) {
        throw new Error(
            `Unable to add sales order items: ${error.message}`,
        );
    }

    await recalculateSalesOrderTotals(id);

    return (
        (data ?? []) as unknown as
        SalesOrderItemDatabaseRow[]
    ).map(
        mapSalesOrderItemRow,
    );
}

/* =========================================================
 * Update Sales Order Item
 * ========================================================= */

export async function updateSalesOrderItem(
    itemId: string,
    input: UpdateSalesOrderItemInput,
): Promise<SalesOrderItem> {
    const id = requireId(
        itemId,
        "Sales order item ID",
    );

    const existing =
        await getSalesOrderItemById(id);

    if (!existing) {
        throw new Error(
            "Sales order item was not found.",
        );
    }

    await requireDraftSalesOrder(
        existing.sales_order_id,
    );

    const mergedInput = {
        item_name:
            input.item_name ??
            existing.item_name,

        quantity:
            input.quantity ??
            existing.quantity,

        unit_price:
            input.unit_price ??
            existing.unit_price,

        discount_percentage:
            input.discount_percentage ??
            existing.discount_percentage,

        tax_percentage:
            input.tax_percentage ??
            existing.tax_percentage,

        fulfilment_method:
            input.fulfilment_method ??
            existing.fulfilment_method,

        procurement_lead_time_days:
            input.procurement_lead_time_days ??
            existing.procurement_lead_time_days,
    };

    validateSalesOrderItemInput(
        mergedInput,
    );

    const calculation =
        calculateSalesOrderItem({
            quantity:
                mergedInput.quantity,

            unit_price:
                mergedInput.unit_price,

            discount_percentage:
                mergedInput
                    .discount_percentage,

            tax_percentage:
                mergedInput.tax_percentage,
        });

    const payload:
        SalesOrderItemUpdate = {
        quantity:
            calculation.quantity,

        unit_price:
            calculation.unitPrice,

        discount_percentage:
            calculation.discountPercentage,

        discount_amount:
            calculation.discountAmount,

        tax_percentage:
            calculation.taxPercentage,

        tax_amount:
            calculation.taxAmount,

        line_subtotal:
            calculation.lineSubtotal,

        line_total:
            calculation.lineTotal,
    };

    if (
        input.quotation_item_id !==
        undefined
    ) {
        payload.quotation_item_id =
            input.quotation_item_id;
    }

    if (
        input.product_id !== undefined
    ) {
        payload.product_id =
            input.product_id;
    }

    if (
        input.unit_id !== undefined
    ) {
        payload.unit_id =
            input.unit_id;
    }

    if (
        input.warehouse_id !== undefined
    ) {
        payload.warehouse_id =
            input.warehouse_id;
    }

    if (input.sku !== undefined) {
        payload.sku =
            normalizeNullableText(
                input.sku,
            );
    }

    if (
        input.item_name !== undefined
    ) {
        payload.item_name =
            input.item_name.trim();
    }

    if (
        input.description !== undefined
    ) {
        payload.description =
            normalizeNullableText(
                input.description,
            );
    }

    if (
        input.fulfilment_method !==
        undefined
    ) {
        const initialFulfilment =
            getInitialItemFulfilmentState(
                input.fulfilment_method,
            );

        payload.fulfilment_method =
            input.fulfilment_method;

        payload.fulfilment_status =
            initialFulfilment
                .fulfilmentStatus;

        payload.procurement_required =
            initialFulfilment
                .procurementRequired;

        if (
            input.fulfilment_method ===
            "service"
        ) {
            payload.allow_backorder =
                false;
        }
    }

    if (
        input.procurement_lead_time_days !==
        undefined
    ) {
        payload.procurement_lead_time_days =
            input.procurement_lead_time_days;
    }

    if (
        input.allow_backorder !==
        undefined &&
        mergedInput.fulfilment_method !==
        "service"
    ) {
        payload.allow_backorder =
            input.allow_backorder;
    }

    if (
        input.procurement_notes !==
        undefined
    ) {
        payload.procurement_notes =
            normalizeNullableText(
                input.procurement_notes,
            );
    }

    if (
        input.requested_delivery_date !==
        undefined
    ) {
        payload.requested_delivery_date =
            input.requested_delivery_date;
    }

    if (
        input.expected_delivery_date !==
        undefined
    ) {
        payload.expected_delivery_date =
            input.expected_delivery_date;
    }

    if (
        input.line_notes !== undefined
    ) {
        payload.line_notes =
            normalizeNullableText(
                input.line_notes,
            );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("sales_order_items")
        .update(payload)
        .eq("id", id)
        .select(`
      *,
      product:products (
        id,
        name,
        sku
      ),
      unit:units (
        id,
        name,
        short_name
      ),
      warehouse:warehouses (
        id,
        code,
        name
      )
    `)
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to update sales order item: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "Sales order item was not found.",
        );
    }

    await recalculateSalesOrderTotals(
        existing.sales_order_id,
    );

    return mapSalesOrderItemRow(
        data as unknown as
        SalesOrderItemDatabaseRow,
    );
}

/* =========================================================
 * Delete Sales Order Item
 * ========================================================= */

export async function deleteSalesOrderItem(
    itemId: string,
): Promise<void> {
    const item =
        await getSalesOrderItemById(
            itemId,
        );

    if (!item) {
        throw new Error(
            "Sales order item was not found.",
        );
    }

    await requireDraftSalesOrder(
        item.sales_order_id,
    );

    const supabase = await createClient();

    const { error } = await supabase
        .from("sales_order_items")
        .delete()
        .eq("id", item.id);

    if (error) {
        throw new Error(
            `Unable to delete sales order item: ${error.message}`,
        );
    }

    await normalizeSalesOrderLineNumbers(
        item.sales_order_id,
    );

    await recalculateSalesOrderTotals(
        item.sales_order_id,
    );
}

/* =========================================================
 * Recalculate Sales Order Totals
 * ========================================================= */

export async function recalculateSalesOrderTotals(
    salesOrderId: string,
): Promise<SalesOrder> {
    const id = requireId(
        salesOrderId,
        "Sales order ID",
    );

    const supabase = await createClient();

    const [
        orderResult,
        itemsResult,
    ] = await Promise.all([
        supabase
            .from("sales_orders")
            .select(`
        id,
        shipping_amount,
        paid_amount
      `)
            .eq("id", id)
            .maybeSingle(),

        supabase
            .from("sales_order_items")
            .select(`
        line_subtotal,
        discount_amount,
        tax_amount,
        line_total
      `)
            .eq(
                "sales_order_id",
                id,
            ),
    ]);

    const firstError =
        orderResult.error ??
        itemsResult.error;

    if (firstError) {
        throw new Error(
            `Unable to calculate sales order totals: ${firstError.message}`,
        );
    }

    if (!orderResult.data) {
        throw new Error(
            "Sales order was not found.",
        );
    }

    const items =
        itemsResult.data ?? [];

    const subtotal =
        roundCurrency(
            items.reduce(
                (total, item) =>
                    total +
                    Number(
                        item.line_subtotal,
                    ) +
                    Number(
                        item.discount_amount,
                    ),
                0,
            ),
        );

    const discountAmount =
        roundCurrency(
            items.reduce(
                (total, item) =>
                    total +
                    Number(
                        item.discount_amount,
                    ),
                0,
            ),
        );

    const taxAmount =
        roundCurrency(
            items.reduce(
                (total, item) =>
                    total +
                    Number(item.tax_amount),
                0,
            ),
        );

    const lineTotal =
        roundCurrency(
            items.reduce(
                (total, item) =>
                    total +
                    Number(item.line_total),
                0,
            ),
        );

    const shippingAmount =
        Number(
            orderResult.data
                .shipping_amount,
        );

    const paidAmount =
        Number(
            orderResult.data.paid_amount,
        );

    const grandTotal =
        roundCurrency(
            lineTotal + shippingAmount,
        );

    const balanceDue =
        roundCurrency(
            Math.max(
                grandTotal - paidAmount,
                0,
            ),
        );

    const { data, error } = await supabase
        .from("sales_orders")
        .update({
            subtotal,

            discount_amount:
                discountAmount,

            tax_amount:
                taxAmount,

            grand_total:
                grandTotal,

            balance_due:
                balanceDue,
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to update sales order totals: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "Sales order was not found.",
        );
    }

    return mapSalesOrderRow(
        data as SalesOrderRow,
    );
}

/* =========================================================
 * Normalize Line Numbers
 * ========================================================= */

async function normalizeSalesOrderLineNumbers(
    salesOrderId: string,
): Promise<void> {
    const id = requireId(
        salesOrderId,
        "Sales order ID",
    );

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("sales_order_items")
        .select(`
      id,
      line_number
    `)
        .eq(
            "sales_order_id",
            id,
        )
        .order("line_number", {
            ascending: true,
        });

    if (error) {
        throw new Error(
            `Unable to reorder sales order items: ${error.message}`,
        );
    }

    const rows = data ?? [];

    /*
     * First move affected lines temporarily outside
     * the normal sequence. This avoids violating the
     * unique (sales_order_id, line_number) constraint
     * while lines are being renumbered.
     */

    for (
        let index = 0;
        index < rows.length;
        index += 1
    ) {
        const temporaryLineNumber =
            1000000 + index + 1;

        const {
            error: temporaryUpdateError,
        } = await supabase
            .from("sales_order_items")
            .update({
                line_number:
                    temporaryLineNumber,
            })
            .eq(
                "id",
                rows[index].id,
            );

        if (temporaryUpdateError) {
            throw new Error(
                `Unable to reorder sales order items: ${temporaryUpdateError.message}`,
            );
        }
    }

    for (
        let index = 0;
        index < rows.length;
        index += 1
    ) {
        const requiredLineNumber =
            index + 1;

        const {
            error: finalUpdateError,
        } = await supabase
            .from("sales_order_items")
            .update({
                line_number:
                    requiredLineNumber,
            })
            .eq(
                "id",
                rows[index].id,
            );

        if (finalUpdateError) {
            throw new Error(
                `Unable to reorder sales order items: ${finalUpdateError.message}`,
            );
        }
    }
}

/* =========================================================
 * Delete Draft Sales Order
 * ========================================================= */

export async function deleteDraftSalesOrder(
    salesOrderId: string,
): Promise<void> {
    const id = requireId(
        salesOrderId,
        "Sales order ID",
    );

    await requireDraftSalesOrder(id);

    const supabase = await createClient();

    const { error } = await supabase
        .from("sales_orders")
        .delete()
        .eq("id", id)
        .eq("status", "draft");

    if (error) {
        throw new Error(
            `Unable to delete draft sales order: ${error.message}`,
        );
    }
}

/* =========================================================
 * Quotation Conversion Models
 * ========================================================= */

interface ProductFulfilmentSnapshot {
    id: string;

    fulfilment_method:
    ProductFulfilmentMethod;

    procurement_lead_time_days: number;

    allow_backorder: boolean;

    procurement_notes: string | null;
}

interface WarehouseStockPlanningRow {
    product_id: string;
    warehouse_id: string;

    quantity_on_hand: number;
    quantity_reserved: number;
    quantity_available: number | null;
}

export interface SalesOrderFulfilmentPlanItem {
    itemId: string;
    lineNumber: number;

    productId: string | null;
    itemName: string;

    fulfilmentMethod:
    ProductFulfilmentMethod;

    warehouseId: string | null;

    orderedQuantity: number;

    availableQuantity: number;

    plannedReservationQuantity: number;

    shortageQuantity: number;

    procurementRequired: boolean;

    fulfilmentStatus:
    SalesOrderItemFulfilmentStatus;
}

export interface SalesOrderFulfilmentPlan {
    salesOrderId: string;

    fulfilmentStatus:
    SalesOrderFulfilmentStatus;

    totalLines: number;

    stockLines: number;
    procurementLines: number;
    serviceLines: number;

    fullyAvailableStockLines: number;
    shortageLines: number;

    items: SalesOrderFulfilmentPlanItem[];
}

/* =========================================================
 * Convert Quotation to Sales Order
 * ========================================================= */

export async function convertQuotationToSalesOrder(
    quotationId: string,
): Promise<SalesOrderDetails> {
    const normalizedQuotationId =
        requireId(
            quotationId,
            "Sales quotation ID",
        );

    const quotation =
        await getSalesQuotationById(
            normalizedQuotationId,
        );

    if (!quotation) {
        throw new Error(
            "Sales quotation was not found.",
        );
    }

    if (quotation.status !== "accepted") {
        throw new Error(
            "Only accepted quotations can be converted into sales orders.",
        );
    }

    if (quotation.items.length === 0) {
        throw new Error(
            "The quotation must contain at least one item before conversion.",
        );
    }

    if (
        quotation.converted_sales_order_id
    ) {
        const existingOrder =
            await getSalesOrderById(
                quotation.converted_sales_order_id,
            );

        if (existingOrder) {
            return existingOrder;
        }

        throw new Error(
            "This quotation is already marked as converted.",
        );
    }

    const supabase = await createClient();

    const {
        data: existingOrder,
        error: existingOrderError,
    } = await supabase
        .from("sales_orders")
        .select("id")
        .eq(
            "quotation_id",
            normalizedQuotationId,
        )
        .maybeSingle();

    if (existingOrderError) {
        throw new Error(
            `Unable to check quotation conversion: ${existingOrderError.message}`,
        );
    }

    if (existingOrder) {
        const order =
            await getSalesOrderById(
                existingOrder.id,
            );

        if (!order) {
            throw new Error(
                "The converted sales order could not be loaded.",
            );
        }

        return order;
    }

    const productIds = Array.from(
        new Set(
            quotation.items
                .map((item) => item.product_id)
                .filter(
                    (value): value is string =>
                        Boolean(value),
                ),
        ),
    );

    const productSnapshots =
        new Map<
            string,
            ProductFulfilmentSnapshot
        >();

    if (productIds.length > 0) {
        const {
            data: products,
            error: productsError,
        } = await supabase
            .from("products")
            .select(`
        id,
        fulfilment_method,
        procurement_lead_time_days,
        allow_backorder,
        procurement_notes
      `)
            .in("id", productIds);

        if (productsError) {
            throw new Error(
                `Unable to load product fulfilment settings: ${productsError.message}`,
            );
        }

        for (const product of products ?? []) {
            productSnapshots.set(
                product.id,
                {
                    id: product.id,

                    fulfilment_method:
                        product.fulfilment_method as
                        ProductFulfilmentMethod,

                    procurement_lead_time_days:
                        Number(
                            product.procurement_lead_time_days,
                        ),

                    allow_backorder:
                        product.allow_backorder,

                    procurement_notes:
                        product.procurement_notes,
                },
            );
        }
    }

    let createdOrderId: string | null =
        null;

    try {
        const order =
            await createSalesOrder({
                quotation_id:
                    quotation.id,

                customer_id:
                    quotation.customer_id,

                customer_contact_id:
                    quotation.customer_contact_id,

                billing_address_id:
                    quotation.billing_address_id,

                shipping_address_id:
                    quotation.shipping_address_id,

                warehouse_id:
                    quotation.warehouse_id,

                order_date:
                    getToday(),

                source:
                    quotation.source,

                external_reference:
                    quotation.external_reference,

                customer_reference:
                    quotation.customer_reference,

                currency_code:
                    quotation.currency_code,

                exchange_rate:
                    quotation.exchange_rate,

                shipping_amount:
                    quotation.shipping_amount,

                payment_terms_days:
                    quotation.payment_terms_days,

                delivery_terms:
                    quotation.delivery_terms,

                payment_terms:
                    quotation.payment_terms,

                customer_notes:
                    quotation.customer_notes,

                internal_notes:
                    quotation.internal_notes,
            });

        createdOrderId = order.id;

        const orderItems:
            BulkSalesOrderItemInput[] =
            quotation.items.map((item) => {
                const productSnapshot =
                    item.product_id
                        ? productSnapshots.get(
                            item.product_id,
                        )
                        : undefined;

                /*
                 * A custom quotation line has no linked
                 * product. Local purchase is the safest
                 * default for a trading-company workflow.
                 */
                const fulfilmentMethod =
                    productSnapshot
                        ?.fulfilment_method ??
                    "local_purchase";

                return {
                    quotation_item_id:
                        item.id,

                    product_id:
                        item.product_id,

                    unit_id:
                        item.unit_id,

                    warehouse_id:
                        fulfilmentMethod === "stock"
                            ? quotation.warehouse_id
                            : null,

                    sku:
                        item.sku,

                    item_name:
                        item.item_name,

                    description:
                        item.description,

                    quantity:
                        item.quantity,

                    unit_price:
                        item.unit_price,

                    discount_percentage:
                        item.discount_percentage,

                    tax_percentage:
                        item.tax_percentage,

                    fulfilment_method:
                        fulfilmentMethod,

                    procurement_lead_time_days:
                        productSnapshot
                            ?.procurement_lead_time_days ??
                        0,

                    allow_backorder:
                        fulfilmentMethod === "service"
                            ? false
                            : productSnapshot
                                ?.allow_backorder ??
                            true,

                    procurement_notes:
                        productSnapshot
                            ?.procurement_notes ??
                        (
                            item.product_id
                                ? null
                                : "Custom quotation item. Confirm local sourcing requirements before order fulfilment."
                        ),

                    requested_delivery_date:
                        item.requested_delivery_date,

                    expected_delivery_date:
                        calculateExpectedDeliveryDate(
                            getToday(),
                            productSnapshot
                                ?.procurement_lead_time_days ??
                            0,
                        ),

                    line_notes:
                        item.line_notes,
                };
            });

        await addSalesOrderItems(
            order.id,
            orderItems,
        );

        await planSalesOrderFulfilment(
            order.id,
        );

        const {
            error: quotationUpdateError,
        } = await supabase
            .from("sales_quotations")
            .update({
                status: "converted",

                converted_at:
                    new Date().toISOString(),

                converted_sales_order_id:
                    order.id,
            })
            .eq(
                "id",
                quotation.id,
            )
            .eq("status", "accepted");

        if (quotationUpdateError) {
            throw new Error(
                `Unable to mark quotation as converted: ${quotationUpdateError.message}`,
            );
        }

        const convertedOrder =
            await getSalesOrderById(
                order.id,
            );

        if (!convertedOrder) {
            throw new Error(
                "Sales order was created but could not be loaded.",
            );
        }

        return convertedOrder;
    } catch (error) {
        /*
         * Compensating cleanup keeps the quotation
         * conversion retryable when a later step fails.
         * The created order is still a draft, so RLS
         * permits deletion.
         */
        if (createdOrderId) {
            await supabase
                .from("sales_orders")
                .delete()
                .eq("id", createdOrderId)
                .eq("status", "draft");
        }

        throw error;
    }
}

/* =========================================================
 * Draft Fulfilment Planning
 * ========================================================= */

export async function planSalesOrderFulfilment(
    salesOrderId: string,
): Promise<SalesOrderFulfilmentPlan> {
    const id = requireId(
        salesOrderId,
        "Sales order ID",
    );

    const order =
        await requireDraftSalesOrder(id);

    if (order.items.length === 0) {
        throw new Error(
            "Add at least one item before planning sales order fulfilment.",
        );
    }

    const supabase = await createClient();

    const stockItems =
        order.items.filter(
            (item) =>
                (
                    item.fulfilment_method ===
                    "stock" ||
                    item.fulfilment_method ===
                    "local_purchase"
                ) &&
                item.product_id &&
                (
                    item.warehouse_id ??
                    order.warehouse_id
                ),
        );

    const stockLookupKeys =
        new Map<
            string,
            {
                productId: string;
                warehouseId: string;
            }
        >();

    for (const item of stockItems) {
        const warehouseId =
            item.warehouse_id ??
            order.warehouse_id;

        if (
            !item.product_id ||
            !warehouseId
        ) {
            continue;
        }

        stockLookupKeys.set(
            `${item.product_id}:${warehouseId}`,
            {
                productId:
                    item.product_id,

                warehouseId,
            },
        );
    }

    const stockRows:
        WarehouseStockPlanningRow[] = [];

    /*
     * Supabase OR filters become difficult when
     * product and warehouse must match as pairs.
     * We load each unique pair concurrently.
     */
    const stockResults =
        await Promise.all(
            Array.from(
                stockLookupKeys.values(),
            ).map(async (key) => {
                const {
                    data,
                    error,
                } = await supabase
                    .from("warehouse_stock")
                    .select(`
            product_id,
            warehouse_id,
            quantity_on_hand,
            quantity_reserved,
            quantity_available
          `)
                    .eq(
                        "product_id",
                        key.productId,
                    )
                    .eq(
                        "warehouse_id",
                        key.warehouseId,
                    )
                    .maybeSingle();

                if (error) {
                    throw new Error(
                        `Unable to load warehouse availability: ${error.message}`,
                    );
                }

                return data;
            }),
        );

    for (const row of stockResults) {
        if (row) {
            stockRows.push(
                row as WarehouseStockPlanningRow,
            );
        }
    }

    const stockByProductWarehouse =
        new Map<
            string,
            WarehouseStockPlanningRow
        >();

    for (const row of stockRows) {
        stockByProductWarehouse.set(
            `${row.product_id}:${row.warehouse_id}`,
            row,
        );
    }

    /*
     * Tracks availability already planned for earlier
     * lines so multiple lines for the same product do
     * not each claim the full available quantity.
     */
    const remainingAvailability =
        new Map<string, number>();

    for (
        const [
            key,
            stockRow,
        ] of
        stockByProductWarehouse.entries()
    ) {
        const available =
            stockRow.quantity_available !==
                null
                ? Number(
                    stockRow.quantity_available,
                )
                : Math.max(
                    Number(
                        stockRow.quantity_on_hand,
                    ) -
                    Number(
                        stockRow.quantity_reserved,
                    ),
                    0,
                );

        remainingAvailability.set(
            key,
            available,
        );
    }

    const planItems:
        SalesOrderFulfilmentPlanItem[] = [];

    for (const item of order.items) {
        const quantity =
            Number(item.quantity);

        const warehouseId =
            item.warehouse_id ??
            order.warehouse_id ??
            null;

        if (
            item.fulfilment_method ===
            "service"
        ) {
            planItems.push({
                itemId:
                    item.id,

                lineNumber:
                    item.line_number,

                productId:
                    item.product_id,

                itemName:
                    item.item_name,

                fulfilmentMethod:
                    item.fulfilment_method,

                warehouseId: null,

                orderedQuantity:
                    quantity,

                availableQuantity:
                    quantity,

                plannedReservationQuantity:
                    0,

                shortageQuantity:
                    0,

                procurementRequired:
                    false,

                fulfilmentStatus:
                    "not_required",
            });

            continue;
        }

        if (
            item.fulfilment_method !==
            "stock" &&
            item.fulfilment_method !==
            "local_purchase"
        ) {
            planItems.push({
                itemId:
                    item.id,

                lineNumber:
                    item.line_number,

                productId:
                    item.product_id,

                itemName:
                    item.item_name,

                fulfilmentMethod:
                    item.fulfilment_method,

                warehouseId,

                orderedQuantity:
                    quantity,

                availableQuantity:
                    0,

                plannedReservationQuantity:
                    0,

                shortageQuantity:
                    quantity,

                procurementRequired:
                    true,

                fulfilmentStatus:
                    "awaiting_procurement",
            });

            continue;
        }

        if (
            !item.product_id ||
            !warehouseId
        ) {
            const isLocalPurchase =
                item.fulfilment_method ===
                "local_purchase";

            planItems.push({
                itemId:
                    item.id,

                lineNumber:
                    item.line_number,

                productId:
                    item.product_id,

                itemName:
                    item.item_name,

                fulfilmentMethod:
                    item.fulfilment_method,

                warehouseId,

                orderedQuantity:
                    quantity,

                availableQuantity:
                    0,

                plannedReservationQuantity:
                    0,

                shortageQuantity:
                    quantity,

                procurementRequired:
                    isLocalPurchase,

                fulfilmentStatus:
                    isLocalPurchase
                        ? "awaiting_procurement"
                        : "awaiting_stock",
            });

            continue;
        }

        const stockKey =
            `${item.product_id}:${warehouseId}`;

        const available =
            remainingAvailability.get(
                stockKey,
            ) ?? 0;

        const reservationQuantity =
            roundQuantity(
                Math.min(
                    quantity,
                    available,
                ),
            );

        const shortageQuantity =
            roundQuantity(
                Math.max(
                    quantity -
                    reservationQuantity,
                    0,
                ),
            );

        remainingAvailability.set(
            stockKey,
            roundQuantity(
                Math.max(
                    available -
                    reservationQuantity,
                    0,
                ),
            ),
        );

        let fulfilmentStatus:
            SalesOrderItemFulfilmentStatus;

        if (
            reservationQuantity ===
            quantity
        ) {
            fulfilmentStatus =
                "allocated";
        } else if (
            reservationQuantity > 0
        ) {
            fulfilmentStatus =
                "partially_allocated";
        } else {
            fulfilmentStatus =
                item.fulfilment_method ===
                    "local_purchase"
                    ? "awaiting_procurement"
                    : "awaiting_stock";
        }

        planItems.push({
            itemId:
                item.id,

            lineNumber:
                item.line_number,

            productId:
                item.product_id,

            itemName:
                item.item_name,

            fulfilmentMethod:
                item.fulfilment_method,

            warehouseId,

            orderedQuantity:
                quantity,

            availableQuantity:
                available,

            plannedReservationQuantity:
                reservationQuantity,

            shortageQuantity,

            procurementRequired:
                shortageQuantity > 0 &&
                item.allow_backorder,

            fulfilmentStatus,
        });
    }

    const updateResults =
        await Promise.all(
            planItems.map((planItem) =>
                supabase
                    .from("sales_order_items")
                    .update({
                        warehouse_id:
                            planItem.warehouseId,

                        /*
                         * Draft planning does not make a real
                         * warehouse reservation. Therefore,
                         * quantity_reserved remains zero.
                         */
                        quantity_reserved: 0,

                        quantity_allocated:
                            planItem
                                .plannedReservationQuantity,

                        shortage_quantity:
                            planItem
                                .shortageQuantity,

                        procurement_required:
                            planItem
                                .procurementRequired,

                        fulfilment_status:
                            planItem
                                .fulfilmentStatus,
                    })
                    .eq(
                        "id",
                        planItem.itemId,
                    )
                    .eq(
                        "sales_order_id",
                        id,
                    ),
            ),
        );

    const firstUpdateError =
        updateResults.find(
            (result) => result.error,
        )?.error;

    if (firstUpdateError) {
        throw new Error(
            `Unable to save sales order fulfilment plan: ${firstUpdateError.message}`,
        );
    }

    const fulfilmentStatus =
        deriveOrderFulfilmentStatus(
            planItems,
        );

    const {
        error: orderUpdateError,
    } = await supabase
        .from("sales_orders")
        .update({
            fulfilment_status:
                fulfilmentStatus,
        })
        .eq("id", id)
        .eq("status", "draft");

    if (orderUpdateError) {
        throw new Error(
            `Unable to update sales order fulfilment status: ${orderUpdateError.message}`,
        );
    }

    return {
        salesOrderId: id,

        fulfilmentStatus,

        totalLines:
            planItems.length,

        stockLines:
            planItems.filter(
                (item) =>
                    item.fulfilmentMethod ===
                    "stock",
            ).length,

        procurementLines:
            planItems.filter(
                (item) =>
                    item.procurementRequired,
            ).length,

        serviceLines:
            planItems.filter(
                (item) =>
                    item.fulfilmentMethod ===
                    "service",
            ).length,

        fullyAvailableStockLines:
            planItems.filter(
                (item) =>
                    item.fulfilmentMethod ===
                    "stock" &&
                    item.shortageQuantity === 0,
            ).length,

        shortageLines:
            planItems.filter(
                (item) =>
                    item.shortageQuantity > 0,
            ).length,

        items:
            planItems,
    };
}

/* =========================================================
 * Derive Header Fulfilment Status
 * ========================================================= */

function deriveOrderFulfilmentStatus(
    items: SalesOrderFulfilmentPlanItem[],
): SalesOrderFulfilmentStatus {
    if (
        items.every(
            (item) =>
                item.fulfilmentStatus ===
                "not_required",
        )
    ) {
        return "not_required";
    }

    if (
        items.some(
            (item) =>
                item.fulfilmentStatus ===
                "awaiting_procurement",
        )
    ) {
        return "awaiting_procurement";
    }

    if (
        items.some(
            (item) =>
                item.fulfilmentStatus ===
                "awaiting_stock",
        )
    ) {
        return "awaiting_stock";
    }

    if (
        items.some(
            (item) =>
                item.fulfilmentStatus ===
                "partially_allocated",
        )
    ) {
        return "partially_allocated";
    }

    const inventoryItems =
        items.filter(
            (item) =>
                item.fulfilmentStatus !==
                "not_required",
        );

    if (
        inventoryItems.length > 0 &&
        inventoryItems.every(
            (item) =>
                item.fulfilmentStatus ===
                "allocated",
        )
    ) {
        return "allocated";
    }

    return "unplanned";
}

/* =========================================================
 * Expected Delivery Date Helper
 * ========================================================= */

function calculateExpectedDeliveryDate(
    startingDate: string,
    leadTimeDays: number,
): string | null {
    if (
        !Number.isInteger(leadTimeDays) ||
        leadTimeDays <= 0
    ) {
        return null;
    }

    const date =
        new Date(
            `${startingDate}T00:00:00`,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return null;
    }

    date.setDate(
        date.getDate() +
        leadTimeDays,
    );

    return date
        .toISOString()
        .slice(0, 10);
}

/* =========================================================
 * Atomic Workflow Results
 * ========================================================= */

export interface ConfirmSalesOrderResult {
    salesOrderId: string;

    status: "confirmed";

    fulfilmentStatus:
    SalesOrderFulfilmentStatus;

    stockLines: number;
    procurementLines: number;
    serviceLines: number;

    shortageLines: number;

    reservedQuantity: number;

    negativeStockAllowed: boolean;
}

export interface CancelSalesOrderResult {
    salesOrderId: string;

    status: "cancelled";

    releasedQuantity: number;
}

/* =========================================================
 * Confirm Sales Order
 * ========================================================= */

export async function confirmSalesOrder(
    salesOrderId: string,
    options: {
        allowNegativeStock?: boolean;
    } = {},
): Promise<{
    order: SalesOrderDetails;
    result: ConfirmSalesOrderResult;
    customerAdvanceApplied: number;
}> {
    const id = requireId(
        salesOrderId,
        "Sales order ID",
    );

    const order =
        await getSalesOrderById(id);

    if (!order) {
        throw new Error(
            "Sales order was not found.",
        );
    }

    if (order.status !== "draft") {
        throw new Error(
            "Only draft sales orders can be confirmed.",
        );
    }

    if (order.items.length === 0) {
        throw new Error(
            "Add at least one item before confirming the sales order.",
        );
    }

    const warehouseBackedItems = order.items.filter(
        (item) =>
            item.fulfilment_method === "stock" ||
            (
                item.fulfilment_method === "local_purchase" &&
                Boolean(item.warehouse_id)
            ),
    );

    if (
        warehouseBackedItems.length > 0 &&
        !order.warehouse_id
    ) {
        throw new Error(
            "Select a warehouse before confirming this Sales Order because one or more items will be fulfilled from warehouse stock.",
        );
    }

    const mismatchedWarehouseItem =
        warehouseBackedItems.find(
            (item) =>
                !item.warehouse_id ||
                item.warehouse_id !==
                order.warehouse_id,
        );

    if (mismatchedWarehouseItem) {
        throw new Error(
            "All warehouse-fulfilled items must use the same warehouse as the Sales Order before confirmation.",
        );
    }

    const supabase = await createClient();

    const { data, error } =
        await supabase.rpc(
            "confirm_sales_order_atomic_managed",
            {
                p_sales_order_id: id,

                p_allow_negative_stock:
                    options.allowNegativeStock ??
                    false,
            },
        );

    if (error) {
        throw new Error(
            `Unable to confirm sales order: ${error.message}`,
        );
    }

    const result =
        parseConfirmSalesOrderResult(
            data,
        );

    /*
     * ---------------------------------------------------------
     * Automatically Apply Existing Customer Advance
     *
     * Once the Sales Order is confirmed, any posted,
     * unallocated Customer Receipt belonging to the same
     * customer/currency can be consumed against this order.
     *
     * The allocation itself is recorded in
     * customer_receipt_allocations, so this remains a proper
     * accounting transaction rather than simply changing the
     * Sales Order balance.
     * ---------------------------------------------------------
     */

    const customerAdvanceApplied =
        await applyCustomerAdvanceToSalesOrder(
            id,
        );

    /*
     * Reload AFTER advance allocation.
     *
     * This is important because paid_amount, balance_due and
     * payment_status may have changed.
     */

    const confirmedOrder =
        await getSalesOrderById(id);

    if (!confirmedOrder) {
        throw new Error(
            "Sales order was confirmed but could not be reloaded.",
        );
    }

    return {
        order: confirmedOrder,
        result,
        customerAdvanceApplied,
    };
}

/* =========================================================
 * Cancel Sales Order
 * ========================================================= */

export async function cancelSalesOrder(
    salesOrderId: string,
): Promise<{
    order: SalesOrderDetails;
    result: CancelSalesOrderResult;
}> {
    const id = requireId(
        salesOrderId,
        "Sales order ID",
    );

    const existing =
        await getSalesOrderById(id);

    if (!existing) {
        throw new Error(
            "Sales order was not found.",
        );
    }

    const supabase = await createClient();

    const { data, error } =
        await supabase.rpc(
            "cancel_sales_order_atomic_managed",
            {
                p_sales_order_id: id,
            },
        );

    if (error) {
        throw new Error(
            `Unable to cancel sales order: ${error.message}`,
        );
    }

    const result =
        parseCancelSalesOrderResult(
            data,
        );

    const cancelledOrder =
        await getSalesOrderById(id);

    if (!cancelledOrder) {
        throw new Error(
            "Sales order was cancelled but could not be reloaded.",
        );
    }

    return {
        order: cancelledOrder,
        result,
    };
}

/* =========================================================
 * RPC Result Parsers
 * ========================================================= */

function parseConfirmSalesOrderResult(
    value: unknown,
): ConfirmSalesOrderResult {
    const record =
        requireJsonRecord(
            value,
            "Invalid sales order confirmation response.",
        );

    return {
        salesOrderId:
            requireJsonString(
                record.salesOrderId,
                "Confirmation response is missing the sales order ID.",
            ),

        status: "confirmed",

        fulfilmentStatus:
            requireJsonString(
                record.fulfilmentStatus,
                "Confirmation response is missing the fulfilment status.",
            ) as SalesOrderFulfilmentStatus,

        stockLines:
            getJsonNumber(
                record.stockLines,
            ),

        procurementLines:
            getJsonNumber(
                record.procurementLines,
            ),

        serviceLines:
            getJsonNumber(
                record.serviceLines,
            ),

        shortageLines:
            getJsonNumber(
                record.shortageLines,
            ),

        reservedQuantity:
            getJsonNumber(
                record.reservedQuantity,
            ),

        negativeStockAllowed:
            record.negativeStockAllowed === true,
    };
}

function parseCancelSalesOrderResult(
    value: unknown,
): CancelSalesOrderResult {
    const record =
        requireJsonRecord(
            value,
            "Invalid sales order cancellation response.",
        );

    return {
        salesOrderId:
            requireJsonString(
                record.salesOrderId,
                "Cancellation response is missing the sales order ID.",
            ),

        status: "cancelled",

        releasedQuantity:
            getJsonNumber(
                record.releasedQuantity,
            ),
    };
}

function requireJsonRecord(
    value: unknown,
    message: string,
): Record<string, unknown> {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
    ) {
        throw new Error(message);
    }

    return value as Record<
        string,
        unknown
    >;
}

function requireJsonString(
    value: unknown,
    message: string,
): string {
    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        throw new Error(message);
    }

    return value;
}

function getJsonNumber(
    value: unknown,
): number {
    const numberValue =
        Number(value);

    return Number.isFinite(
        numberValue,
    )
        ? numberValue
        : 0;
}

export async function getSalesOrderMarginAnalysis(
    salesOrderId: string,
): Promise<
    SalesOrderMarginAnalysisRow[]
> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "sales_order_margin_analysis",
            )
            .select(`
        sales_order_item_id,
        line_number,
        product_id,
        item_name,
        sku,
        fulfilment_method,
        warehouse_id,
        quantity,
        unit_price,
        net_sales_value,
        effective_unit_selling_price,
        current_unit_cost,
        estimated_cogs,
        estimated_gross_profit,
        estimated_margin_percentage,
        margin_status
      `)
            .eq(
                "sales_order_id",
                salesOrderId,
            )
            .order(
                "line_number",
            );


    if (error) {
        throw new Error(
            `Unable to load Sales Order margin analysis: ${error.message}`,
        );
    }


    return (
        data ?? []
    ).map(
        (
            row,
        ) => ({
            salesOrderItemId:
                row.sales_order_item_id ??
                "",

            lineNumber:
                Number(
                    row.line_number ??
                    0,
                ),

            productId:
                row.product_id,

            itemName:
                row.item_name ??
                "",

            sku:
                row.sku,

            fulfilmentMethod:
                row.fulfilment_method ??
                "",

            warehouseId:
                row.warehouse_id,

            quantity:
                Number(
                    row.quantity ??
                    0,
                ),

            unitPrice:
                Number(
                    row.unit_price ??
                    0,
                ),

            netSalesValue:
                Number(
                    row.net_sales_value ??
                    0,
                ),

            effectiveUnitSellingPrice:
                Number(
                    row.effective_unit_selling_price ??
                    0,
                ),

            currentUnitCost:
                row.current_unit_cost ===
                    null
                    ? null
                    : Number(
                        row.current_unit_cost,
                    ),

            estimatedCogs:
                row.estimated_cogs ===
                    null
                    ? null
                    : Number(
                        row.estimated_cogs,
                    ),

            estimatedGrossProfit:
                row.estimated_gross_profit ===
                    null
                    ? null
                    : Number(
                        row.estimated_gross_profit,
                    ),

            estimatedMarginPercentage:
                row.estimated_margin_percentage ===
                    null
                    ? null
                    : Number(
                        row.estimated_margin_percentage,
                    ),

            marginStatus:
                (
                    row.margin_status ??
                    "cost_not_available"
                ) as SalesOrderMarginAnalysisRow["marginStatus"],
        }),
    );
}


export async function getSalesMarginApproval(
    salesOrderId: string,
): Promise<
    SalesMarginApproval |
    null
> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "sales_margin_approvals",
            )
            .select(`
        id,
        sales_order_id,
        status,
        requested_reason,
        requested_at,
        approved_at,
        rejected_at,
        decision_notes,
        lowest_margin_percentage,
        policy_minimum_percentage,
        policy_warning_percentage
      `)
            .eq(
                "sales_order_id",
                salesOrderId,
            )
            .in(
                "status",
                [
                    "pending",
                    "approved",
                ],
            )
            .order(
                "requested_at",
                {
                    ascending: false,
                },
            )
            .limit(
                1,
            )
            .maybeSingle();


    if (error) {
        throw new Error(
            `Unable to load margin approval: ${error.message}`,
        );
    }


    if (!data) {
        return null;
    }


    return {
        id:
            data.id,

        salesOrderId:
            data.sales_order_id,

        status:
            data.status as
            SalesMarginApproval["status"],

        requestedReason:
            data.requested_reason,

        requestedAt:
            data.requested_at,

        approvedAt:
            data.approved_at,

        rejectedAt:
            data.rejected_at,

        decisionNotes:
            data.decision_notes,

        lowestMarginPercentage:
            data.lowest_margin_percentage ===
                null
                ? null
                : Number(
                    data.lowest_margin_percentage,
                ),

        policyMinimumPercentage:
            data.policy_minimum_percentage ===
                null
                ? null
                : Number(
                    data.policy_minimum_percentage,
                ),

        policyWarningPercentage:
            data.policy_warning_percentage ===
                null
                ? null
                : Number(
                    data.policy_warning_percentage,
                ),
    };
}


export async function approveSalesMarginException(
    salesOrderId: string,
    notes: string,
): Promise<string> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "approve_sales_margin_exception",
            {
                p_sales_order_id:
                    salesOrderId,

                p_decision_notes:
                    notes.trim(),
            },
        );


    if (error) {
        throw new Error(
            `Unable to approve margin exception: ${error.message}`,
        );
    }


    if (
        typeof data !==
        "string" ||
        !data
    ) {
        throw new Error(
            "Margin approval completed but no approval ID was returned.",
        );
    }


    return data;
}