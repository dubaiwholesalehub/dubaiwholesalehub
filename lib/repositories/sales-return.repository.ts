import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

/* =========================================================
 * Database Types
 * ========================================================= */

type SalesReturnRow =
  Database["public"]["Tables"]["sales_returns"]["Row"];

type SalesReturnItemRow =
  Database["public"]["Tables"]["sales_return_items"]["Row"];

/* =========================================================
 * Strict Business Types
 * ========================================================= */

export type SalesReturnStatus =
  | "draft"
  | "approved"
  | "received"
  | "posted"
  | "cancelled";

/* =========================================================
 * Relation Models
 * ========================================================= */

export interface SalesReturnCustomer {
  id: string;
  customer_number: string;
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  currency_code: string;
}

export interface SalesReturnSalesOrder {
  id: string;
  order_number: string;
  order_date: string;
  status: string;
  fulfilment_status: string;
  payment_status: string;
  currency_code: string;
  grand_total: number;
  paid_amount: number;
  balance_due: number;
}

export interface SalesReturnInventoryTransaction {
  id: string;
  transaction_number: string;
  transaction_type: string;
  status: string;
  transaction_date: string;
}

export interface SalesReturnJournalReference {
  id: string;
  journal_number: string;
  journal_date: string;
  posting_date: string;
  status: string;
  source_type: string;
  source_number: string | null;
}

export interface SalesReturnProduct {
  id: string;
  name: string;
  sku: string | null;
}

export interface SalesReturnWarehouse {
  id: string;
  code: string;
  name: string;
}

/* =========================================================
 * Main Models
 * ========================================================= */

export interface SalesReturn {
  id: string;

  return_number: string;

  sales_order_id: string;
  customer_id: string;

  return_date: string;
  posting_date: string;

  status: SalesReturnStatus;

  reason: string;
  notes: string | null;

  currency_code: string;
  exchange_rate: number;

  subtotal: number;
  discount_amount: number;
  net_amount: number;
  tax_amount: number;
  grand_total: number;

  inventory_transaction_id: string | null;

  credit_journal_entry_id: string | null;
  inventory_journal_entry_id: string | null;

  approved_at: string | null;
  approved_by: string | null;

  received_at: string | null;
  received_by: string | null;

  posted_at: string | null;
  posted_by: string | null;

  cancelled_at: string | null;
  cancelled_by: string | null;

  cancellation_reason: string | null;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;

  customer?: SalesReturnCustomer | null;

  sales_order?: SalesReturnSalesOrder | null;

  inventory_transaction?:
    | SalesReturnInventoryTransaction
    | null;

  credit_journal?:
    | SalesReturnJournalReference
    | null;

  inventory_journal?:
    | SalesReturnJournalReference
    | null;
}

export interface SalesReturnItem {
  id: string;

  sales_return_id: string;

  line_number: number;

  sales_order_item_id: string;
  delivery_order_item_id: string;

  product_id: string;
  warehouse_id: string;

  sku: string | null;
  item_name: string;

  unit_id: string | null;

  quantity_returned: number;

  unit_price: number;

  discount_percentage: number;
  discount_amount: number;

  tax_percentage: number;
  tax_amount: number;

  line_subtotal: number;
  line_net: number;
  line_total: number;

  original_unit_cost: number;
  return_cost: number;

  condition: string;

  return_reason: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;

  product?: SalesReturnProduct | null;

  warehouse?: SalesReturnWarehouse | null;
}

/* =========================================================
 * Page / Filter Types
 * ========================================================= */

export interface GetSalesReturnsInput {
  search?: string;

  status?:
    | SalesReturnStatus
    | "all";

  customerId?: string;

  salesOrderId?: string;

  dateFrom?: string;
  dateTo?: string;

  page?: number;
  pageSize?: number;
}

export interface GetSalesReturnsResult {
  data: SalesReturn[];

