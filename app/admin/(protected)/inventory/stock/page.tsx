import Link from "next/link";
import { ArrowLeft, Warehouse } from "lucide-react";

import { WarehouseStockFilters } from "@/components/admin/inventory/WarehouseStockFilters";
import { WarehouseStockPagination } from "@/components/admin/inventory/WarehouseStockPagination";
import { WarehouseStockTable } from "@/components/admin/inventory/WarehouseStockTable";
import type {
  WarehouseStockSort,
  WarehouseStockStatus,
} from "@/lib/inventory/inventory.repository";
import { getWarehouseStockPage } from "@/lib/inventory/warehouse-stock.repository";
import { createClient } from "@/lib/supabase/server";

interface WarehouseStockPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getStringParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getPositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
}

export default async function WarehouseStockPage({
  searchParams,
}: WarehouseStockPageProps) {
  const params = await searchParams;

  const search = getStringParam(params.search);
  const warehouseId = getStringParam(params.warehouseId);
  const categoryId = getStringParam(params.categoryId);
  const brandId = getStringParam(params.brandId);
  const stockStatus = getStringParam(params.stockStatus);
  const sortBy = getStringParam(params.sortBy);
  const sortDirection = getStringParam(params.sortDirection);
  const page = getPositiveInteger(
    getStringParam(params.page),
    1,
  );
  const pageSize = getPositiveInteger(
    getStringParam(params.pageSize),
    25,
  );

  const validStockStatuses = [
    "in_stock",
    "low_stock",
    "out_of_stock",
  ] as const;

  const validSortColumns = [
    "product_name",
    "sku",
    "warehouse_name",
    "quantity_on_hand",
    "quantity_available",
    "average_unit_cost",
    "stock_value",
  ] as const;

  const normalizedStatus = validStockStatuses.includes(
    stockStatus as WarehouseStockStatus,
  )
    ? (stockStatus as WarehouseStockStatus)
    : undefined;

  const normalizedSortBy = validSortColumns.includes(
    sortBy as WarehouseStockSort,
  )
    ? (sortBy as WarehouseStockSort)
    : "product_name";

  const normalizedSortDirection =
    sortDirection === "desc" ? "desc" : "asc";

  const supabase = await createClient();

  const [
    stockPage,
    warehousesResult,
    categoriesResult,
    brandsResult,
  ] = await Promise.all([
    getWarehouseStockPage({
      search,
      warehouseId,
      categoryId,
      brandId,
      stockStatus: normalizedStatus,
      sortBy: normalizedSortBy,
      sortDirection: normalizedSortDirection,
      page,
      pageSize,
    }),

    supabase
      .from("warehouses")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("categories")
      .select("id, name")
      .order("name"),

    supabase
      .from("brands")
      .select("id, name")
      .order("name"),
  ]);

  if (warehousesResult.error) {
    throw new Error(
      `Failed to load warehouses: ${warehousesResult.error.message}`,
    );
  }

  if (categoriesResult.error) {
    throw new Error(
      `Failed to load categories: ${categoriesResult.error.message}`,
    );
  }

  if (brandsResult.error) {
    throw new Error(
      `Failed to load brands: ${brandsResult.error.message}`,
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/inventory"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            Inventory Dashboard
          </Link>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Warehouse className="size-5" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                Warehouse Stock
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                Review product quantities, availability and stock
                value across warehouses.
              </p>
            </div>
          </div>
        </div>
      </section>

      <WarehouseStockFilters
        warehouses={warehousesResult.data ?? []}
        categories={categoriesResult.data ?? []}
        brands={brandsResult.data ?? []}
        values={{
          search,
          warehouseId,
          categoryId,
          brandId,
          stockStatus: normalizedStatus,
          pageSize: String(pageSize),
        }}
      />

      <WarehouseStockTable items={stockPage.items} />

      <WarehouseStockPagination
        page={stockPage.pagination.page}
        totalPages={stockPage.pagination.totalPages}
        totalCount={stockPage.pagination.totalCount}
        pageSize={stockPage.pagination.pageSize}
        searchParams={{
          search,
          warehouseId,
          categoryId,
          brandId,
          stockStatus: normalizedStatus,
          sortBy: normalizedSortBy,
          sortDirection: normalizedSortDirection,
          pageSize: String(pageSize),
        }}
      />
    </div>
  );
}