import { createClient } from "@/lib/supabase/server";

import type {
  WarehouseStock,
  WarehouseStockFilters,
  WarehouseStockListItem,
  WarehouseStockPage,
} from "./inventory.repository";

export interface WarehouseStockDetail extends WarehouseStock {
  warehouse: {
    id: string;
    code: string;
    name: string;
  };

  product: {
    id: string;
    sku: string;
    name: string;
  };
}

interface WarehouseStockRpcResponse {
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

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function requiredString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapWarehouseStockItem(
  value: unknown,
): WarehouseStockListItem {
  const row =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  const rawStatus = row.stock_status;

  const stockStatus =
    rawStatus === "low_stock" || rawStatus === "out_of_stock"
      ? rawStatus
      : "in_stock";

  return {
    id: requiredString(row.id),

    warehouse_id: requiredString(row.warehouse_id),
    product_id: requiredString(row.product_id),

    warehouse_code: requiredString(row.warehouse_code),
    warehouse_name: requiredString(row.warehouse_name),

    sku: requiredString(row.sku),
    barcode: nullableString(row.barcode),
    product_name: requiredString(row.product_name),

    category_id: nullableString(row.category_id),
    category_name: nullableString(row.category_name),

    brand_id: nullableString(row.brand_id),
    brand_name: nullableString(row.brand_name),

    quantity_on_hand: toNumber(row.quantity_on_hand),
    quantity_reserved: toNumber(row.quantity_reserved),
    quantity_available: toNumber(row.quantity_available),

    average_unit_cost: toNumber(row.average_unit_cost),
    stock_value: toNumber(row.stock_value),

    stock_status: stockStatus,

    last_transaction_at: nullableString(
      row.last_transaction_at,
    ),

    updated_at: requiredString(row.updated_at),
  };
}

export async function getWarehouseStockPage(
  filters: WarehouseStockFilters = {},
): Promise<WarehouseStockPage> {
  const supabase = await createClient();

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(
    Math.max(filters.pageSize ?? 25, 1),
    100,
  );

  const { data, error } = await supabase.rpc(
    "get_warehouse_stock_page",
    {
      p_search: filters.search?.trim() || undefined,
    p_warehouse_id: filters.warehouseId || undefined,
    p_category_id: filters.categoryId || undefined,
    p_brand_id: filters.brandId || undefined,
    p_stock_status: filters.stockStatus || undefined,
    p_sort_by: filters.sortBy ?? "product_name",
    p_sort_direction: filters.sortDirection ?? "asc",
    p_page: page,
    p_page_size: pageSize,
    },
  );

  if (error) {
    throw new Error(
      `Failed to load warehouse stock page: ${error.message}`,
    );
  }

  const response =
    typeof data === "object" && data !== null
      ? (data as WarehouseStockRpcResponse)
      : {};

  const rawItems = Array.isArray(response.items)
    ? response.items
    : [];

  return {
    items: rawItems.map(mapWarehouseStockItem),

    pagination: {
      page: toNumber(response.pagination?.page) || page,

      pageSize:
        toNumber(response.pagination?.page_size) || pageSize,

      totalCount: toNumber(
        response.pagination?.total_count,
      ),

      totalPages: toNumber(
        response.pagination?.total_pages,
      ),
    },
  };
}

export async function getWarehouseStock(): Promise<
  WarehouseStockDetail[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_stock")
    .select(`
      *,
      warehouse:warehouses (
        id,
        code,
        name
      ),
      product:products (
        id,
        sku,
        name
      )
    `)
    .order("warehouse(name)")
    .order("product(name)");

  if (error) {
    throw new Error(
      `Failed to load warehouse stock: ${error.message}`,
    );
  }

  return (data ?? []) as WarehouseStockDetail[];
}

export async function getWarehouseStockByProduct(
  warehouseId: string,
  productId: string,
): Promise<WarehouseStock | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_stock")
    .select("*")
    .eq("warehouse_id", warehouseId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load warehouse stock: ${error.message}`,
    );
  }

  return data as WarehouseStock | null;
}

export async function getWarehouseProducts(
  warehouseId: string,
): Promise<WarehouseStockDetail[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_stock")
    .select(`
      *,
      warehouse:warehouses (
        id,
        code,
        name
      ),
      product:products (
        id,
        sku,
        name
      )
    `)
    .eq("warehouse_id", warehouseId)
    .order("product(name)");

  if (error) {
    throw new Error(
      `Failed to load warehouse products: ${error.message}`,
    );
  }

  return (data ?? []) as WarehouseStockDetail[];
}

export async function getProductStockAcrossWarehouses(
  productId: string,
): Promise<WarehouseStockDetail[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_stock")
    .select(`
      *,
      warehouse:warehouses (
        id,
        code,
        name
      ),
      product:products (
        id,
        sku,
        name
      )
    `)
    .eq("product_id", productId)
    .order("warehouse(name)");

  if (error) {
    throw new Error(
      `Failed to load product stock: ${error.message}`,
    );
  }

  return (data ?? []) as WarehouseStockDetail[];
}