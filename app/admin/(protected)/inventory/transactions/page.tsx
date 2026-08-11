import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";

import { InventoryTransactionFilters } from "@/components/admin/inventory/InventoryTransactionFilters";
import { InventoryTransactionPagination } from "@/components/admin/inventory/InventoryTransactionPagination";
import { InventoryTransactionTable } from "@/components/admin/inventory/InventoryTransactionTable";
import type {
  InventoryTransactionSort,
  InventoryTransactionStatus,
  InventoryTransactionType,
} from "@/lib/inventory/inventory.repository";
import { getInventoryTransactionPage } from "@/lib/inventory/inventory-transaction.repository";
import { createClient } from "@/lib/supabase/server";

interface InventoryTransactionsPageProps {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
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

export default async function InventoryTransactionsPage({
  searchParams,
}: InventoryTransactionsPageProps) {
  const params = await searchParams;

  const search = getStringParam(params.search);
  const warehouseId = getStringParam(params.warehouseId);
  const transactionType = getStringParam(
    params.transactionType,
  );
  const status = getStringParam(params.status);
  const fromDate = getStringParam(params.fromDate);
  const toDate = getStringParam(params.toDate);
  const sortBy = getStringParam(params.sortBy);
  const sortDirection = getStringParam(
    params.sortDirection,
  );

  const page = getPositiveInteger(
    getStringParam(params.page),
    1,
  );

  const pageSize = getPositiveInteger(
    getStringParam(params.pageSize),
    25,
  );

  const validTypes: InventoryTransactionType[] = [
    "goods_receipt",
    "local_purchase",
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

  const validStatuses: InventoryTransactionStatus[] = [
    "draft",
    "posted",
    "reversed",
    "cancelled",
  ];

  const validSortColumns: InventoryTransactionSort[] = [
    "transaction_number",
    "transaction_date",
    "warehouse_name",
    "total_value",
  ];

  const normalizedType = validTypes.includes(
    transactionType as InventoryTransactionType,
  )
    ? (transactionType as InventoryTransactionType)
    : undefined;

  const normalizedStatus = validStatuses.includes(
    status as InventoryTransactionStatus,
  )
    ? (status as InventoryTransactionStatus)
    : undefined;

  const normalizedSortBy = validSortColumns.includes(
    sortBy as InventoryTransactionSort,
  )
    ? (sortBy as InventoryTransactionSort)
    : "transaction_date";

  const normalizedSortDirection =
    sortDirection === "asc" ? "asc" : "desc";

  const supabase = await createClient();

  const [transactionPage, warehousesResult] =
    await Promise.all([
      getInventoryTransactionPage({
        search,
        transactionType: normalizedType,
        warehouseId,
        status: normalizedStatus,
        fromDate,
        toDate,
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
    ]);

  if (warehousesResult.error) {
    throw new Error(
      `Failed to load warehouses: ${warehousesResult.error.message}`,
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <Link
          href="/admin/inventory"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Inventory Dashboard
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <ClipboardList className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Inventory Transactions
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Review every stock movement and its related
              document, quantity and value.
            </p>
          </div>
        </div>
      </section>

      <InventoryTransactionFilters
        warehouses={warehousesResult.data ?? []}
        values={{
          search,
          transactionType: normalizedType,
          warehouseId,
          status: normalizedStatus,
          fromDate,
          toDate,
          pageSize: String(pageSize),
        }}
      />

      <InventoryTransactionTable
        items={transactionPage.items}
      />

      <InventoryTransactionPagination
        page={transactionPage.pagination.page}
        totalPages={
          transactionPage.pagination.totalPages
        }
        totalCount={
          transactionPage.pagination.totalCount
        }
        pageSize={
          transactionPage.pagination.pageSize
        }
        searchParams={{
          search,
          transactionType: normalizedType,
          warehouseId,
          status: normalizedStatus,
          fromDate,
          toDate,
          sortBy: normalizedSortBy,
          sortDirection: normalizedSortDirection,
          pageSize: String(pageSize),
        }}
      />
    </div>
  );
}