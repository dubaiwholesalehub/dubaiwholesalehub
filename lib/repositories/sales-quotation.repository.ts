import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

/* =========================================================
 * Database Types
 * ========================================================= */

type SalesQuotationRow =
  Database["public"]["Tables"]["sales_quotations"]["Row"];

type SalesQuotationInsert =
  Database["public"]["Tables"]["sales_quotations"]["Insert"];

type SalesQuotationUpdate =
  Database["public"]["Tables"]["sales_quotations"]["Update"];

type SalesQuotationItemRow =
  Database["public"]["Tables"]["sales_quotation_items"]["Row"];

type SalesQuotationItemInsert =
  Database["public"]["Tables"]["sales_quotation_items"]["Insert"];

type SalesQuotationItemUpdate =
  Database["public"]["Tables"]["sales_quotation_items"]["Update"];

/* =========================================================
 * Status and Source Types
 * ========================================================= */

export type SalesQuotationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled"
  | "converted";

export type SalesQuotationSource =
  | "internal"
  | "hmshoponline"
  | "dubaiwholesalehub"
  | "import";

/* =========================================================
 * Relation Models
 * ========================================================= */

export interface SalesQuotationCustomer {
  id: string;
  customer_number: string;
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  currency_code: string;
}

export interface SalesQuotationContact {
  id: string;
  contact_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
}

export interface SalesQuotationAddress {
  id: string;
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

export interface SalesQuotationWarehouse {
  id: string;
  code: string;
  name: string;
}

export interface SalesQuotationProduct {
  id: string;
  name: string;
  sku: string | null;
}

export interface SalesQuotationUnit {
  id: string;
  name: string;
  short_name: string;
}

/* =========================================================
 * Main Models
 * ========================================================= */

export interface SalesQuotation {
  id: string;

  quotation_number: string;

  customer_id: string;
  customer_contact_id: string | null;

  billing_address_id: string | null;
  shipping_address_id: string | null;

  warehouse_id: string | null;

  quotation_date: string;
  valid_until: string | null;

  status: SalesQuotationStatus;
  source: SalesQuotationSource;

  external_reference: string | null;
  customer_reference: string | null;

  currency_code: string;
  exchange_rate: number;

  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_amount: number;
  grand_total: number;

  payment_terms_days: number;

  delivery_terms: string | null;
  payment_terms: string | null;

  customer_notes: string | null;
  internal_notes: string | null;

  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  expired_at: string | null;
  cancelled_at: string | null;
  converted_at: string | null;

  converted_sales_order_id: string | null;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;
}

export interface SalesQuotationItem {
  id: string;

  sales_quotation_id: string;

  line_number: number;

  product_id: string | null;
  unit_id: string | null;

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

  requested_delivery_date: string | null;

  line_notes: string | null;

  created_at: string;
  updated_at: string;

  product: SalesQuotationProduct | null;
  unit: SalesQuotationUnit | null;
}

export interface SalesQuotationDetails
  extends SalesQuotation {
  customer: SalesQuotationCustomer | null;

  customer_contact:
  | SalesQuotationContact
  | null;

  billing_address:
  | SalesQuotationAddress
  | null;

  shipping_address:
  | SalesQuotationAddress
  | null;

  warehouse:
  | SalesQuotationWarehouse
  | null;

  items: SalesQuotationItem[];
}

export interface BulkSalesQuotationItemInput {
  product_id?: string | null;
  unit_id?: string | null;

  sku?: string | null;

  item_name: string;
  description?: string | null;

  quantity: number;
  unit_price: number;

  discount_percentage?: number;
  tax_percentage?: number;

  requested_delivery_date?: string | null;
  line_notes?: string | null;
}

export interface ProductPriceHistoryEntry {
  quotationId: string;
  quotationNumber: string;
  quotationDate: string;

  unitPrice: number;
  currencyCode: string;
  quantity: number;
}

export interface ProductWarehousePricingInsight {
  warehouseId: string;

  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;

  averageUnitCost: number;

  lastTransactionAt: string | null;
}

export interface ProductSupplierPricingInsight {
  supplierId: string;

  currencyCode: string | null;

  costPrice: number | null;
  lastPurchasePrice: number | null;

  isPreferred: boolean;
  priority: number;

  minimumOrderQuantity: number | null;

  lastPriceUpdate: string | null;
}

export interface ProductPriceHistoryEntry {
  quotationId: string;
  quotationNumber: string;
  quotationDate: string;

  unitPrice: number;
  currencyCode: string;
  quantity: number;
}

export interface ProductWarehousePricingInsight {
  warehouseId: string;

  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;

  averageUnitCost: number;

  lastTransactionAt: string | null;
}

export interface ProductSupplierPricingInsight {
  supplierId: string;

  currencyCode: string | null;

  costPrice: number | null;
  lastPurchasePrice: number | null;

  isPreferred: boolean;
  priority: number;

  minimumOrderQuantity: number | null;

  lastPriceUpdate: string | null;
}

export interface ProductQuotationPricingInsight {
  productId: string;

  warehouse:
  | ProductWarehousePricingInsight
  | null;

