import Link from "next/link";
import {
  ArrowLeft,
  ArrowRightLeft,
} from "lucide-react";

import { InventoryTransferPagination } from "@/components/admin/inventory/transfers/InventoryTransferPagination";
import { InventoryTransferSummaryCards } from "@/components/admin/inventory/transfers/InventoryTransferSummaryCards";
import { InventoryTransferTable } from "@/components/admin/inventory/transfers/InventoryTransferTable";
import { InventoryTransferToolbar } from "@/components/admin/inventory/transfers/InventoryTransferToolbar";
import {
  getInventoryTransferPage,
  type InventoryTransferStatus,
} from "@/lib/repositories/inventory-transfer.repository";
import { createClient } from "@/lib/supabase/server";

interface InventoryTransfersPageProps {
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}

const validStatuses:
  readonly InventoryTransferStatus[] = [
    "draft",
    "approved",
    "dispatched",
    "in_transit",
    "received",
    "completed",
    "cancelled",
  ];

function getStringParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined;
}

function getPositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : fallback;
}

function normalizeStatus(
  value: string | undefined,
): InventoryTransferStatus | undefined {
  return validStatuses.includes(
    value as InventoryTransferStatus,
  )
    ? (value as InventoryTransferStatus)
    : undefined;
}

export default async function InventoryTransfersPage({
  searchParams,
}: InventoryTransfersPageProps) {
  const params = await searchParams;

  const search = getStringParam(
    params.search,
  )?.trim();

  const status = normalizeStatus(
    getStringParam(params.status),
  );

  const sourceWarehouseId =
    getStringParam(
      params.sourceWarehouseId,
    );

  const destinationWarehouseId =
    getStringParam(
      params.destinationWarehouseId,
    );

  const fromDate = getStringParam(
    params.fromDate,
  );

  const toDate = getStringParam(
    params.toDate,
  );

  const page = getPositiveInteger(
    getStringParam(params.page),
    1,
  );

  const pageSize = getPositiveInteger(
    getStringParam(params.pageSize),
    25,
  );

  const supabase = await createClient();

  const [
    transferPage,
    warehousesResult,
  ] = await Promise.all([
    getInventoryTransferPage({
      search: search || undefined,
      status,
      sourceWarehouseId,
      destinationWarehouseId,
      fromDate,
      toDate,
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
      `Unable to load warehouses: ${warehousesResult.error.message}`,
    );
  }

  const draftCount =
    transferPage.data.filter(
      (transfer) =>
        transfer.status === "draft",
    ).length;

  const inTransitCount =
    transferPage.data.filter(
      (transfer) =>
        transfer.status === "dispatched" ||
        transfer.status === "in_transit",
    ).length;

  const completedCount =
    transferPage.data.filter(
      (transfer) =>
        transfer.status === "completed",
    ).length;

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
            <ArrowRightLeft className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Inventory Transfers
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Move and track inventory safely
              between warehouses.
            </p>
          </div>
        </div>
      </section>

      <InventoryTransferSummaryCards
        total={transferPage.count}
        draft={draftCount}
        inTransit={inTransitCount}
        completed={completedCount}
      />

      <InventoryTransferToolbar
        warehouses={
          warehousesResult.data ?? []
        }
        values={{
          search,
          status,
          sourceWarehouseId,
          destinationWarehouseId,
          fromDate,
          toDate,
          pageSize: String(pageSize),
        }}
      />

      <InventoryTransferTable
        items={transferPage.data}
      />

      <InventoryTransferPagination
        page={transferPage.page}
        totalPages={
          transferPage.totalPages
        }
        totalCount={transferPage.count}
        pageSize={transferPage.pageSize}
        searchParams={{
          search,
          status,
          sourceWarehouseId,
          destinationWarehouseId,
          fromDate,
          toDate,
          pageSize: String(pageSize),
        }}
      />
    </div>
  );
}