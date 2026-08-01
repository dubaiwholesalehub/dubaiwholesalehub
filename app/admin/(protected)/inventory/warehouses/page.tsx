import { Building2, Plus } from "lucide-react";

import WarehouseFilters from "@/components/admin/inventory/warehouses/WarehouseFilters";
import WarehousePagination from "@/components/admin/inventory/warehouses/WarehousePagination";
import WarehouseTable from "@/components/admin/inventory/warehouses/WarehouseTable";
import WarehouseSummaryCards from "@/components/admin/inventory/warehouses/WarehouseSummaryCards";
import {
  getWarehousePage,
  getWarehouseSummary,
} from "@/lib/repositories/warehouse.repository";
import PageHeader from "@/components/admin/shared/PageHeader";

interface WarehousesPageProps {
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

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default async function WarehousesPage({
  searchParams,
}: WarehousesPageProps) {
  const params = await searchParams;

  const search = getStringParam(params.search)?.trim() ?? "";

  const status = getStringParam(params.status) ?? "all";

  const page = getPositiveInteger(getStringParam(params.page), 1);

  const pageSize = Math.min(
    getPositiveInteger(getStringParam(params.pageSize), 25),
    100,
  );

  const isActive =
    status === "active" ? true : status === "inactive" ? false : "all";

  const [result, summary] = await Promise.all([
    getWarehousePage({
      search: search || undefined,
      isActive,
      page,
      pageSize,
    }),

    getWarehouseSummary(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses"
        description="Manage inventory storage locations, warehouse contacts and operational status."
        icon={Building2}
        action={{
          href: "/admin/inventory/warehouses/new",
          label: "New Warehouse",
          icon: Plus,
        }}
      />
      <WarehouseSummaryCards summary={summary} />
      <WarehouseFilters
        values={{
          search,
          status,
          pageSize: String(pageSize),
        }}
      />

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {result.count} matching warehouse
            {result.count === 1 ? "" : "s"}
          </p>
        </div>

        <WarehouseTable warehouses={result.data} />

        <WarehousePagination
          page={result.page}
          totalPages={result.totalPages}
          totalCount={result.count}
          pageSize={result.pageSize}
          searchParams={{
            search: search || undefined,
            status,
            pageSize: String(pageSize),
          }}
        />
      </section>
    </div>
  );
}