  count: number;

  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SalesReturnSummary {
  total: number;

  draft: number;
  approved: number;
  received: number;
  posted: number;
  cancelled: number;

  totalReturnValue: number;
  postedReturnValue: number;

  awaitingInventory: number;
  awaitingGlPosting: number;
}

/* =========================================================
 * Database Relation Row Types
 * ========================================================= */

interface SalesReturnListDatabaseRow
  extends SalesReturnRow {
  customer:
    | SalesReturnCustomer
    | SalesReturnCustomer[]
    | null;

  sales_order:
    | SalesReturnSalesOrder
    | SalesReturnSalesOrder[]
    | null;

  inventory_transaction:
    | SalesReturnInventoryTransaction
    | SalesReturnInventoryTransaction[]
    | null;

  credit_journal:
    | SalesReturnJournalReference
    | SalesReturnJournalReference[]
    | null;

  inventory_journal:
    | SalesReturnJournalReference
    | SalesReturnJournalReference[]
    | null;
}

interface SalesReturnItemDatabaseRow
  extends SalesReturnItemRow {
  product:
    | SalesReturnProduct
    | SalesReturnProduct[]
    | null;

  warehouse:
    | SalesReturnWarehouse
    | SalesReturnWarehouse[]
    | null;
}

/* =========================================================
 * Helpers
 * ========================================================= */

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined,
): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizePage(
  page?: number,
): number {
  if (
    !Number.isInteger(page) ||
    !page ||
    page < 1
  ) {
    return 1;
  }

  return page;
}

function normalizePageSize(
  pageSize?: number,
): number {
  if (
    !Number.isInteger(pageSize) ||
    !pageSize ||
    pageSize < 1
  ) {
    return 25;
  }

  return Math.min(
    pageSize,
    100,
  );
}

function sanitizeSearchTerm(
  value: string,
): string {
  return value
    .trim()
    .replace(
      /[%(),]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    );
}

