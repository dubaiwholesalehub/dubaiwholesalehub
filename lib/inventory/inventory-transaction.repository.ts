import { createClient } from "@/lib/supabase/server";

import type {
  InventoryTransactionItem,
} from "./inventory.repository";

import type {
  InventoryTransactionDetail,
  InventoryTransactionDetailHeader,
  InventoryTransactionDetailItem,
  InventoryTransactionFilters,
  InventoryTransactionListItem,
  InventoryTransactionPage,
  InventoryTransactionStatus,
  InventoryTransactionType,
} from "./inventory.repository";


export async function getInventoryTransactionItems(
  transactionId: string,
): Promise<InventoryTransactionItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inventory_transaction_items")
    .select("*")
    .eq("inventory_transaction_id", transactionId)
    .order("line_number");

  if (error) {
    throw new Error(
      `Failed to load inventory transaction items: ${error.message}`,
    );
  }

  return (data ?? []) as InventoryTransactionItem[];
}

interface InventoryTransactionRpcResponse {
  items?: unknown;

  pagination?: {
    page?: unknown;
    page_size?: unknown;
    total_count?: unknown;
    total_pages?: unknown;
  };
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function requiredString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function mapTransactionType(
  value: unknown,
): InventoryTransactionType {
  const validTypes: InventoryTransactionType[] = [
    "goods_receipt",
    "sales_issue",
    "transfer_out",
    "transfer_in",
    "adjustment_in",
    "adjustment_out",
    "customer_return",
    "supplier_return",
    "opening_balance",
    "stock_count",
  ];

  return validTypes.includes(value as InventoryTransactionType)
    ? (value as InventoryTransactionType)
    : "goods_receipt";
}

function mapTransactionStatus(
  value: unknown,
): InventoryTransactionStatus {
  const validStatuses: InventoryTransactionStatus[] = [
    "draft",
    "posted",
    "reversed",
    "cancelled",
  ];

  return validStatuses.includes(
    value as InventoryTransactionStatus,
  )
    ? (value as InventoryTransactionStatus)
    : "draft";
}

function mapInventoryTransactionListItem(
  value: unknown,
): InventoryTransactionListItem {
  const row =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    id: requiredString(row.id),

    transaction_number: requiredString(
      row.transaction_number,
    ),

    transaction_type: mapTransactionType(
      row.transaction_type,
    ),

    status: mapTransactionStatus(row.status),

    transaction_date: requiredString(
      row.transaction_date,
    ),

    warehouse_id: requiredString(row.warehouse_id),
    warehouse_name: requiredString(row.warehouse_name),

    reference_type: nullableString(row.reference_type),
    reference_number: nullableString(
      row.reference_number,
    ),

    description: nullableString(row.description),

    line_count: toNumber(row.line_count),
    total_quantity: toNumber(row.total_quantity),
    total_value: toNumber(row.total_value),

    created_at: requiredString(row.created_at),
  };
}

export async function getInventoryTransactionPage(
  filters: InventoryTransactionFilters = {},
): Promise<InventoryTransactionPage> {
  const supabase = await createClient();

  const page = Math.max(filters.page ?? 1, 1);

  const pageSize = Math.min(
    Math.max(filters.pageSize ?? 25, 1),
    100,
  );

  const { data, error } = await supabase.rpc(
    "get_inventory_transaction_page",
    {
      p_search: filters.search?.trim() || undefined,

      p_transaction_type:
        filters.transactionType || undefined,

      p_warehouse_id:
        filters.warehouseId || undefined,

      p_status:
        filters.status || undefined,

      p_from_date:
        filters.fromDate || undefined,

      p_to_date:
        filters.toDate || undefined,

      p_sort_by:
        filters.sortBy ?? "transaction_date",

      p_sort_direction:
        filters.sortDirection ?? "desc",

      p_page: page,
      p_page_size: pageSize,
    },
  );

  if (error) {
    throw new Error(
      `Failed to load inventory transactions: ${error.message}`,
    );
  }

  const response =
    typeof data === "object" && data !== null
      ? (data as InventoryTransactionRpcResponse)
      : {};

  const rawItems = Array.isArray(response.items)
    ? response.items
    : [];

  return {
    items: rawItems.map(
      mapInventoryTransactionListItem,
    ),

    pagination: {
      page:
        toNumber(response.pagination?.page) || page,

      pageSize:
        toNumber(response.pagination?.page_size) ||
        pageSize,

      totalCount: toNumber(
        response.pagination?.total_count,
      ),

      totalPages: toNumber(
        response.pagination?.total_pages,
      ),
    },
  };
}

