import { createClient } from "@/lib/supabase/server";

import type {
  InventoryTransaction,
  InventoryTransactionItem,
} from "./inventory.repository";

import type {
  InventoryTransactionFilters,
  InventoryTransactionListItem,
  InventoryTransactionPage,
  InventoryTransactionStatus,
  InventoryTransactionType,
} from "./inventory.repository";

export interface InventoryTransactionDetail
  extends InventoryTransaction {
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
}

export async function getInventoryTransactions(): Promise<
  InventoryTransactionDetail[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select(`
      *,
      warehouse:warehouses!inventory_transactions_warehouse_id_fkey (
        id,
        code,
        name
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Failed to load inventory transactions: ${error.message}`,
    );
  }

  return (data ?? []) as InventoryTransactionDetail[];
}

export async function getInventoryTransactionById(
  id: string,
): Promise<InventoryTransactionDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select(`
      *,
      warehouse:warehouses!inventory_transactions_warehouse_id_fkey (
        id,
        code,
        name
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load inventory transaction: ${error.message}`,
    );
  }

  return data as InventoryTransactionDetail | null;
}

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