  preferredSupplier:
  | ProductSupplierPricingInsight
  | null;

  lastQuotedToCustomer:
  | ProductPriceHistoryEntry
  | null;

  lastQuotedOverall:
  | ProductPriceHistoryEntry
  | null;

  /*
   * These remain null until confirmed sales
   * transactions are implemented.
   */
  lastSoldToCustomer: null;
  lastSoldOverall: null;
}

/* =========================================================
 * Input Models
 * ========================================================= */

export interface CreateSalesQuotationInput {
  customer_id: string;

  customer_contact_id?: string | null;

  billing_address_id?: string | null;
  shipping_address_id?: string | null;

  warehouse_id?: string | null;

  quotation_date?: string;
  valid_until?: string | null;

  status?: SalesQuotationStatus;
  source?: SalesQuotationSource;

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

export type UpdateSalesQuotationInput =
  Partial<CreateSalesQuotationInput>;

export interface CreateSalesQuotationItemInput {
  sales_quotation_id: string;

  product_id?: string | null;
  unit_id?: string | null;

  sku?: string | null;

  item_name: string;
  description?: string | null;

  quantity: number;
  unit_price: number;

  discount_percentage?: number;
  tax_percentage?: number;

  requested_delivery_date?: string | null;

  line_notes?: string | null;
}

export type UpdateSalesQuotationItemInput =
  Partial<
    Omit<
      CreateSalesQuotationItemInput,
      "sales_quotation_id"
    >
  >;

/* =========================================================
 * List and Summary Models
 * ========================================================= */

export interface GetSalesQuotationsInput {
  search?: string;

  status?: SalesQuotationStatus | "all";

  source?: SalesQuotationSource | "all";

  customerId?: string;

  dateFrom?: string;
  dateTo?: string;

  page?: number;
  pageSize?: number;
}

export interface GetSalesQuotationsResult {
  data: Array<
    SalesQuotation & {
      customer:
      | SalesQuotationCustomer
      | null;

      warehouse:
      | SalesQuotationWarehouse
      | null;
    }
  >;

  count: number;

  page: number;
  pageSize: number;

  totalPages: number;
}

export interface SalesQuotationSummary {
  total: number;

  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
  cancelled: number;
  converted: number;

  totalValue: number;
}

export interface SalesQuotationFormContact {
  id: string;
  customer_id: string;
  contact_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  is_active: boolean;
}

export interface SalesQuotationFormAddress {
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

export interface SalesQuotationFormOptions {
  customers: SalesQuotationCustomer[];
  contacts: SalesQuotationFormContact[];
  addresses: SalesQuotationFormAddress[];
  warehouses: SalesQuotationWarehouse[];
}

export type ProductFulfilmentMethod =
  | "stock"
  | "local_purchase"
  | "import_on_demand"
  | "dropship"
  | "service";

export interface SalesQuotationItemProductOption {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  short_description: string | null;
  unit_id: string | null;

  fulfilment_method: ProductFulfilmentMethod;
  procurement_lead_time_days: number;
  allow_backorder: boolean;
  procurement_notes: string | null;
}

export interface SalesQuotationItemUnitOption {
  id: string;
  name: string;
  short_name: string;
}

export interface SalesQuotationItemFormOptions {
  products: SalesQuotationItemProductOption[];
  units: SalesQuotationItemUnitOption[];
}

/* =========================================================
 * Database Relation Shapes
 * ========================================================= */

interface SalesQuotationListDatabaseRow
  extends SalesQuotationRow {
  customer:
  | SalesQuotationCustomer
  | SalesQuotationCustomer[]
  | null;

  warehouse:
  | SalesQuotationWarehouse
  | SalesQuotationWarehouse[]
  | null;
}

interface SalesQuotationDetailsDatabaseRow
  extends SalesQuotationRow {
  customer:
  | SalesQuotationCustomer
  | SalesQuotationCustomer[]
  | null;

  customer_contact:
  | SalesQuotationContact
  | SalesQuotationContact[]
  | null;

  billing_address:
  | SalesQuotationAddress
  | SalesQuotationAddress[]
  | null;

  shipping_address:
  | SalesQuotationAddress
  | SalesQuotationAddress[]
  | null;

  warehouse:
  | SalesQuotationWarehouse
  | SalesQuotationWarehouse[]
  | null;

  sales_quotation_items:
  | SalesQuotationItemDatabaseRow[]
  | null;
}

interface SalesQuotationItemDatabaseRow
  extends SalesQuotationItemRow {
  product:
  | SalesQuotationProduct
  | SalesQuotationProduct[]
  | null;

  unit:
  | SalesQuotationUnit
  | SalesQuotationUnit[]
  | null;
}

interface QuotationPriceHistoryDatabaseRow {
  unit_price: number;
  quantity: number;

  sales_quotation:
  | {
    id: string;
    quotation_number: string;
    quotation_date: string;
    currency_code: string;
    customer_id: string;
    status: string;
  }
  | Array<{
    id: string;
    quotation_number: string;
    quotation_date: string;
    currency_code: string;
    customer_id: string;
    status: string;
  }>
  | null;
}

interface WarehouseStockPricingDatabaseRow {
  warehouse_id: string;
  product_id: string;

  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number | null;