interface InventoryTransactionDetailsRpcResponse {
  transaction?: unknown;
  items?: unknown;
}

function mapWarehouse(value: unknown): {
  id: string;
  name: string;
} | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const row = value as Record<string, unknown>;

  const id = requiredString(row.id);
  const name = requiredString(row.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
  };
}

function mapInventoryTransactionDetailHeader(
  value: unknown,
): InventoryTransactionDetailHeader | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const row = value as Record<string, unknown>;

  const warehouse = mapWarehouse(row.warehouse);

  if (!warehouse) {
    return null;
  }

  const id = requiredString(row.id);
  const transactionNumber = requiredString(
    row.transaction_number,
  );

  if (!id || !transactionNumber) {
    return null;
  }

  return {
    id,
    transaction_number: transactionNumber,

    transaction_type: mapTransactionType(
      row.transaction_type,
    ),

    status: mapTransactionStatus(row.status),

    transaction_date: requiredString(
      row.transaction_date,
    ),

    warehouse,

    related_warehouse: mapWarehouse(
      row.related_warehouse,
    ),

    reference_type: nullableString(
      row.reference_type,
    ),

    reference_id: nullableString(row.reference_id),

    reference_number: nullableString(
      row.reference_number,
    ),

    description: nullableString(row.description),

    internal_notes: nullableString(
      row.internal_notes,
    ),

    line_count: toNumber(row.line_count),

    total_quantity: toNumber(
      row.total_quantity,
    ),

    total_value: toNumber(row.total_value),

    created_at: requiredString(row.created_at),
    updated_at: requiredString(row.updated_at),

    posted_at: nullableString(row.posted_at),

    reversed_at: nullableString(row.reversed_at),

    cancelled_at: nullableString(
      row.cancelled_at,
    ),

    created_by: nullableString(row.created_by),

    posted_by: nullableString(row.posted_by),

    reversed_by: nullableString(row.reversed_by),

    cancelled_by: nullableString(
      row.cancelled_by,
    ),
  };
}

function mapInventoryTransactionDetailItem(
  value: unknown,
): InventoryTransactionDetailItem {
  const row =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    id: requiredString(row.id),
    line_number: toNumber(row.line_number),

    product_id: requiredString(row.product_id),

    sku: nullableString(row.sku),

    product_name: requiredString(
      row.product_name,
    ),

    quantity: toNumber(row.quantity),

    unit_cost: toNumber(row.unit_cost),

    total_cost: toNumber(row.total_cost),

    batch_number: nullableString(
      row.batch_number,
    ),

    lot_number: nullableString(row.lot_number),

    serial_number: nullableString(
      row.serial_number,
    ),

    manufacturing_date: nullableString(
      row.manufacturing_date,
    ),

    expiry_date: nullableString(
      row.expiry_date,
    ),

    notes: nullableString(row.notes),

    source_document_item_id: nullableString(
      row.source_document_item_id,
    ),
  };
}

export async function getInventoryTransactionDetails(
  transactionId: string,
): Promise<InventoryTransactionDetail | null> {
  const normalizedId = transactionId.trim();

  if (!normalizedId) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_inventory_transaction_details",
    {
      p_transaction_id: normalizedId,
    },
  );

  if (error) {
    throw new Error(
      `Failed to load inventory transaction details: ${error.message}`,
    );
  }

  if (typeof data !== "object" || data === null) {
    return null;
  }

  const response =
    data as InventoryTransactionDetailsRpcResponse;

  const transaction =
    mapInventoryTransactionDetailHeader(
      response.transaction,
    );

  if (!transaction) {
    return null;
  }

  const rawItems = Array.isArray(response.items)
    ? response.items
    : [];

  return {
    transaction,
    items: rawItems.map(
      mapInventoryTransactionDetailItem,
    ),
  };
}