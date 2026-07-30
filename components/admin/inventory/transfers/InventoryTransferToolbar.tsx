import Link from "next/link";
import {
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";

import type { InventoryTransferStatus } from "@/lib/repositories/inventory-transfer.repository";

interface WarehouseOption {
  id: string;
  name: string;
}

interface InventoryTransferToolbarProps {
  warehouses: WarehouseOption[];

  values: {
    search?: string;
    status?: InventoryTransferStatus;
    sourceWarehouseId?: string;
    destinationWarehouseId?: string;
    fromDate?: string;
    toDate?: string;
    pageSize: string;
  };
}

const statuses: Array<{
  value: InventoryTransferStatus;
  label: string;
}> = [
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "dispatched",
    label: "Dispatched",
  },
  {
    value: "in_transit",
    label: "In Transit",
  },
  {
    value: "received",
    label: "Received",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

export function InventoryTransferToolbar({
  warehouses,
  values,
}: InventoryTransferToolbarProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <form
        action="/admin/inventory/transfers"
        method="get"
        className="space-y-4"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="inventory-transfer-search"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Search
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

              <input
                id="inventory-transfer-search"
                name="search"
                type="search"
                defaultValue={values.search}
                placeholder="Transfer or reference number"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </div>
          </div>

          <FilterField
            label="Status"
            htmlFor="inventory-transfer-status"
          >
            <select
              id="inventory-transfer-status"
              name="status"
              defaultValue={values.status ?? ""}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            >
              <option value="">All statuses</option>

              {statuses.map((status) => (
                <option
                  key={status.value}
                  value={status.value}
                >
                  {status.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField
            label="Source"
            htmlFor="inventory-transfer-source"
          >
            <select
              id="inventory-transfer-source"
              name="sourceWarehouseId"
              defaultValue={
                values.sourceWarehouseId ?? ""
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            >
              <option value="">
                All source warehouses
              </option>

              {warehouses.map((warehouse) => (
                <option
                  key={warehouse.id}
                  value={warehouse.id}
                >
                  {warehouse.name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField
            label="Destination"
            htmlFor="inventory-transfer-destination"
          >
            <select
              id="inventory-transfer-destination"
              name="destinationWarehouseId"
              defaultValue={
                values.destinationWarehouseId ??
                ""
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            >
              <option value="">
                All destination warehouses
              </option>

              {warehouses.map((warehouse) => (
                <option
                  key={warehouse.id}
                  value={warehouse.id}
                >
                  {warehouse.name}
                </option>
              ))}
            </select>
          </FilterField>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-3">
            <FilterField
              label="From Date"
              htmlFor="inventory-transfer-from-date"
            >
              <input
                id="inventory-transfer-from-date"
                name="fromDate"
                type="date"
                defaultValue={values.fromDate}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </FilterField>

            <FilterField
              label="To Date"
              htmlFor="inventory-transfer-to-date"
            >
              <input
                id="inventory-transfer-to-date"
                name="toDate"
                type="date"
                defaultValue={values.toDate}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </FilterField>

            <FilterField
              label="Rows"
              htmlFor="inventory-transfer-page-size"
            >
              <select
                id="inventory-transfer-page-size"
                name="pageSize"
                defaultValue={values.pageSize}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </FilterField>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Apply Filters
            </button>

            <Link
              href="/admin/inventory/transfers"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw className="size-4" />
              Reset
            </Link>

            <Link
              href="/admin/inventory/transfers/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              <Plus className="size-4" />
              New Transfer
            </Link>
          </div>
        </div>
      </form>
    </section>
  );
}

interface FilterFieldProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}

function FilterField({
  label,
  htmlFor,
  children,
}: FilterFieldProps) {
  return (
    <div className="min-w-44">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>

      {children}
    </div>
  );
}