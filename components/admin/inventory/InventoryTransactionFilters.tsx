import Link from "next/link";
import { Search } from "lucide-react";

import type {
  InventoryTransactionStatus,
  InventoryTransactionType,
} from "@/lib/inventory/inventory.repository";

interface FilterOption {
  id: string;
  name: string;
}

interface InventoryTransactionFiltersProps {
  warehouses: FilterOption[];

  values: {
    search?: string;
    transactionType?: InventoryTransactionType;
    warehouseId?: string;
    status?: InventoryTransactionStatus;
    fromDate?: string;
    toDate?: string;
    pageSize?: string;
  };
}

export function InventoryTransactionFilters({
  warehouses,
  values,
}: InventoryTransactionFiltersProps) {
  return (
    <form
      action="/admin/inventory/transactions"
      method="get"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2">
          <label
            htmlFor="search"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Search
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

            <input
              id="search"
              name="search"
              type="search"
              defaultValue={values.search}
              placeholder="Transaction, reference, description or warehouse"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>
        </div>

        <FilterSelect
          name="transactionType"
          label="Transaction Type"
          defaultValue={values.transactionType}
        >
          <option value="">All types</option>
          <option value="goods_receipt">Goods Receipt</option>
          <option value="local_purchase">Local Purchase</option>
          <option value="sales_issue">Sales Issue</option>
          <option value="transfer_out">Transfer Out</option>
          <option value="transfer_in">Transfer In</option>
          <option value="adjustment_in">Adjustment In</option>
          <option value="adjustment_out">Adjustment Out</option>
          <option value="customer_return">Customer Return</option>
          <option value="supplier_return">Supplier Return</option>
          <option value="opening_balance">Opening Balance</option>
          <option value="stock_count">Stock Count</option>
        </FilterSelect>

        <FilterSelect
          name="warehouseId"
          label="Warehouse"
          defaultValue={values.warehouseId}
        >
          <option value="">All warehouses</option>

          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect name="status" label="Status" defaultValue={values.status}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
          <option value="reversed">Reversed</option>
          <option value="cancelled">Cancelled</option>
        </FilterSelect>

        <DateInput
          name="fromDate"
          label="From Date"
          defaultValue={values.fromDate}
        />

        <DateInput name="toDate" label="To Date" defaultValue={values.toDate} />

        <FilterSelect
          name="pageSize"
          label="Rows per page"
          defaultValue={values.pageSize ?? "25"}
        >
          <option value="25">25 rows</option>
          <option value="50">50 rows</option>
          <option value="100">100 rows</option>
        </FilterSelect>
      </div>

      <div className="mt-4 flex justify-end gap-3 border-t border-slate-100 pt-4">
        <Link
          href="/admin/inventory/transactions"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Reset
        </Link>

        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          Apply Filters
        </button>
      </div>
    </form>
  );
}

interface FilterSelectProps {
  name: string;
  label: string;
  defaultValue?: string;
  children: React.ReactNode;
}

function FilterSelect({
  name,
  label,
  defaultValue,
  children,
}: FilterSelectProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
      >
        {children}
      </select>
    </div>
  );
}

interface DateInputProps {
  name: string;
  label: string;
  defaultValue?: string;
}

function DateInput({ name, label, defaultValue }: DateInputProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type="date"
        defaultValue={defaultValue}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
      />
    </div>
  );
}
