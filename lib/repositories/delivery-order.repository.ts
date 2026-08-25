import type { Database, Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

/* =========================================================
 * Database Types
 * ========================================================= */

type DeliveryOrderRow =
  Database["public"]["Tables"]["delivery_orders"]["Row"];

type DeliveryOrderUpdate =
  Database["public"]["Tables"]["delivery_orders"]["Update"];

type DeliveryOrderItemRow =
  Database["public"]["Tables"]["delivery_order_items"]["Row"];

type DeliveryOrderItemUpdate =
  Database["public"]["Tables"]["delivery_order_items"]["Update"];

/* =========================================================
 * Strict Business Types
 * ========================================================= */

export type DeliveryOrderStatus =
  | "draft"
  | "picking"
  | "picked"
  | "packing"
  | "packed"
  | "dispatched"
  | "delivered"
  | "cancelled";

export type DeliveryOrderPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export type DeliveryMethod =
  | "company_delivery"
  | "customer_pickup"
  | "courier"
  | "freight"
  | "export_shipment"
  | "dropship"
  | "other";

/* =========================================================
 * Related Display Models
 * ========================================================= */

export interface DeliveryOrderCustomer {
  id: string;
  customer_number: string;
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
}

export interface DeliveryOrderWarehouse {
  id: string;
  code: string;
  name: string;
}

export interface DeliveryOrderShippingAddress {
  id: string;
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

export interface DeliveryOrderSalesOrderReference {
  id: string;
  order_number: string;
  order_date: string;
  status: string;
  fulfilment_status: string;
  currency_code: string;
  grand_total: number;
}

export interface DeliveryOrderProduct {
  id: string;
  name: string;
  sku: string | null;
}

export interface DeliveryOrderUnit {
  id: string;
  name: string;
  short_name: string;
}

/* =========================================================
 * Main Models
 * ========================================================= */

export interface DeliveryOrder {
  id: string;

  delivery_number: string;

  sales_order_id: string;
  customer_id: string;
  shipping_address_id: string | null;
  warehouse_id: string;

  delivery_date: string;
  requested_delivery_date: string | null;
  expected_delivery_date: string | null;
  dispatched_date: string | null;
  delivered_date: string | null;

  status: DeliveryOrderStatus;
  priority: DeliveryOrderPriority;
  delivery_method: DeliveryMethod;

  external_reference: string | null;
  customer_reference: string | null;

  tracking_number: string | null;
  carrier_name: string | null;

  vehicle_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;

  packing_notes: string | null;
  delivery_notes: string | null;
  internal_notes: string | null;

  picked_at: string | null;
  packed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;

  picked_by: string | null;
  packed_by: string | null;
  dispatched_by: string | null;
  delivered_by: string | null;
  cancelled_by: string | null;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;
}

export interface DeliveryOrderItem {
  id: string;

  delivery_order_id: string;
  sales_order_item_id: string;

  line_number: number;

  product_id: string | null;
  unit_id: string | null;
  warehouse_id: string;

  sku: string | null;
  item_name: string;
  description: string | null;

  ordered_quantity: number;
  previously_delivered_quantity: number;
  delivery_quantity: number;

  picked_quantity: number;
  packed_quantity: number;
  dispatched_quantity: number;
  delivered_quantity: number;

  remaining_quantity: number;

  unit_cost: number;

  batch_number: string | null;
  lot_number: string | null;
  serial_number: string | null;

  manufacturing_date: string | null;
  expiry_date: string | null;

  line_notes: string | null;

  created_at: string;
  updated_at: string;

  product: DeliveryOrderProduct | null;
  unit: DeliveryOrderUnit | null;
  warehouse: DeliveryOrderWarehouse | null;
}

export interface DeliveryOrderListRow
  extends DeliveryOrder {
  customer: DeliveryOrderCustomer | null;
  warehouse: DeliveryOrderWarehouse | null;
  sales_order:
  | DeliveryOrderSalesOrderReference
  | null;

  item_count: number;
  planned_quantity: number;
  dispatched_quantity: number;
  delivered_quantity: number;
}

export interface DeliveryOrderDetails
  extends DeliveryOrder {
  customer: DeliveryOrderCustomer | null;

  shipping_address:
  | DeliveryOrderShippingAddress
  | null;

  warehouse: DeliveryOrderWarehouse | null;

  sales_order:
  | DeliveryOrderSalesOrderReference
  | null;

  items: DeliveryOrderItem[];
}

/* =========================================================
 * List and Summary Models
 * ========================================================= */

export interface GetDeliveryOrdersInput {
  search?: string;

  status?: DeliveryOrderStatus | "all";

  priority?:
  | DeliveryOrderPriority
  | "all";

  deliveryMethod?:
  | DeliveryMethod
  | "all";

  customerId?: string;
  warehouseId?: string;
  salesOrderId?: string;

  dateFrom?: string;
  dateTo?: string;

  page?: number;
  pageSize?: number;
}

export interface GetDeliveryOrdersResult {
  data: DeliveryOrderListRow[];

  count: number;

  page: number;
  pageSize: number;

  totalPages: number;
}

export interface DeliveryOrderSummary {
  total: number;

  draft: number;
  picking: number;
  picked: number;
  packing: number;
  packed: number;
  dispatched: number;
  delivered: number;
  cancelled: number;

  urgent: number;
  expectedToday: number;
  overdue: number;

  plannedQuantity: number;
  dispatchedQuantity: number;
  deliveredQuantity: number;
}

/* =========================================================
 * Deliverable Sales Orders
 * ========================================================= */

export interface DeliverableSalesOrder {
  id: string;
  order_number: string;

  customer_id: string;
  customer_name: string;

  warehouse_id: string;
  warehouse_name: string;

  order_date: string;

  requested_delivery_date: string | null;
  expected_delivery_date: string | null;

  status: string;
  fulfilment_status: string;

  deliverable_line_count: number;
  reserved_quantity: number;
  fulfilled_quantity: number;
  remaining_reserved_quantity: number;
}

/* =========================================================
 * Workflow Results
 * ========================================================= */

export interface DispatchDeliveryOrderResult {
  deliveryOrderId: string;
  salesOrderId: string;

  status: "dispatched";

  fulfilmentStatus: string;

  inventoryTransactionId: string | null;
  inventoryTransactionNumber: string | null;

  lineCount: number;
  dispatchedQuantity: number;

  alreadyDispatched: boolean;
}

/* =========================================================
 * Internal Database Relation Shapes
 * ========================================================= */

interface DeliveryOrderListDatabaseRow
  extends DeliveryOrderRow {
  customer:
  | DeliveryOrderCustomer
  | DeliveryOrderCustomer[]
  | null;

  warehouse:
  | DeliveryOrderWarehouse
  | DeliveryOrderWarehouse[]
  | null;

  sales_order:
  | DeliveryOrderSalesOrderReference
  | DeliveryOrderSalesOrderReference[]
  | null;

  delivery_order_items:
  | Array<{
    delivery_quantity: number;
    dispatched_quantity: number;
    delivered_quantity: number;
  }>
  | null;
}

interface DeliveryOrderItemDatabaseRow
  extends DeliveryOrderItemRow {
  product:
  | DeliveryOrderProduct
  | DeliveryOrderProduct[]
  | null;

  unit:
  | DeliveryOrderUnit
  | DeliveryOrderUnit[]
  | null;

  warehouse:
  | DeliveryOrderWarehouse
  | DeliveryOrderWarehouse[]
  | null;
}

interface DeliveryOrderDetailsDatabaseRow
  extends DeliveryOrderRow {
  customer:
  | DeliveryOrderCustomer
  | DeliveryOrderCustomer[]
  | null;

  shipping_address:
  | DeliveryOrderShippingAddress
  | DeliveryOrderShippingAddress[]
  | null;

  warehouse:
  | DeliveryOrderWarehouse
  | DeliveryOrderWarehouse[]
  | null;

  sales_order:
  | DeliveryOrderSalesOrderReference
  | DeliveryOrderSalesOrderReference[]
  | null;

  delivery_order_items:
  | DeliveryOrderItemDatabaseRow[]
  | null;
}

/* =========================================================
 * General Helpers
 * ========================================================= */

function requireId(
  value: string,
  fieldName: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return normalized;
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

function getSingleRelation<T>(
  relation: T | T[] | null,
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

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

function getToday(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function parseDispatchResult(
  value: Json,
): DispatchDeliveryOrderResult {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Invalid delivery dispatch result.",
    );
  }

  const result =
    value as Record<string, Json>;

  return {
    deliveryOrderId:
      String(
        result.deliveryOrderId ?? "",
      ),

    salesOrderId:
      String(
        result.salesOrderId ?? "",
      ),

    status: "dispatched",

    fulfilmentStatus:
      String(
        result.fulfilmentStatus ??
        "",
      ),

    inventoryTransactionId:
      typeof result.inventoryTransactionId ===
        "string"
        ? result.inventoryTransactionId
        : null,

    inventoryTransactionNumber:
      typeof result.inventoryTransactionNumber ===
        "string"
        ? result.inventoryTransactionNumber
        : null,

    lineCount:
      Number(
        result.lineCount ?? 0,
      ),

    dispatchedQuantity:
      Number(
        result.dispatchedQuantity ??
        0,
      ),

    alreadyDispatched:
      Boolean(
        result.alreadyDispatched,
      ),
  };
}

/* =========================================================
 * Mapping
 * ========================================================= */

function mapDeliveryOrderRow(
  row: DeliveryOrderRow,
): DeliveryOrder {
  return {
    id: row.id,

    delivery_number:
      row.delivery_number,

    sales_order_id:
      row.sales_order_id,

    customer_id:
      row.customer_id,

    shipping_address_id:
      row.shipping_address_id,

    warehouse_id:
      row.warehouse_id,

    delivery_date:
      row.delivery_date,

    requested_delivery_date:
      row.requested_delivery_date,

    expected_delivery_date:
      row.expected_delivery_date,

    dispatched_date:
      row.dispatched_date,

    delivered_date:
      row.delivered_date,

    status:
      row.status as
      DeliveryOrderStatus,

    priority:
      row.priority as
      DeliveryOrderPriority,

    delivery_method:
      row.delivery_method as
      DeliveryMethod,

    external_reference:
      row.external_reference,

    customer_reference:
      row.customer_reference,

    tracking_number:
      row.tracking_number,

    carrier_name:
      row.carrier_name,

    vehicle_number:
      row.vehicle_number,

    driver_name:
      row.driver_name,

    driver_phone:
      row.driver_phone,

    packing_notes:
      row.packing_notes,

    delivery_notes:
      row.delivery_notes,

    internal_notes:
      row.internal_notes,

    picked_at:
      row.picked_at,

    packed_at:
      row.packed_at,

    dispatched_at:
      row.dispatched_at,

    delivered_at:
      row.delivered_at,

    cancelled_at:
      row.cancelled_at,

    picked_by:
      row.picked_by,

    packed_by:
      row.packed_by,

    dispatched_by:
      row.dispatched_by,

    delivered_by:
      row.delivered_by,

    cancelled_by:
      row.cancelled_by,

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

function mapDeliveryOrderItem(
  row: DeliveryOrderItemDatabaseRow,
): DeliveryOrderItem {
  return {
    id: row.id,

    delivery_order_id:
      row.delivery_order_id,

    sales_order_item_id:
      row.sales_order_item_id,

    line_number:
      row.line_number,

    product_id:
      row.product_id,

    unit_id:
      row.unit_id,

    warehouse_id:
      row.warehouse_id,

    sku: row.sku,

    item_name:
      row.item_name,

    description:
      row.description,

    ordered_quantity:
      Number(
        row.ordered_quantity,
      ),

    previously_delivered_quantity:
      Number(
        row.previously_delivered_quantity,
      ),

    delivery_quantity:
      Number(
        row.delivery_quantity,
      ),

    picked_quantity:
      Number(
        row.picked_quantity,
      ),

    packed_quantity:
      Number(
        row.packed_quantity,
      ),

    dispatched_quantity:
      Number(
        row.dispatched_quantity,
      ),

    delivered_quantity:
      Number(
        row.delivered_quantity,
      ),

    remaining_quantity:
      Number(
        row.remaining_quantity ?? 0,
      ),

    unit_cost:
      Number(
        row.unit_cost,
      ),

    batch_number:
      row.batch_number,

    lot_number:
      row.lot_number,

    serial_number:
      row.serial_number,

    manufacturing_date:
      row.manufacturing_date,

    expiry_date:
      row.expiry_date,

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
 * Delivery Order List
 * ========================================================= */

export async function getDeliveryOrderPage(
  input: GetDeliveryOrdersInput = {},
): Promise<GetDeliveryOrdersResult> {
  const page =
    normalizePage(input.page);

  const pageSize =
    normalizePageSize(
      input.pageSize,
    );

  const from =
    (page - 1) * pageSize;

  const to =
    from + pageSize - 1;

  const supabase =
    await createClient();

  let query = supabase
    .from("delivery_orders")
    .select(
      `
        *,
        customer:customers (
          id,
          customer_number,
          display_name,
          company_name,
          email,
          phone
        ),
        warehouse:warehouses (
          id,
          code,
          name
        ),
        sales_order:sales_orders (
          id,
          order_number,
          order_date,
          status,
          fulfilment_status,
          currency_code,
          grand_total
        ),
        delivery_order_items (
          delivery_quantity,
          dispatched_quantity,
          delivered_quantity
        )
      `,
      {
        count: "exact",
      },
    );

  if (
    input.status &&
    input.status !== "all"
  ) {
    query = query.eq(
      "status",
      input.status,
    );
  }

  if (
    input.priority &&
    input.priority !== "all"
  ) {
    query = query.eq(
      "priority",
      input.priority,
    );
  }

  if (
    input.deliveryMethod &&
    input.deliveryMethod !== "all"
  ) {
    query = query.eq(
      "delivery_method",
      input.deliveryMethod,
    );
  }

  if (input.customerId?.trim()) {
    query = query.eq(
      "customer_id",
      input.customerId.trim(),
    );
  }

  if (input.warehouseId?.trim()) {
    query = query.eq(
      "warehouse_id",
      input.warehouseId.trim(),
    );
  }

  if (input.salesOrderId?.trim()) {
    query = query.eq(
      "sales_order_id",
      input.salesOrderId.trim(),
    );
  }

  if (input.dateFrom) {
    query = query.gte(
      "delivery_date",
      input.dateFrom,
    );
  }

  if (input.dateTo) {
    query = query.lte(
      "delivery_date",
      input.dateTo,
    );
  }

  if (input.search?.trim()) {
    const search =
      sanitizeSearchTerm(
        input.search,
      );

    if (search) {
      query = query.or(
        [
          `delivery_number.ilike.%${search}%`,
          `external_reference.ilike.%${search}%`,
          `customer_reference.ilike.%${search}%`,
          `tracking_number.ilike.%${search}%`,
          `carrier_name.ilike.%${search}%`,
          `driver_name.ilike.%${search}%`,
          `vehicle_number.ilike.%${search}%`,
        ].join(","),
      );
    }
  }

  const {
    data,
    error,
    count,
  } = await query
    .order("delivery_date", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    })
    .range(from, to);

  if (error) {
    throw new Error(
      `Unable to load delivery orders: ${error.message}`,
    );
  }

  const rows =
    (data ?? []) as
    DeliveryOrderListDatabaseRow[];

  const mapped =
    rows.map((row) => {
      const items =
        row.delivery_order_items ??
        [];

      return {
        ...mapDeliveryOrderRow(row),

        customer:
          getSingleRelation(
            row.customer,
          ),

        warehouse:
          getSingleRelation(
            row.warehouse,
          ),

        sales_order:
          getSingleRelation(
            row.sales_order,
          ),

        item_count:
          items.length,

        planned_quantity:
          items.reduce(
            (total, item) =>
              total +
              Number(
                item.delivery_quantity,
              ),
            0,
          ),

        dispatched_quantity:
          items.reduce(
            (total, item) =>
              total +
              Number(
                item.dispatched_quantity,
              ),
            0,
          ),

        delivered_quantity:
          items.reduce(
            (total, item) =>
              total +
              Number(
                item.delivered_quantity,
              ),
            0,
          ),
      } satisfies DeliveryOrderListRow;
    });

  const totalCount =
    count ?? 0;

  return {
    data: mapped,

    count: totalCount,

    page,
    pageSize,

    totalPages:
      totalCount === 0
        ? 1
        : Math.ceil(
          totalCount /
          pageSize,
        ),
  };
}

/* =========================================================
 * Delivery Order Summary
 * ========================================================= */

export async function getDeliveryOrderSummary():
  Promise<DeliveryOrderSummary> {
  const supabase =
    await createClient();

  const today =
    getToday();

  const [
    totalResult,

    draftResult,
    pickingResult,
    pickedResult,
    packingResult,
    packedResult,
    dispatchedResult,
    deliveredResult,
    cancelledResult,

    urgentResult,
    expectedTodayResult,
    overdueResult,

    quantitiesResult,
  ] = await Promise.all([
    countDeliveryOrders(),

    countDeliveryOrdersByField(
      "status",
      "draft",
    ),

    countDeliveryOrdersByField(
      "status",
      "picking",
    ),

    countDeliveryOrdersByField(
      "status",
      "picked",
    ),

    countDeliveryOrdersByField(
      "status",
      "packing",
    ),

    countDeliveryOrdersByField(
      "status",
      "packed",
    ),

    countDeliveryOrdersByField(
      "status",
      "dispatched",
    ),

    countDeliveryOrdersByField(
      "status",
      "delivered",
    ),

    countDeliveryOrdersByField(
      "status",
      "cancelled",
    ),

    countDeliveryOrdersByField(
      "priority",
      "urgent",
    ),

    supabase
      .from("delivery_orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "expected_delivery_date",
        today,
      )
      .not(
        "status",
        "in",
        '("delivered","cancelled")',
      ),

    supabase
      .from("delivery_orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .lt(
        "expected_delivery_date",
        today,
      )
      .not(
        "status",
        "in",
        '("delivered","cancelled")',
      ),

    supabase
      .from(
        "delivery_order_items",
      )
      .select(`
        delivery_quantity,
        dispatched_quantity,
        delivered_quantity
      `),
  ]);

  const firstError =
    totalResult.error ??
    draftResult.error ??
    pickingResult.error ??
    pickedResult.error ??
    packingResult.error ??
    packedResult.error ??
    dispatchedResult.error ??
    deliveredResult.error ??
    cancelledResult.error ??
    urgentResult.error ??
    expectedTodayResult.error ??
    overdueResult.error ??
    quantitiesResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load delivery order summary: ${firstError.message}`,
    );
  }

  const quantities =
    quantitiesResult.data ?? [];

  const plannedQuantity =
    quantities.reduce(
      (total, item) =>
        total +
        Number(
          item.delivery_quantity,
        ),
      0,
    );

  const dispatchedQuantity =
    quantities.reduce(
      (total, item) =>
        total +
        Number(
          item.dispatched_quantity,
        ),
      0,
    );

  const deliveredQuantity =
    quantities.reduce(
      (total, item) =>
        total +
        Number(
          item.delivered_quantity,
        ),
      0,
    );

  return {
    total:
      totalResult.count ?? 0,

    draft:
      draftResult.count ?? 0,

    picking:
      pickingResult.count ?? 0,

    picked:
      pickedResult.count ?? 0,

    packing:
      packingResult.count ?? 0,

    packed:
      packedResult.count ?? 0,

    dispatched:
      dispatchedResult.count ?? 0,

    delivered:
      deliveredResult.count ?? 0,

    cancelled:
      cancelledResult.count ?? 0,

    urgent:
      urgentResult.count ?? 0,

    expectedToday:
      expectedTodayResult.count ??
      0,

    overdue:
      overdueResult.count ?? 0,

    plannedQuantity,
    dispatchedQuantity,
    deliveredQuantity,
  };
}

async function countDeliveryOrders() {
  const supabase =
    await createClient();

  return supabase
    .from("delivery_orders")
    .select("id", {
      count: "exact",
      head: true,
    });
}

async function countDeliveryOrdersByField(
  field:
    | "status"
    | "priority"
    | "delivery_method",
  value: string,
) {
  const supabase =
    await createClient();

  return supabase
    .from("delivery_orders")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(field, value);
}

/* =========================================================
 * Get Delivery Order by ID
 * ========================================================= */

export async function getDeliveryOrderById(
  deliveryOrderId: string,
): Promise<DeliveryOrderDetails | null> {
  const id = requireId(
    deliveryOrderId,
    "Delivery order ID",
  );

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("delivery_orders")
    .select(`
      *,
      customer:customers (
        id,
        customer_number,
        display_name,
        company_name,
        email,
        phone
      ),
      shipping_address:customer_addresses (
        id,
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
      sales_order:sales_orders (
        id,
        order_number,
        order_date,
        status,
        fulfilment_status,
        currency_code,
        grand_total
      ),
      delivery_order_items (
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
    .order(
      "line_number",
      {
        referencedTable:
          "delivery_order_items",
        ascending: true,
      },
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load delivery order: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  const row =
    data as
    DeliveryOrderDetailsDatabaseRow;

  return {
    ...mapDeliveryOrderRow(row),

    customer:
      getSingleRelation(
        row.customer,
      ),

    shipping_address:
      getSingleRelation(
        row.shipping_address,
      ),

    warehouse:
      getSingleRelation(
        row.warehouse,
      ),

    sales_order:
      getSingleRelation(
        row.sales_order,
      ),

    items:
      (
        row.delivery_order_items ??
        []
      ).map(
        mapDeliveryOrderItem,
      ),
  };
}

/* =========================================================
 * Editable Delivery Header
 * ========================================================= */

export interface UpdateDeliveryOrderInput {
  delivery_date?: string;

  requested_delivery_date?:
  | string
  | null;

  expected_delivery_date?:
  | string
  | null;

  priority?:
  DeliveryOrderPriority;

  delivery_method?:
  DeliveryMethod;

  external_reference?:
  | string
  | null;

  customer_reference?:
  | string
  | null;

  tracking_number?:
  | string
  | null;

  carrier_name?:
  | string
  | null;

  vehicle_number?:
  | string
  | null;

  driver_name?:
  | string
  | null;

  driver_phone?:
  | string
  | null;

  packing_notes?:
  | string
  | null;

  delivery_notes?:
  | string
  | null;

  internal_notes?:
  | string
  | null;
}

function normalizeNullableText(
  value:
    | string
    | null
    | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized || null;
}

export async function updateDeliveryOrder(
  deliveryOrderId: string,
  input: UpdateDeliveryOrderInput,
): Promise<DeliveryOrder> {
  const id = requireId(
    deliveryOrderId,
    "Delivery order ID",
  );

  const existing =
    await getDeliveryOrderById(id);

  if (!existing) {
    throw new Error(
      "Delivery order was not found.",
    );
  }

  if (
    existing.status !== "draft"
  ) {
    throw new Error(
      "Only draft delivery orders can be edited.",
    );
  }

  const updateData:
    DeliveryOrderUpdate = {};

  if (
    input.delivery_date !==
    undefined
  ) {
    updateData.delivery_date =
      input.delivery_date;
  }

  if (
    input.requested_delivery_date !==
    undefined
  ) {
    updateData.requested_delivery_date =
      input.requested_delivery_date;
  }

  if (
    input.expected_delivery_date !==
    undefined
  ) {
    updateData.expected_delivery_date =
      input.expected_delivery_date;
  }

  if (
    input.priority !== undefined
  ) {
    updateData.priority =
      input.priority;
  }

  if (
    input.delivery_method !==
    undefined
  ) {
    updateData.delivery_method =
      input.delivery_method;
  }

  updateData.external_reference =
    normalizeNullableText(
      input.external_reference,
    );

  updateData.customer_reference =
    normalizeNullableText(
      input.customer_reference,
    );

  updateData.tracking_number =
    normalizeNullableText(
      input.tracking_number,
    );

  updateData.carrier_name =
    normalizeNullableText(
      input.carrier_name,
    );

  updateData.vehicle_number =
    normalizeNullableText(
      input.vehicle_number,
    );

  updateData.driver_name =
    normalizeNullableText(
      input.driver_name,
    );

  updateData.driver_phone =
    normalizeNullableText(
      input.driver_phone,
    );

  updateData.packing_notes =
    normalizeNullableText(
      input.packing_notes,
    );

  updateData.delivery_notes =
    normalizeNullableText(
      input.delivery_notes,
    );

  updateData.internal_notes =
    normalizeNullableText(
      input.internal_notes,
    );

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("delivery_orders")
    .update(updateData)
    .eq("id", id)
    .eq("status", "draft")
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Unable to update delivery order: ${error.message}`,
    );
  }

  return mapDeliveryOrderRow(
    data,
  );
}

/* =========================================================
 * Editable Delivery Item
 * ========================================================= */

export interface UpdateDeliveryOrderItemInput {
  delivery_quantity?: number;
  picked_quantity?: number;
  packed_quantity?: number;

  batch_number?:
  | string
  | null;

  lot_number?:
  | string
  | null;

  serial_number?:
  | string
  | null;

  manufacturing_date?:
  | string
  | null;

  expiry_date?:
  | string
  | null;

  line_notes?:
  | string
  | null;
}

export async function updateDeliveryOrderItem(
  deliveryOrderId: string,
  deliveryOrderItemId: string,
  input: UpdateDeliveryOrderItemInput,
): Promise<DeliveryOrderItem> {
  const orderId = requireId(
    deliveryOrderId,
    "Delivery order ID",
  );

  const itemId = requireId(
    deliveryOrderItemId,
    "Delivery order item ID",
  );

  const delivery =
    await getDeliveryOrderById(
      orderId,
    );

  if (!delivery) {
    throw new Error(
      "Delivery order was not found.",
    );
  }

  if (
    ![
      "draft",
      "picking",
      "picked",
      "packing",
      "packed",
    ].includes(delivery.status)
  ) {
    throw new Error(
      "This delivery order can no longer be edited.",
    );
  }

  const currentItem =
    delivery.items.find(
      (item) =>
        item.id === itemId,
    );

  if (!currentItem) {
    throw new Error(
      "Delivery order item was not found.",
    );
  }

  const updateData:
    DeliveryOrderItemUpdate = {};

  if (
    input.delivery_quantity !==
    undefined
  ) {
    if (
      !Number.isFinite(
        input.delivery_quantity,
      ) ||
      input.delivery_quantity <= 0
    ) {
      throw new Error(
        "Delivery quantity must be greater than zero.",
      );
    }

    const maxAllowed =
      currentItem
        .ordered_quantity -
      currentItem
        .previously_delivered_quantity;

    if (
      input.delivery_quantity >
      maxAllowed
    ) {
      throw new Error(
        "Delivery quantity exceeds the remaining Sales Order quantity.",
      );
    }

    updateData.delivery_quantity =
      input.delivery_quantity;
  }

  if (
    input.picked_quantity !==
    undefined
  ) {
    const deliveryQuantity =
      input.delivery_quantity ??
      currentItem
        .delivery_quantity;

    if (
      !Number.isFinite(
        input.picked_quantity,
      ) ||
      input.picked_quantity < 0 ||
      input.picked_quantity >
      deliveryQuantity
    ) {
      throw new Error(
        "Picked quantity must be between zero and the delivery quantity.",
      );
    }

    updateData.picked_quantity =
      input.picked_quantity;
  }

  if (
    input.packed_quantity !==
    undefined
  ) {
    const pickedQuantity =
      input.picked_quantity ??
      currentItem
        .picked_quantity;

    if (
      !Number.isFinite(
        input.packed_quantity,
      ) ||
      input.packed_quantity < 0 ||
      input.packed_quantity >
      pickedQuantity
    ) {
      throw new Error(
        "Packed quantity must be between zero and the picked quantity.",
      );
    }

    updateData.packed_quantity =
      input.packed_quantity;
  }

  updateData.batch_number =
    normalizeNullableText(
      input.batch_number,
    );

  updateData.lot_number =
    normalizeNullableText(
      input.lot_number,
    );

  updateData.serial_number =
    normalizeNullableText(
      input.serial_number,
    );

  if (
    input.manufacturing_date !==
    undefined
  ) {
    updateData.manufacturing_date =
      input.manufacturing_date;
  }

  if (
    input.expiry_date !==
    undefined
  ) {
    updateData.expiry_date =
      input.expiry_date;
  }

  if (
    input.manufacturing_date &&
    input.expiry_date &&
    input.expiry_date <
    input.manufacturing_date
  ) {
    throw new Error(
      "Expiry date cannot be earlier than the manufacturing date.",
    );
  }

  updateData.line_notes =
    normalizeNullableText(
      input.line_notes,
    );

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "delivery_order_items",
    )
    .update(updateData)
    .eq("id", itemId)
    .eq(
      "delivery_order_id",
      orderId,
    )
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
      `Unable to update delivery order item: ${error.message}`,
    );
  }

  return mapDeliveryOrderItem(
    data as
    DeliveryOrderItemDatabaseRow,
  );
}

/* =========================================================
 * Deliverable Sales Orders
 * ========================================================= */

interface DeliverableSalesOrderDatabaseRow {
  id: string;
  order_number: string;

  customer_id: string;
  warehouse_id: string | null;

  order_date: string;

  requested_delivery_date: string | null;
  expected_delivery_date: string | null;

  status: string;
  fulfilment_status: string;

  customer:
  | {
    display_name: string;
  }
  | Array<{
    display_name: string;
  }>
  | null;

  warehouse:
  | {
    name: string;
  }
  | Array<{
    name: string;
  }>
  | null;

  sales_order_items:
  | Array<{
    fulfilment_method: string;
    quantity_reserved: number;
    quantity_fulfilled: number;
  }>
  | null;
}

export async function getDeliverableSalesOrders():
  Promise<DeliverableSalesOrder[]> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("sales_orders")
    .select(`
      id,
      order_number,
      customer_id,
      warehouse_id,
      order_date,
      requested_delivery_date,
      expected_delivery_date,
      status,
      fulfilment_status,

      customer:customers (
        display_name
      ),

      warehouse:warehouses (
        name
      ),

      sales_order_items (
        fulfilment_method,
        quantity_reserved,
        quantity_fulfilled
      )
    `)
    .in("status", [
      "confirmed",
      "processing",
      "partially_fulfilled",
    ])
    .not(
      "warehouse_id",
      "is",
      null,
    )
    .order(
      "expected_delivery_date",
      {
        ascending: true,
        nullsFirst: false,
      },
    )
    .order("order_date", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load deliverable sales orders: ${error.message}`,
    );
  }

  const rows =
    (data ?? []) as
    DeliverableSalesOrderDatabaseRow[];

  return rows.flatMap((row) => {
    if (!row.warehouse_id) {
      return [];
    }

    const items =
      row.sales_order_items ??
      [];

    const deliverableItems =
      items.filter(
        (item) =>
          (
            item.fulfilment_method ===
            "stock" ||
            item.fulfilment_method ===
            "local_purchase"
          ) &&
          Number(
            item.quantity_reserved,
          ) > 0,
      );

    const reservedQuantity =
      deliverableItems.reduce(
        (total, item) =>
          total +
          Number(
            item.quantity_reserved,
          ),
        0,
      );

    const fulfilledQuantity =
      deliverableItems.reduce(
        (total, item) =>
          total +
          Number(
            item.quantity_fulfilled,
          ),
        0,
      );

    const remainingReservedQuantity =
      deliverableItems.reduce(
        (total, item) =>
          total +
          Math.max(
            Number(
              item.quantity_reserved,
            ),
            0,
          ),
        0,
      );

    if (
      deliverableItems.length === 0 ||
      remainingReservedQuantity <= 0
    ) {
      return [];
    }

    const customer =
      getSingleRelation(
        row.customer,
      );

    const warehouse =
      getSingleRelation(
        row.warehouse,
      );

    return [
      {
        id: row.id,

        order_number:
          row.order_number,

        customer_id:
          row.customer_id,

        customer_name:
          customer?.display_name ??
          "Unknown customer",

        warehouse_id:
          row.warehouse_id,

        warehouse_name:
          warehouse?.name ??
          "Unknown warehouse",

        order_date:
          row.order_date,

        requested_delivery_date:
          row.requested_delivery_date,

        expected_delivery_date:
          row.expected_delivery_date,

        status:
          row.status,

        fulfilment_status:
          row.fulfilment_status,

        deliverable_line_count:
          deliverableItems.length,

        reserved_quantity:
          reservedQuantity,

        fulfilled_quantity:
          fulfilledQuantity,

        remaining_reserved_quantity:
          remainingReservedQuantity,
      },
    ];
  });
}

/* =========================================================
 * Workflow RPC Helpers
 * ========================================================= */

async function runDeliveryIdWorkflow(
  functionName:
    | "start_delivery_picking_managed"
    | "confirm_delivery_picked_managed"
    | "start_delivery_packing_managed"
    | "confirm_delivery_packed_managed"
    | "mark_delivery_delivered_managed"
    | "cancel_delivery_order_managed",
  deliveryOrderId: string,
  actionLabel: string,
): Promise<string> {
  const id = requireId(
    deliveryOrderId,
    "Delivery order ID",
  );

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    functionName,
    {
      p_delivery_order_id: id,
    },
  );

  if (error) {
    throw new Error(
      `${actionLabel}: ${error.message}`,
    );
  }

  if (
    typeof data !== "string" ||
    !data.trim()
  ) {
    throw new Error(
      `${actionLabel}: The database returned an invalid delivery order ID.`,
    );
  }

  return data;
}

/* =========================================================
 * Create Delivery from Sales Order
 * ========================================================= */

export async function createDeliveryFromSalesOrder(
  salesOrderId: string,
): Promise<DeliveryOrderDetails> {
  const id = requireId(
    salesOrderId,
    "Sales order ID",
  );

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "create_delivery_from_sales_order_managed",
    {
      p_sales_order_id: id,
    },
  );

  if (error) {
    throw new Error(
      `Unable to create delivery order: ${error.message}`,
    );
  }

  if (
    typeof data !== "string" ||
    !data.trim()
  ) {
    throw new Error(
      "Unable to create delivery order: The database returned an invalid delivery ID.",
    );
  }

  const delivery =
    await getDeliveryOrderById(
      data,
    );

  if (!delivery) {
    throw new Error(
      "The delivery order was created but could not be loaded.",
    );
  }

  return delivery;
}

/* =========================================================
 * Start Picking
 * ========================================================= */

export async function startDeliveryPicking(
  deliveryOrderId: string,
): Promise<DeliveryOrderDetails> {
  const id =
    await runDeliveryIdWorkflow(
      "start_delivery_picking_managed",
      deliveryOrderId,
      "Unable to start delivery picking",
    );

  const delivery =
    await getDeliveryOrderById(id);

  if (!delivery) {
    throw new Error(
      "The delivery order was updated but could not be loaded.",
    );
  }

  return delivery;
}

/* =========================================================
 * Confirm Picked
 * ========================================================= */

export async function confirmDeliveryPicked(
  deliveryOrderId: string,
): Promise<DeliveryOrderDetails> {
  const id =
    await runDeliveryIdWorkflow(
      "confirm_delivery_picked_managed",
      deliveryOrderId,
      "Unable to confirm delivery picking",
    );

  const delivery =
    await getDeliveryOrderById(id);

  if (!delivery) {
    throw new Error(
      "The delivery order was updated but could not be loaded.",
    );
  }

  return delivery;
}

/* =========================================================
 * Start Packing
 * ========================================================= */

export async function startDeliveryPacking(
  deliveryOrderId: string,
): Promise<DeliveryOrderDetails> {
  const id =
    await runDeliveryIdWorkflow(
      "start_delivery_packing_managed",
      deliveryOrderId,
      "Unable to start delivery packing",
    );

  const delivery =
    await getDeliveryOrderById(id);

  if (!delivery) {
    throw new Error(
      "The delivery order was updated but could not be loaded.",
    );
  }

  return delivery;
}

/* =========================================================
 * Confirm Packed
 * ========================================================= */

export async function confirmDeliveryPacked(
  deliveryOrderId: string,
): Promise<DeliveryOrderDetails> {
  const id =
    await runDeliveryIdWorkflow(
      "confirm_delivery_packed_managed",
      deliveryOrderId,
      "Unable to confirm delivery packing",
    );

  const delivery =
    await getDeliveryOrderById(id);

  if (!delivery) {
    throw new Error(
      "The delivery order was updated but could not be loaded.",
    );
  }

  return delivery;
}

/* =========================================================
 * Dispatch Delivery
 * ========================================================= */

export async function dispatchDeliveryOrder(
  deliveryOrderId: string,
): Promise<DispatchDeliveryOrderResult> {
  const id = requireId(
    deliveryOrderId,
    "Delivery order ID",
  );

  const supabase =
    await createClient();

  try {
    const {
      data,
      error,
    } = await supabase.rpc(
      "dispatch_delivery_order_atomic_managed",
      {
        p_delivery_order_id: id,
      },
    );

    if (error) {
      throw error;
    }

    return parseDispatchResult(
      data,
    );
  } catch (error) {
    throw new Error(
      `Unable to dispatch delivery order: ${getErrorMessage(
        error,
        "Unknown dispatch error.",
      )}`,
    );
  }
}

/* =========================================================
 * Mark Delivered
 * ========================================================= */

export async function markDeliveryDelivered(
  deliveryOrderId: string,
): Promise<DeliveryOrderDetails> {
  const id =
    await runDeliveryIdWorkflow(
      "mark_delivery_delivered_managed",
      deliveryOrderId,
      "Unable to mark delivery as delivered",
    );

  const delivery =
    await getDeliveryOrderById(id);

  if (!delivery) {
    throw new Error(
      "The delivery order was updated but could not be loaded.",
    );
  }

  return delivery;
}

/* =========================================================
 * Cancel Delivery
 * ========================================================= */

export async function cancelDeliveryOrder(
  deliveryOrderId: string,
): Promise<DeliveryOrderDetails> {
  const id =
    await runDeliveryIdWorkflow(
      "cancel_delivery_order_managed",
      deliveryOrderId,
      "Unable to cancel delivery order",
    );

  const delivery =
    await getDeliveryOrderById(id);

  if (!delivery) {
    throw new Error(
      "The delivery order was updated but could not be loaded.",
    );
  }

  return delivery;
}