  average_unit_cost: number;

  last_transaction_at: string | null;
}

interface ProductSupplierPricingDatabaseRow {
  supplier_id: string;
  product_id: string;

  currency_code: string | null;

  cost_price: number | null;
  last_purchase_price: number | null;

  is_active: boolean | null;
  is_preferred: boolean | null;

  priority: number;

  moq: number | null;

  last_price_update: string | null;
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
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}

function roundQuantity(
  value: number,
): number {
  return Math.round(
    (value + Number.EPSILON) * 10000,
  ) / 10000;
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
 * Validation Helpers
 * ========================================================= */

function validateQuotationInput(
  input: Pick<
    CreateSalesQuotationInput,
    | "customer_id"
    | "quotation_date"
    | "valid_until"
    | "currency_code"
    | "exchange_rate"
    | "shipping_amount"
    | "payment_terms_days"
  >,
): void {
  requireId(
    input.customer_id,
    "Customer ID",
  );

  if (
    input.currency_code !== undefined &&
    input.currency_code.trim().length !== 3
  ) {
    throw new Error(
      "Currency code must contain exactly 3 characters.",
    );
  }

  if (
    input.exchange_rate !== undefined &&
    input.exchange_rate <= 0
  ) {
    throw new Error(
      "Exchange rate must be greater than zero.",
    );
  }

  if (
    input.shipping_amount !== undefined &&
    input.shipping_amount < 0
  ) {
    throw new Error(
      "Shipping amount cannot be negative.",
    );
  }

  if (
    input.payment_terms_days !== undefined &&
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

  if (
    input.quotation_date &&
    input.valid_until &&
    input.valid_until <
    input.quotation_date
  ) {
    throw new Error(
      "Valid-until date cannot be earlier than the quotation date.",
    );
  }
}

function validateQuotationItemInput(
  input: Pick<
    CreateSalesQuotationItemInput,
    | "item_name"
    | "quantity"
    | "unit_price"
    | "discount_percentage"
    | "tax_percentage"
  >,
): void {
  if (!input.item_name.trim()) {
    throw new Error(
      "Quotation item name is required.",
    );
  }

  if (
    !Number.isFinite(input.quantity) ||
    input.quantity <= 0
  ) {
    throw new Error(
      "Quotation item quantity must be greater than zero.",
    );
  }

  if (
    !Number.isFinite(input.unit_price) ||
    input.unit_price < 0
  ) {
    throw new Error(
      "Quotation item price cannot be negative.",
    );
  }

  const discountPercentage =
    input.discount_percentage ?? 0;

  if (
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
    taxPercentage < 0 ||
    taxPercentage > 100
  ) {
    throw new Error(
      "Tax percentage must be between 0 and 100.",
    );
  }
}

/* =========================================================
 * Mapping
 * ========================================================= */

function mapSalesQuotationRow(
  row: SalesQuotationRow,
): SalesQuotation {
  return {
    id: row.id,

    quotation_number:
      row.quotation_number,

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

    quotation_date:
      row.quotation_date,

    valid_until:
      row.valid_until,

    status:
      row.status as SalesQuotationStatus,

    source:
      row.source as SalesQuotationSource,

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

    sent_at:
      row.sent_at,

    accepted_at:
      row.accepted_at,

    rejected_at:
      row.rejected_at,

    expired_at:
      row.expired_at,

    cancelled_at:
      row.cancelled_at,

    converted_at:
      row.converted_at,

    converted_sales_order_id:
      row.converted_sales_order_id,

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

function mapSalesQuotationItemRow(
  row: SalesQuotationItemDatabaseRow,
): SalesQuotationItem {
  return {
    id: row.id,

    sales_quotation_id:
      row.sales_quotation_id,

    line_number:
      row.line_number,

    product_id:
      row.product_id,

    unit_id:
      row.unit_id,

    sku: row.sku,

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

    requested_delivery_date:
      row.requested_delivery_date,

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
  };
}

/* =========================================================
 * Line Calculation
 * ========================================================= */

interface CalculatedQuotationItemValues {
  quantity: number;
  unitPrice: number;

  discountPercentage: number;
  discountAmount: number;

  taxPercentage: number;
  taxAmount: number;

  lineSubtotal: number;
  lineTotal: number;
}

function calculateQuotationItem(
  input: Pick<
    CreateSalesQuotationItemInput,
    | "quantity"
    | "unit_price"
    | "discount_percentage"
    | "tax_percentage"
  >,
): CalculatedQuotationItemValues {
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

/* =========================================================
 * Read Operations
 * ========================================================= */

export async function getSalesQuotationPage({
  search,
  status,
  source,
  customerId,
  dateFrom,
  dateTo,
  page,
  pageSize,
}: GetSalesQuotationsInput = {}): Promise<GetSalesQuotationsResult> {
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
    .from("sales_quotations")
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
      "quotation_date",
      dateFrom,
    );
  }

  if (dateTo) {
    query = query.lte(
      "quotation_date",
      dateTo,
    );
  }

  if (searchTerm) {
    query = query.or(
      [
        `quotation_number.ilike.%${searchTerm}%`,
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
    .order("quotation_date", {
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
      `Unable to load sales quotations: ${error.message}`,
    );
  }

  const rows =
    (data ?? []) as unknown as
    SalesQuotationListDatabaseRow[];

  const totalCount =
    count ?? 0;

  return {
    data: rows.map((row) => ({
      ...mapSalesQuotationRow(row),

      customer:
        getSingleRelation(
          row.customer,
        ),

      warehouse:
        getSingleRelation(
          row.warehouse,
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

export async function getSalesQuotationById(
  quotationId: string,
): Promise<SalesQuotationDetails | null> {
  const id = requireId(
    quotationId,
    "Sales quotation ID",
  );

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales_quotations")
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
        contact_name,
        job_title,
        email,
        phone,
        whatsapp
      ),
      billing_address:customer_addresses!sales_quotations_billing_address_id_fkey (
        id,
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
      shipping_address:customer_addresses!sales_quotations_shipping_address_id_fkey (
        id,
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
      sales_quotation_items (
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
        )
      )
    `)
    .eq("id", id)
    .order("line_number", {
      referencedTable:
        "sales_quotation_items",
      ascending: true,
    })
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load sales quotation: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  const row =
    data as unknown as
    SalesQuotationDetailsDatabaseRow;

  return {
    ...mapSalesQuotationRow(row),

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

    items:
      (
        row.sales_quotation_items ?? []
      ).map(
        mapSalesQuotationItemRow,
      ),
  };
}

export async function getSalesQuotationSummary(): Promise<SalesQuotationSummary> {
  const supabase = await createClient();

  const [
    totalResult,
    draftResult,
    sentResult,
    acceptedResult,
    rejectedResult,
    expiredResult,
    cancelledResult,
    convertedResult,
    valueResult,
  ] = await Promise.all([
    countSalesQuotations(),

    countSalesQuotations("draft"),

    countSalesQuotations("sent"),

    countSalesQuotations("accepted"),

    countSalesQuotations("rejected"),

    countSalesQuotations("expired"),

    countSalesQuotations("cancelled"),

    countSalesQuotations("converted"),

    supabase
      .from("sales_quotations")
      .select("grand_total")
      .in("status", [
        "sent",
        "accepted",
        "converted",
      ]),
  ]);

  const firstError =
    totalResult.error ??
    draftResult.error ??
    sentResult.error ??
    acceptedResult.error ??
    rejectedResult.error ??
    expiredResult.error ??
    cancelledResult.error ??
    convertedResult.error ??
    valueResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load sales quotation summary: ${firstError.message}`,
    );
  }

  const totalValue =
    (valueResult.data ?? [])
      .reduce(
        (total, quotation) =>
          total +
          Number(
            quotation.grand_total,
          ),
        0,
      );

  return {
    total:
      totalResult.count ?? 0,

    draft:
      draftResult.count ?? 0,

    sent:
      sentResult.count ?? 0,

    accepted:
      acceptedResult.count ?? 0,

    rejected:
      rejectedResult.count ?? 0,

    expired:
      expiredResult.count ?? 0,

    cancelled:
      cancelledResult.count ?? 0,

    converted:
      convertedResult.count ?? 0,

    totalValue:
      roundCurrency(totalValue),
  };
}

async function countSalesQuotations(
  status?: SalesQuotationStatus,
) {
  const supabase = await createClient();

  let query = supabase
    .from("sales_quotations")
    .select("id", {
      count: "exact",
      head: true,
    });

  if (status) {
    query = query.eq(
      "status",
      status,
    );
  }

  return query;
}

export async function getProductQuotationPricingInsight(
  productId: string,
  customerId: string,
  warehouseId?: string | null,
): Promise<ProductQuotationPricingInsight> {
  const normalizedProductId =
    requireId(
      productId,
      "Product ID",
    );

  const normalizedCustomerId =
    requireId(
      customerId,
      "Customer ID",
    );

  const normalizedWarehouseId =
    warehouseId?.trim() || null;

  const supabase = await createClient();

  let warehouseStockQuery = supabase
    .from("warehouse_stock")
    .select(`
      warehouse_id,
      product_id,
      quantity_on_hand,
      quantity_reserved,
      quantity_available,
      average_unit_cost,
      last_transaction_at
    `)
    .eq(
      "product_id",
      normalizedProductId,
    );

  if (normalizedWarehouseId) {
    warehouseStockQuery =
      warehouseStockQuery.eq(
        "warehouse_id",
        normalizedWarehouseId,
      );
  }

  const [
    warehouseStockResult,
    supplierPricingResult,
    quotationHistoryResult,
  ] = await Promise.all([
    warehouseStockQuery
      .order("updated_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("product_suppliers")
      .select(`
        supplier_id,
        product_id,
        currency_code,
        cost_price,
        last_purchase_price,
        is_active,
        is_preferred,
        priority,
        moq,
        last_price_update
      `)
      .eq(
        "product_id",
        normalizedProductId,
      )
      .eq("is_active", true)
      .order("is_preferred", {
        ascending: false,
      })
      .order("priority", {
        ascending: true,
      })
      .order("last_price_update", {
        ascending: false,
        nullsFirst: false,
      })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("sales_quotation_items")
      .select(`
        unit_price,
        quantity,
        sales_quotation:sales_quotations!inner (
          id,
          quotation_number,
          quotation_date,
          currency_code,
          customer_id,
          status
        )
      `)
      .eq(
        "product_id",
        normalizedProductId,
      )
      .in(
        "sales_quotation.status",
        [
          "sent",
          "accepted",
          "converted",
        ],
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(50),
  ]);

  const firstError =
    warehouseStockResult.error ??
    supplierPricingResult.error ??
    quotationHistoryResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load product pricing insights: ${firstError.message}`,
    );
  }

  const warehouseStock =
    warehouseStockResult.data
      ? (
        warehouseStockResult.data as
        WarehouseStockPricingDatabaseRow
      )
      : null;

  const supplierPricing =
    supplierPricingResult.data
      ? (
        supplierPricingResult.data as
        ProductSupplierPricingDatabaseRow
      )
      : null;

  const quotationRows =
    (
      quotationHistoryResult.data ?? []
    ) as unknown as
    QuotationPriceHistoryDatabaseRow[];

  const normalizedQuotationRows =
    quotationRows
      .map((row) => {
        const quotation =
          getSingleRelation(
            row.sales_quotation,
          );

        if (!quotation) {
          return null;
        }

        return {
          quotation,

          unitPrice:
            Number(row.unit_price),

          quantity:
            Number(row.quantity),
        };
      })
      .filter(
        (
          row,
        ): row is NonNullable<
          typeof row
        > => row !== null,
      );

  const customerQuotation =
    normalizedQuotationRows.find(
      (row) =>
        row.quotation.customer_id ===
        normalizedCustomerId,
    ) ?? null;

  const overallQuotation =
    normalizedQuotationRows[0] ??
    null;

  return {
    productId:
      normalizedProductId,

    warehouse:
      warehouseStock
        ? {
          warehouseId:
            warehouseStock.warehouse_id,

          quantityOnHand:
            Number(
              warehouseStock
                .quantity_on_hand,
            ),

          quantityReserved:
            Number(
              warehouseStock
                .quantity_reserved,
            ),

          quantityAvailable:
            warehouseStock
              .quantity_available !==
              null
              ? Number(
                warehouseStock
                  .quantity_available,
              )
              : Math.max(
                Number(
                  warehouseStock
                    .quantity_on_hand,
                ) -
                Number(
                  warehouseStock
                    .quantity_reserved,
                ),
                0,
              ),

          averageUnitCost:
            Number(
              warehouseStock
                .average_unit_cost,
            ),

          lastTransactionAt:
            warehouseStock
              .last_transaction_at,
        }
        : null,

    preferredSupplier:
      supplierPricing
        ? {
          supplierId:
            supplierPricing.supplier_id,

          currencyCode:
            supplierPricing.currency_code,

          costPrice:
            supplierPricing.cost_price !==
              null
              ? Number(
                supplierPricing
                  .cost_price,
              )
              : null,

          lastPurchasePrice:
            supplierPricing
              .last_purchase_price !==
              null
              ? Number(
                supplierPricing
                  .last_purchase_price,
              )
              : null,

          isPreferred:
            supplierPricing
              .is_preferred === true,

          priority:
            Number(
              supplierPricing.priority,
            ),

          minimumOrderQuantity:
            supplierPricing.moq !== null
              ? Number(
                supplierPricing.moq,
              )
              : null,

          lastPriceUpdate:
            supplierPricing
              .last_price_update,
        }
        : null,

    lastQuotedToCustomer:
      customerQuotation
        ? mapQuotationPriceHistory(
          customerQuotation,
        )
        : null,

    lastQuotedOverall:
      overallQuotation
        ? mapQuotationPriceHistory(
          overallQuotation,
        )
        : null,

    lastSoldToCustomer: null,
    lastSoldOverall: null,
  };
}

function mapQuotationPriceHistory(
  row: {
    quotation: {
      id: string;
      quotation_number: string;
      quotation_date: string;
      currency_code: string;
      customer_id: string;
      status: string;
    };

    unitPrice: number;
    quantity: number;
  },
): ProductPriceHistoryEntry {
  return {
    quotationId:
      row.quotation.id,

    quotationNumber:
      row.quotation.quotation_number,

    quotationDate:
      row.quotation.quotation_date,

    unitPrice:
      row.unitPrice,

    currencyCode:
      row.quotation.currency_code,

    quantity:
      row.quantity,
  };
}

/* =========================================================
 * Header Write Operations
 * ========================================================= */

export async function createSalesQuotation(
  input: CreateSalesQuotationInput,
): Promise<SalesQuotation> {
  validateQuotationInput(input);

  const supabase = await createClient();

  const payload: SalesQuotationInsert = {
    quotation_number: "",

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
      input.warehouse_id ??
      null,

    quotation_date:
      input.quotation_date ??
      new Date()
        .toISOString()
        .slice(0, 10),

    valid_until:
      input.valid_until ??
      null,

    status:
      input.status ?? "draft",

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
      (
        input.currency_code ??
        "AED"
      )
        .trim()
        .toUpperCase(),

    exchange_rate:
      input.exchange_rate ?? 1,

    shipping_amount:
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
    .from("sales_quotations")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Unable to create sales quotation: ${error.message}`,
    );
  }

  return mapSalesQuotationRow(
    data as SalesQuotationRow,
  );
}

export async function updateSalesQuotation(
  quotationId: string,
  input: UpdateSalesQuotationInput,
): Promise<SalesQuotation> {
  const id = requireId(
    quotationId,
    "Sales quotation ID",
  );

  const existing =
    await getSalesQuotationById(id);

  if (!existing) {
    throw new Error(
      "Sales quotation was not found.",
    );
  }

  if (existing.status !== "draft") {
    throw new Error(
      "Only draft sales quotations can be edited.",
    );
  }

  validateQuotationInput({
    customer_id:
      input.customer_id ??
      existing.customer_id,

    quotation_date:
      input.quotation_date ??
      existing.quotation_date,

    valid_until:
      input.valid_until !== undefined
        ? input.valid_until
        : existing.valid_until,

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

  const payload: SalesQuotationUpdate = {};

  if (input.customer_id !== undefined) {
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

  if (input.warehouse_id !== undefined) {
    payload.warehouse_id =
      input.warehouse_id;
  }

  if (
    input.quotation_date !== undefined
  ) {
    payload.quotation_date =
      input.quotation_date;
  }

  if (input.valid_until !== undefined) {
    payload.valid_until =
      input.valid_until;
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
      input.currency_code
        .trim()
        .toUpperCase();
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
    .from("sales_quotations")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to update sales quotation: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Sales quotation was not found.",
    );
  }

  await recalculateSalesQuotationTotals(id);

  return mapSalesQuotationRow(
    data as SalesQuotationRow,
  );
}

export async function getSalesQuotationFormOptions(): Promise<
  SalesQuotationFormOptions
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
      `Unable to load sales quotation form options: ${firstError.message}`,
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
 * Item Operations
 * ========================================================= */

export async function addSalesQuotationItem(
  input: CreateSalesQuotationItemInput,
): Promise<SalesQuotationItem> {
  const quotationId = requireId(
    input.sales_quotation_id,
    "Sales quotation ID",
  );

  validateQuotationItemInput(input);

  const quotation =
    await getSalesQuotationById(
      quotationId,
    );

  if (!quotation) {
    throw new Error(
      "Sales quotation was not found.",
    );
  }

  if (quotation.status !== "draft") {
    throw new Error(
      "Items can only be added to draft quotations.",
    );
  }

  const calculation =
    calculateQuotationItem(input);

  const nextLineNumber =
    quotation.items.reduce(
      (maximum, item) =>
        Math.max(
          maximum,
          item.line_number,
        ),
      0,
    ) + 1;

  const payload:
    SalesQuotationItemInsert = {
    sales_quotation_id:
      quotationId,

    line_number:
      nextLineNumber,

    product_id:
      input.product_id ?? null,

    unit_id:
      input.unit_id ?? null,

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

    requested_delivery_date:
      input.requested_delivery_date ??
      null,

    line_notes:
      normalizeNullableText(
        input.line_notes,
      ),
  };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales_quotation_items")
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
      )
    `)
    .single();

  if (error) {
    throw new Error(
      `Unable to add sales quotation item: ${error.message}`,
    );
  }

  await recalculateSalesQuotationTotals(
    quotationId,
  );

  return mapSalesQuotationItemRow(
    data as unknown as
    SalesQuotationItemDatabaseRow,
  );
}

export async function addSalesQuotationItems(
  quotationId: string,
  items: BulkSalesQuotationItemInput[],
): Promise<SalesQuotationItem[]> {
  const id = requireId(
    quotationId,
    "Sales quotation ID",
  );

  if (items.length === 0) {
    throw new Error(
      "Add at least one quotation item.",
    );
  }

  if (items.length > 100) {
    throw new Error(
      "A maximum of 100 items can be added at once.",
    );
  }

  const quotation =
    await getSalesQuotationById(id);

  if (!quotation) {
    throw new Error(
      "Sales quotation was not found.",
    );
  }

  if (quotation.status !== "draft") {
    throw new Error(
      "Items can only be added to draft quotations.",
    );
  }

  const currentMaximumLine =
    quotation.items.reduce(
      (maximum, item) =>
        Math.max(
          maximum,
          item.line_number,
        ),
      0,
    );

  const payload: SalesQuotationItemInsert[] =
    items.map((item, index) => {
      validateQuotationItemInput({
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage:
          item.discount_percentage,
        tax_percentage:
          item.tax_percentage,
      });

      const calculation =
        calculateQuotationItem({
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage:
            item.discount_percentage,
          tax_percentage:
            item.tax_percentage,
        });

      return {
        sales_quotation_id: id,

        line_number:
          currentMaximumLine +
          index +
          1,

        product_id:
          item.product_id ?? null,

        unit_id:
          item.unit_id ?? null,

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

        requested_delivery_date:
          item.requested_delivery_date ??
          null,

        line_notes:
          normalizeNullableText(
            item.line_notes,
          ),
      };
    });

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales_quotation_items")
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
      )
    `);

  if (error) {
    throw new Error(
      `Unable to add quotation items: ${error.message}`,
    );
  }

  await recalculateSalesQuotationTotals(id);

  return (
    (data ?? []) as unknown as
    SalesQuotationItemDatabaseRow[]
  ).map(mapSalesQuotationItemRow);
}

export async function updateSalesQuotationItem(
  itemId: string,
  input: UpdateSalesQuotationItemInput,
): Promise<SalesQuotationItem> {
  const id = requireId(
    itemId,
    "Sales quotation item ID",
  );

  const existing =
    await getSalesQuotationItemById(id);

  if (!existing) {
    throw new Error(
      "Sales quotation item was not found.",
    );
  }

  const quotation =
    await getSalesQuotationById(
      existing.sales_quotation_id,
    );

  if (!quotation) {
    throw new Error(
      "Sales quotation was not found.",
    );
  }

  if (quotation.status !== "draft") {
    throw new Error(
      "Items can only be edited on draft quotations.",
    );
  }

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
  };

  validateQuotationItemInput(
    mergedInput,
  );

  const calculation =
    calculateQuotationItem(
      mergedInput,
    );

  const payload:
    SalesQuotationItemUpdate = {
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

  if (input.product_id !== undefined) {
    payload.product_id =
      input.product_id;
  }

  if (input.unit_id !== undefined) {
    payload.unit_id =
      input.unit_id;
  }

  if (input.sku !== undefined) {
    payload.sku =
      normalizeNullableText(
        input.sku,
      );
  }

  if (input.item_name !== undefined) {
    payload.item_name =
      input.item_name.trim();
  }

  if (input.description !== undefined) {
    payload.description =
      normalizeNullableText(
        input.description,
      );
  }

  if (
    input.requested_delivery_date !==
    undefined
  ) {
    payload.requested_delivery_date =
      input.requested_delivery_date;
  }

  if (input.line_notes !== undefined) {
    payload.line_notes =
      normalizeNullableText(
        input.line_notes,
      );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales_quotation_items")
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
      )
    `)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to update sales quotation item: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Sales quotation item was not found.",
    );
  }

  await recalculateSalesQuotationTotals(
    existing.sales_quotation_id,
  );

  return mapSalesQuotationItemRow(
    data as unknown as
    SalesQuotationItemDatabaseRow,
  );
}

export async function getSalesQuotationItemById(
  itemId: string,
): Promise<SalesQuotationItem | null> {
  const id = requireId(
    itemId,
    "Sales quotation item ID",
  );

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales_quotation_items")
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
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load sales quotation item: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapSalesQuotationItemRow(
    data as unknown as
    SalesQuotationItemDatabaseRow,
  );
}

export async function deleteSalesQuotationItem(
  itemId: string,
): Promise<void> {
  const item =
    await getSalesQuotationItemById(
      itemId,
    );

  if (!item) {
    throw new Error(
      "Sales quotation item was not found.",
    );
  }

  const quotation =
    await getSalesQuotationById(
      item.sales_quotation_id,
    );

  if (!quotation) {
    throw new Error(
      "Sales quotation was not found.",
    );
  }

  if (quotation.status !== "draft") {
    throw new Error(
      "Items can only be removed from draft quotations.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("sales_quotation_items")
    .delete()
    .eq("id", item.id);

  if (error) {
    throw new Error(
      `Unable to remove sales quotation item: ${error.message}`,
    );
  }

  await normalizeSalesQuotationLineNumbers(
    item.sales_quotation_id,
  );

  await recalculateSalesQuotationTotals(
    item.sales_quotation_id,
  );
}

/* =========================================================
 * Total Recalculation
 * ========================================================= */

export async function recalculateSalesQuotationTotals(
  quotationId: string,
): Promise<SalesQuotation> {
  const id = requireId(
    quotationId,
    "Sales quotation ID",
  );

  const supabase = await createClient();

  const [
    quotationResult,
    itemsResult,
  ] = await Promise.all([
    supabase
      .from("sales_quotations")
      .select("*")
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("sales_quotation_items")
      .select(`
        line_subtotal,
        discount_amount,
        tax_amount,
        line_total
      `)
      .eq(
        "sales_quotation_id",
        id,
      ),
  ]);

  const firstError =
    quotationResult.error ??
    itemsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to calculate sales quotation totals: ${firstError.message}`,
    );
  }

  if (!quotationResult.data) {
    throw new Error(
      "Sales quotation was not found.",
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

  const shippingAmount =
    Number(
      quotationResult.data
        .shipping_amount,
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

  const grandTotal =
    roundCurrency(
      lineTotal + shippingAmount,
    );

  const { data, error } = await supabase
    .from("sales_quotations")
    .update({
      subtotal,
      discount_amount:
        discountAmount,
      tax_amount:
        taxAmount,
      grand_total:
        grandTotal,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to update sales quotation totals: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Sales quotation was not found.",
    );
  }

  return mapSalesQuotationRow(
    data as SalesQuotationRow,
  );
}

async function normalizeSalesQuotationLineNumbers(
  quotationId: string,
): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales_quotation_items")
    .select("id, line_number")
    .eq(
      "sales_quotation_id",
      quotationId,
    )
    .order("line_number", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to reorder quotation items: ${error.message}`,
    );
  }

  const rows = data ?? [];

  for (
    let index = 0;
    index < rows.length;
    index += 1
  ) {
    const requiredLineNumber =
      index + 1;

    if (
      rows[index].line_number ===
      requiredLineNumber
    ) {
      continue;
    }

    const { error: updateError } =
      await supabase
        .from(
          "sales_quotation_items",
        )
        .update({
          line_number:
            requiredLineNumber,
        })
        .eq(
          "id",
          rows[index].id,
        );

    if (updateError) {
      throw new Error(
        `Unable to reorder quotation items: ${updateError.message}`,
      );
    }
  }
}

export async function getSalesQuotationItemFormOptions(): Promise<
  SalesQuotationItemFormOptions
> {
  const supabase = await createClient();

  const [
    productsResult,
    unitsResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(`
    id,
    name,
    sku,
    barcode,
    short_description,
    unit_id,
    fulfilment_method,
    procurement_lead_time_days,
    allow_backorder,
    procurement_notes
  `)
      .in("status", [
        "draft",
        "published",
      ])
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("units")
      .select(`
        id,
        name,
        short_name
      `)
      .eq("is_active", true)
      .order("name", {
        ascending: true,
      }),
  ]);

  const firstError =
    productsResult.error ??
    unitsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load quotation item options: ${firstError.message}`,
    );
  }

  return {
    products: (productsResult.data ?? []).map(
      (product): SalesQuotationItemProductOption => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        short_description:
          product.short_description,
        unit_id: product.unit_id,

        fulfilment_method:
          product.fulfilment_method as ProductFulfilmentMethod,

        procurement_lead_time_days:
          product.procurement_lead_time_days,

        allow_backorder:
          product.allow_backorder,

        procurement_notes:
          product.procurement_notes,
      }),
    ),

    units:
      unitsResult.data ?? [],
  };
}

/* =========================================================
 * Status Lifecycle
 * ========================================================= */

export async function setSalesQuotationStatus(
  quotationId: string,
  status: SalesQuotationStatus,
): Promise<SalesQuotation> {
  const id = requireId(
    quotationId,
    "Sales quotation ID",
  );

  const quotation =
    await getSalesQuotationById(id);

  if (!quotation) {
    throw new Error(
      "Sales quotation was not found.",
    );
  }

  validateStatusTransition(
    quotation.status,
    status,
  );

  if (
    status === "sent" &&
    quotation.items.length === 0
  ) {
    throw new Error(
      "Add at least one item before sending the quotation.",
    );
  }

  const now =
    new Date().toISOString();

  const payload:
    SalesQuotationUpdate = {
    status,
  };

  if (status === "sent") {
    payload.sent_at = now;
  }

  if (status === "accepted") {
    payload.accepted_at = now;
  }

  if (status === "rejected") {
    payload.rejected_at = now;
  }

  if (status === "expired") {
    payload.expired_at = now;
  }

  if (status === "cancelled") {
    payload.cancelled_at = now;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales_quotations")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to update sales quotation status: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Sales quotation was not found.",
    );
  }

  return mapSalesQuotationRow(
    data as SalesQuotationRow,
  );
}

function validateStatusTransition(
  currentStatus: SalesQuotationStatus,
  nextStatus: SalesQuotationStatus,
): void {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions: Record<
    SalesQuotationStatus,
    SalesQuotationStatus[]
  > = {
    draft: [
      "sent",
      "cancelled",
    ],

    sent: [
      "accepted",
      "rejected",
      "expired",
      "cancelled",
    ],

    accepted: [
      "converted",
      "cancelled",
    ],

    rejected: [],

    expired: [],

    cancelled: [],

    converted: [],
  };

  if (
    !allowedTransitions[
      currentStatus
    ].includes(nextStatus)
  ) {
    throw new Error(
      `Sales quotation cannot move from ${currentStatus} to ${nextStatus}.`,
    );
  }
}

/* =========================================================
 * Draft Deletion
 * ========================================================= */

export async function deleteDraftSalesQuotation(
  quotationId: string,
): Promise<void> {
  const id = requireId(
    quotationId,
    "Sales quotation ID",
  );

  const quotation =
    await getSalesQuotationById(id);

  if (!quotation) {
    throw new Error(
      "Sales quotation was not found.",
    );
  }

  if (quotation.status !== "draft") {
    throw new Error(
      "Only draft sales quotations can be deleted.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("sales_quotations")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      `Unable to delete sales quotation: ${error.message}`,
    );
  }
}