import Link from "next/link";
import { Search } from "lucide-react";

interface FilterOption {
  id: string;
  name: string;
}

interface WarehouseStockFiltersProps {
  warehouses: FilterOption[];
  categories: FilterOption[];
  brands: FilterOption[];

  values: {
    search?: string;
    warehouseId?: string;
    categoryId?: string;
    brandId?: string;
    stockStatus?: string;
    pageSize?: string;
  };
}

export function WarehouseStockFilters({
  warehouses,
  categories,
  brands,
  values,
}: WarehouseStockFiltersProps) {
  return (
    <form
      action="/admin/inventory/stock"
      method="get"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
              placeholder="SKU, product, barcode or brand"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>
        </div>

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

        <FilterSelect
          name="categoryId"
          label="Category"
          defaultValue={values.categoryId}
        >
          <option value="">All categories</option>

          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          name="brandId"
          label="Brand"
          defaultValue={values.brandId}
        >
          <option value="">All brands</option>

          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          name="stockStatus"
          label="Stock Status"
          defaultValue={values.stockStatus}
        >
          <option value="">All statuses</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </FilterSelect>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <FilterSelect
          name="pageSize"
          label="Rows per page"
          defaultValue={values.pageSize ?? "25"}
          className="w-full sm:w-40"
        >
          <option value="25">25 rows</option>
          <option value="50">50 rows</option>
          <option value="100">100 rows</option>
        </FilterSelect>

        <div className="flex gap-3">
          <Link
            href="/admin/inventory/stock"
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
      </div>
    </form>
  );
}

interface FilterSelectProps {
  name: string;
  label: string;
  defaultValue?: string;
  children: React.ReactNode;
  className?: string;
}

function FilterSelect({
  name,
  label,
  defaultValue,
  children,
  className = "",
}: FilterSelectProps) {
  return (
    <div className={className}>
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
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
      >
        {children}
      </select>
    </div>
  );
}