function mapSalesReturnRow(
  row: SalesReturnRow,
): SalesReturn {
  return {
    id:
      row.id,

    return_number:
      row.return_number,

    sales_order_id:
      row.sales_order_id,

    customer_id:
      row.customer_id,

    return_date:
      row.return_date,

    posting_date:
      row.posting_date,

    status:
      row.status as SalesReturnStatus,

    reason:
      row.reason,

    notes:
      row.notes,

    currency_code:
      row.currency_code,

    exchange_rate:
      Number(
        row.exchange_rate,
      ),

    subtotal:
      Number(
        row.subtotal,
      ),

    discount_amount:
      Number(
        row.discount_amount,
      ),

    net_amount:
      Number(
        row.net_amount,
      ),

    tax_amount:
      Number(
        row.tax_amount,
      ),

    grand_total:
      Number(
        row.grand_total,
      ),

    inventory_transaction_id:
      row.inventory_transaction_id,

    credit_journal_entry_id:
      row.credit_journal_entry_id,

    inventory_journal_entry_id:
      row.inventory_journal_entry_id,

    approved_at:
      row.approved_at,

    approved_by:
      row.approved_by,

    received_at:
      row.received_at,

    received_by:
      row.received_by,

    posted_at:
      row.posted_at,

    posted_by:
      row.posted_by,

    cancelled_at:
      row.cancelled_at,

    cancelled_by:
      row.cancelled_by,

    cancellation_reason:
      row.cancellation_reason,

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

function mapSalesReturnItemRow(
  row: SalesReturnItemRow,
): SalesReturnItem {
  return {
    id:
      row.id,

    sales_return_id:
      row.sales_return_id,

    line_number:
      row.line_number,

    sales_order_item_id:
      row.sales_order_item_id,

    delivery_order_item_id:
      row.delivery_order_item_id,

    product_id:
      row.product_id,

    warehouse_id:
      row.warehouse_id,

    sku:
      row.sku,

    item_name:
      row.item_name,

    unit_id:
      row.unit_id,

    quantity_returned:
      Number(
        row.quantity_returned,
      ),

    unit_price:
      Number(
        row.unit_price,
      ),

    discount_percentage:
      Number(
        row.discount_percentage,
      ),

    discount_amount:
      Number(
        row.discount_amount,
      ),

    tax_percentage:
      Number(
        row.tax_percentage,
      ),

    tax_amount:
      Number(
        row.tax_amount,
      ),

    line_subtotal:
      Number(
        row.line_subtotal,
      ),

    line_net:
      Number(
        row.line_net,
      ),

    line_total:
      Number(
        row.line_total,
      ),

    original_unit_cost:
      Number(
        row.original_unit_cost,
      ),

    return_cost:
      Number(
        row.return_cost ?? 0,
      ),

    condition:
      row.condition,

    return_reason:
      row.return_reason,

    notes:
      row.notes,

    created_at:
      row.created_at,

    updated_at:
      row.updated_at,
  };
}

/* =========================================================
 * List Operations
 * ========================================================= */

export async function getSalesReturnPage({
  search,
  status,
  customerId,
  salesOrderId,
  dateFrom,
  dateTo,
  page,
  pageSize,
}: GetSalesReturnsInput = {}): Promise<GetSalesReturnsResult> {
  const supabase =
    await createClient();

  const currentPage =
    normalizePage(
      page,
    );

  const currentPageSize =
    normalizePageSize(
      pageSize,
    );

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

  let query =
    supabase
      .from(
        "sales_returns",
      )
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
          sales_order:sales_orders (
            id,
            order_number,
            order_date,
            status,
            fulfilment_status,
            payment_status,
            currency_code,
            grand_total,
            paid_amount,
            balance_due
          ),
          inventory_transaction:inventory_transactions!sales_returns_inventory_transaction_id_fkey (
            id,
            transaction_number,
            transaction_type,
            status,
            transaction_date
          ),
          credit_journal:gl_journal_entries!sales_returns_credit_journal_entry_id_fkey (
            id,
            journal_number,
            journal_date,
            posting_date,
            status,
            source_type,
            source_number
          ),
          inventory_journal:gl_journal_entries!sales_returns_inventory_journal_entry_id_fkey (
            id,
            journal_number,
            journal_date,
            posting_date,
            status,
            source_type,
            source_number
          )
        `,
        {
          count:
            "exact",
        },
      );

  if (
    status &&
    status !==
      "all"
  ) {
    query =
      query.eq(
        "status",
        status,
      );
  }

  if (
    customerId?.trim()
  ) {
    query =
      query.eq(
        "customer_id",
        customerId.trim(),
      );
  }

  if (
    salesOrderId?.trim()
  ) {
    query =
      query.eq(
        "sales_order_id",
        salesOrderId.trim(),
      );
  }

  if (dateFrom) {
    query =
      query.gte(
        "return_date",
        dateFrom,
      );
  }

  if (dateTo) {
    query =
      query.lte(
        "return_date",
        dateTo,
      );
  }

  if (searchTerm) {
    query =
      query.or(
        [
          `return_number.ilike.%${searchTerm}%`,
          `reason.ilike.%${searchTerm}%`,
        ].join(
          ",",
        ),
      );
  }

  const {
    data,
    error,
    count,
  } =
    await query
      .order(
        "return_date",
        {
          ascending:
            false,
        },
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .range(
        rangeStart,
        rangeEnd,
      );

  if (error) {
    throw new Error(
      `Unable to load Sales Returns: ${error.message}`,
    );
  }

  const rows =
    (data ?? []) as unknown as
      SalesReturnListDatabaseRow[];

  const totalCount =
    count ?? 0;

  return {
    data:
      rows.map(
        (row) => ({
          ...mapSalesReturnRow(
            row,
          ),

          customer:
            getSingleRelation(
              row.customer,
            ),

          sales_order:
            getSingleRelation(
              row.sales_order,
            ),

          inventory_transaction:
            getSingleRelation(
              row.inventory_transaction,
            ),

          credit_journal:
            getSingleRelation(
              row.credit_journal,
            ),

          inventory_journal:
            getSingleRelation(
              row.inventory_journal,
            ),
        }),
      ),

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
 * Single Return
 * ========================================================= */

export async function getSalesReturnById(
  salesReturnId: string,
): Promise<
  | (
      SalesReturn & {
        items: SalesReturnItem[];
      }
    )
  | null
> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "sales_returns",
      )
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
          sales_order:sales_orders (
            id,
            order_number,
            order_date,
            status,
            fulfilment_status,
            payment_status,
            currency_code,
            grand_total,
            paid_amount,
            balance_due
          ),
          inventory_transaction:inventory_transactions!sales_returns_inventory_transaction_id_fkey (
            id,
            transaction_number,
            transaction_type,
            status,
            transaction_date
          ),
          credit_journal:gl_journal_entries!sales_returns_credit_journal_entry_id_fkey (
            id,
            journal_number,
            journal_date,
            posting_date,
            status,
            source_type,
            source_number
          ),
          inventory_journal:gl_journal_entries!sales_returns_inventory_journal_entry_id_fkey (
            id,
            journal_number,
            journal_date,
            posting_date,
            status,
            source_type,
            source_number
          ),
          sales_return_items (
            *,
            product:products (
              id,
              name,
              sku
            ),
            warehouse:warehouses (
              id,
              code,
              name
            )
          )
        `,
      )
      .eq(
        "id",
        salesReturnId,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load Sales Return: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  const row =
    data as unknown as
      SalesReturnListDatabaseRow & {
        sales_return_items:
          SalesReturnItemDatabaseRow[];
      };

  return {
    ...mapSalesReturnRow(
      row,
    ),

    customer:
      getSingleRelation(
        row.customer,
      ),

    sales_order:
      getSingleRelation(
        row.sales_order,
      ),

    inventory_transaction:
      getSingleRelation(
        row.inventory_transaction,
      ),

    credit_journal:
      getSingleRelation(
        row.credit_journal,
      ),

    inventory_journal:
      getSingleRelation(
        row.inventory_journal,
      ),

    items:
      (
        row.sales_return_items ??
        []
      )
        .map(
          (item) => ({
            ...mapSalesReturnItemRow(
              item,
            ),

            product:
              getSingleRelation(
                item.product,
              ),

            warehouse:
              getSingleRelation(
                item.warehouse,
              ),
          }),
        )
        .sort(
          (
            left,
            right,
          ) =>
            left.line_number -
            right.line_number,
        ),
  };
}

/* =========================================================
 * Summary Helpers
 * ========================================================= */

async function countSalesReturns() {
  const supabase =
    await createClient();

  return supabase
    .from(
      "sales_returns",
    )
    .select(
      "id",
      {
        count:
          "exact",
        head:
          true,
      },
    );
}

async function countSalesReturnsByStatus(
  status: SalesReturnStatus,
) {
  const supabase =
    await createClient();

  return supabase
    .from(
      "sales_returns",
    )
    .select(
      "id",
      {
        count:
          "exact",
        head:
          true,
      },
    )
    .eq(
      "status",
      status,
    );
}

/* =========================================================
 * Summary
 * ========================================================= */

export async function getSalesReturnSummary(): Promise<SalesReturnSummary> {
  const supabase =
    await createClient();

  const [
    totalResult,
    draftResult,
    approvedResult,
    receivedResult,
    postedResult,
    cancelledResult,
    valueResult,
    postedValueResult,
  ] =
    await Promise.all([
      countSalesReturns(),

      countSalesReturnsByStatus(
        "draft",
      ),

      countSalesReturnsByStatus(
        "approved",
      ),

      countSalesReturnsByStatus(
        "received",
      ),

      countSalesReturnsByStatus(
        "posted",
      ),

      countSalesReturnsByStatus(
        "cancelled",
      ),

      supabase
        .from(
          "sales_returns",
        )
        .select(
          "grand_total",
        )
        .neq(
          "status",
          "cancelled",
        ),

      supabase
        .from(
          "sales_returns",
        )
        .select(
          "grand_total",
        )
        .eq(
          "status",
          "posted",
        ),
    ]);

  const firstError =
    totalResult.error ??
    draftResult.error ??
    approvedResult.error ??
    receivedResult.error ??
    postedResult.error ??
    cancelledResult.error ??
    valueResult.error ??
    postedValueResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load Sales Return summary: ${firstError.message}`,
    );
  }

  const totalReturnValue =
    (
      valueResult.data ??
      []
    ).reduce(
      (
        total,
        row,
      ) =>
        total +
        Number(
          row.grand_total,
        ),
      0,
    );

  const postedReturnValue =
    (
      postedValueResult.data ??
      []
    ).reduce(
      (
        total,
        row,
      ) =>
        total +
        Number(
          row.grand_total,
        ),
      0,
    );

  return {
    total:
      totalResult.count ??
      0,

    draft:
      draftResult.count ??
      0,

    approved:
      approvedResult.count ??
      0,

    received:
      receivedResult.count ??
      0,

    posted:
      postedResult.count ??
      0,

    cancelled:
      cancelledResult.count ??
      0,

    totalReturnValue,

    postedReturnValue,

    /*
     * Approved returns are waiting for physical inventory
     * receipt.
     */
    awaitingInventory:
      approvedResult.count ??
      0,

    /*
     * Received returns already restored inventory but are
     * waiting for final GL posting.
     */
    awaitingGlPosting:
      receivedResult.count ??
      0,
  };
}

/* =========================================================
 * New Sales Return — Eligible Delivered Lines
 * ========================================================= */

export interface SalesReturnEligibleOrder {
  id: string;
  orderNumber: string;
  orderDate: string;

  customerId: string;
  customerNumber: string;
  customerName: string;

  currencyCode: string;

  lines: SalesReturnEligibleLine[];
}

export interface SalesReturnEligibleLine {
  salesOrderItemId: string;
  deliveryOrderItemId: string;

  salesOrderLineNumber: number;
  deliveryLineNumber: number;

  productId: string;

  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;

  sku: string | null;
  itemName: string;

  quantityOrdered: number;
  quantityFulfilled: number;

  quantityDispatched: number;
  quantityDelivered: number;

  quantityAlreadyReturned: number;
  quantityReturnable: number;

  unitPrice: number;

  discountPercentage: number;
  discountAmount: number;

  taxPercentage: number;
  taxAmount: number;

  lineSubtotal: number;
  lineTotal: number;
}

/* =========================================================
 * Database Loader Shapes
 * ========================================================= */

interface EligibleSalesOrderRow {
  id: string;
  order_number: string;
  order_date: string;

  customer_id: string;
  currency_code: string;

  customer:
    | {
        id: string;
        customer_number: string;
        display_name: string;
      }
    | {
        id: string;
        customer_number: string;
        display_name: string;
      }[]
    | null;
}

interface EligibleSalesOrderItemRow {
  id: string;

  sales_order_id: string;

  line_number: number;

  product_id: string | null;
  warehouse_id: string | null;

  sku: string | null;
  item_name: string;

  quantity: number;
  quantity_fulfilled: number;

  unit_price: number;

  discount_percentage: number;
  discount_amount: number;

  tax_percentage: number;
  tax_amount: number;

  line_subtotal: number;
  line_total: number;
}

interface EligibleDeliveryItemRow {
  id: string;

  sales_order_item_id: string;

  line_number: number;

  product_id: string;
  warehouse_id: string;

  dispatched_quantity: number;
  delivered_quantity: number;

  warehouse:
    | {
        id: string;
        code: string;
        name: string;
      }
    | {
        id: string;
        code: string;
        name: string;
      }[]
    | null;
}

interface ExistingReturnQuantityRow {
  delivery_order_item_id: string;
  quantity_returned: number;

  sales_return:
    | {
        status: string;
      }
    | {
        status: string;
      }[]
    | null;
}

/* =========================================================
 * Eligible Return Orders
 * ========================================================= */

export async function getEligibleSalesReturnOrders(): Promise<
  SalesReturnEligibleOrder[]
> {
  const supabase =
    await createClient();

  /*
   * Load Sales Orders that have actually fulfilled stock.
   *
   * We don't rely only on header status because an order may
   * be partially fulfilled.
   */

  const {
    data: orderItemData,
    error: orderItemError,
  } =
    await supabase
      .from("sales_order_items")
      .select(`
        id,
        sales_order_id,
        line_number,
        product_id,
        warehouse_id,
        sku,
        item_name,
        quantity,
        quantity_fulfilled,
        unit_price,
        discount_percentage,
        discount_amount,
        tax_percentage,
        tax_amount,
        line_subtotal,
        line_total
      `)
      .gt(
        "quantity_fulfilled",
        0,
      )
      .not(
        "product_id",
        "is",
        null,
      );

  if (orderItemError) {
    throw new Error(
      `Unable to load fulfilled Sales Order items: ${orderItemError.message}`,
    );
  }

  const orderItems =
    (
      orderItemData ??
      []
    ) as EligibleSalesOrderItemRow[];

  if (
    orderItems.length ===
    0
  ) {
    return [];
  }

  const salesOrderIds =
    Array.from(
      new Set(
        orderItems.map(
          (item) =>
            item.sales_order_id,
        ),
      ),
    );

  const salesOrderItemIds =
    orderItems.map(
      (item) =>
        item.id,
    );

  /* =======================================================
   * Load Sales Order Headers
   * ======================================================= */

  const {
    data: salesOrderData,
    error: salesOrderError,
  } =
    await supabase
      .from("sales_orders")
      .select(`
        id,
        order_number,
        order_date,
        customer_id,
        currency_code,
        customer:customers (
          id,
          customer_number,
          display_name
        )
      `)
      .in(
        "id",
        salesOrderIds,
      )
      .neq(
        "status",
        "cancelled",
      )
      .order(
        "order_date",
        {
          ascending:
            false,
        },
      );

  if (salesOrderError) {
    throw new Error(
      `Unable to load eligible Sales Orders: ${salesOrderError.message}`,
    );
  }

  const salesOrders =
    (
      salesOrderData ??
      []
    ) as unknown as EligibleSalesOrderRow[];

  /* =======================================================
   * Load Delivery Lines
   * ======================================================= */

  const {
    data: deliveryData,
    error: deliveryError,
  } =
    await supabase
      .from(
        "delivery_order_items",
      )
      .select(`
        id,
        sales_order_item_id,
        line_number,
        product_id,
        warehouse_id,
        dispatched_quantity,
        delivered_quantity,
        warehouse:warehouses (
          id,
          code,
          name
        )
      `)
      .in(
        "sales_order_item_id",
        salesOrderItemIds,
      )
      .gt(
        "dispatched_quantity",
        0,
      );

  if (deliveryError) {
    throw new Error(
      `Unable to load delivered Sales Order lines: ${deliveryError.message}`,
    );
  }

  const deliveryItems =
    (
      deliveryData ??
      []
    ) as unknown as EligibleDeliveryItemRow[];

  if (
    deliveryItems.length ===
    0
  ) {
    return [];
  }

  const deliveryItemIds =
    deliveryItems.map(
      (item) =>
        item.id,
    );

  /* =======================================================
   * Load Existing Active Returns
   *
   * Draft, approved, received and posted returns consume the
   * returnable quantity.
   *
   * Cancelled returns do not.
   * ======================================================= */

  const {
    data: existingReturnData,
    error: existingReturnError,
  } =
    await supabase
      .from(
        "sales_return_items",
      )
      .select(`
        delivery_order_item_id,
        quantity_returned,
        sales_return:sales_returns!inner (
          status
        )
      `)
      .in(
        "delivery_order_item_id",
        deliveryItemIds,
      )
      .neq(
        "sales_return.status",
        "cancelled",
      );

  if (existingReturnError) {
    throw new Error(
      `Unable to load existing Sales Return quantities: ${existingReturnError.message}`,
    );
  }

  const existingReturns =
    (
      existingReturnData ??
      []
    ) as unknown as ExistingReturnQuantityRow[];

  /* =======================================================
   * Aggregate Already-Returned Quantity
   * ======================================================= */

  const returnedByDeliveryItem =
    new Map<
      string,
      number
    >();

  for (
    const existingReturn
    of existingReturns
  ) {
    returnedByDeliveryItem.set(
      existingReturn.delivery_order_item_id,

      (
        returnedByDeliveryItem.get(
          existingReturn.delivery_order_item_id,
        ) ??
        0
      ) +
        Number(
          existingReturn.quantity_returned,
        ),
    );
  }

  /* =======================================================
   * Lookup Maps
   * ======================================================= */

  const orderItemById =
    new Map(
      orderItems.map(
        (item) => [
          item.id,
          item,
        ],
      ),
    );

  const linesBySalesOrder =
    new Map<
      string,
      SalesReturnEligibleLine[]
    >();

  /* =======================================================
   * Build Returnable Delivery Lines
   * ======================================================= */

  for (
    const deliveryItem
    of deliveryItems
  ) {
    const salesOrderItem =
      orderItemById.get(
        deliveryItem.sales_order_item_id,
      );

    if (
      !salesOrderItem ||
      !salesOrderItem.product_id
    ) {
      continue;
    }

    const alreadyReturned =
      returnedByDeliveryItem.get(
        deliveryItem.id,
      ) ??
      0;

    /*
     * The RPC validates against the original sales_issue.
     * For the UI display, dispatched quantity is our closest
     * operational representation of that issue quantity.
     */

    const issuedQuantity =
      Number(
        deliveryItem.dispatched_quantity,
      );

    const returnableQuantity =
      Math.max(
        issuedQuantity -
          alreadyReturned,
        0,
      );

    if (
      returnableQuantity <=
      0
    ) {
      continue;
    }

    const warehouse =
      getSingleRelation(
        deliveryItem.warehouse,
      );

    if (!warehouse) {
      continue;
    }

    const line:
      SalesReturnEligibleLine = {
      salesOrderItemId:
        salesOrderItem.id,

      deliveryOrderItemId:
        deliveryItem.id,

      salesOrderLineNumber:
        salesOrderItem.line_number,

      deliveryLineNumber:
        deliveryItem.line_number,

      productId:
        salesOrderItem.product_id,

      warehouseId:
        deliveryItem.warehouse_id,

      warehouseCode:
        warehouse.code,

      warehouseName:
        warehouse.name,

      sku:
        salesOrderItem.sku,

      itemName:
        salesOrderItem.item_name,

      quantityOrdered:
        Number(
          salesOrderItem.quantity,
        ),

      quantityFulfilled:
        Number(
          salesOrderItem.quantity_fulfilled,
        ),

      quantityDispatched:
        Number(
          deliveryItem.dispatched_quantity,
        ),

      quantityDelivered:
        Number(
          deliveryItem.delivered_quantity,
        ),

      quantityAlreadyReturned:
        alreadyReturned,

      quantityReturnable:
        returnableQuantity,

      unitPrice:
        Number(
          salesOrderItem.unit_price,
        ),

      discountPercentage:
        Number(
          salesOrderItem.discount_percentage,
        ),

      discountAmount:
        Number(
          salesOrderItem.discount_amount,
        ),

      taxPercentage:
        Number(
          salesOrderItem.tax_percentage,
        ),

      taxAmount:
        Number(
          salesOrderItem.tax_amount,
        ),

      lineSubtotal:
        Number(
          salesOrderItem.line_subtotal,
        ),

      lineTotal:
        Number(
          salesOrderItem.line_total,
        ),
    };

    const existingLines =
      linesBySalesOrder.get(
        salesOrderItem.sales_order_id,
      ) ??
      [];

    existingLines.push(
      line,
    );

    linesBySalesOrder.set(
      salesOrderItem.sales_order_id,
      existingLines,
    );
  }

  /* =======================================================
   * Build Eligible Order Models
   * ======================================================= */

  return salesOrders
    .map(
      (
        salesOrder,
      ):
        | SalesReturnEligibleOrder
        | null => {
        const lines =
          (
            linesBySalesOrder.get(
              salesOrder.id,
            ) ??
            []
          ).sort(
            (
              left,
              right,
            ) =>
              left.salesOrderLineNumber -
                right.salesOrderLineNumber ||
              left.deliveryLineNumber -
                right.deliveryLineNumber,
          );

        if (
          lines.length ===
          0
        ) {
          return null;
        }

        const customer =
          getSingleRelation(
            salesOrder.customer,
          );

        if (!customer) {
          return null;
        }

        return {
          id:
            salesOrder.id,

          orderNumber:
            salesOrder.order_number,

          orderDate:
            salesOrder.order_date,

          customerId:
            salesOrder.customer_id,

          customerNumber:
            customer.customer_number,

          customerName:
            customer.display_name,

          currencyCode:
            salesOrder.currency_code,

          lines,
        };
      },
    )
    .filter(
      (
        salesOrder,
      ): salesOrder is SalesReturnEligibleOrder =>
        salesOrder !==
        null,
    );
}