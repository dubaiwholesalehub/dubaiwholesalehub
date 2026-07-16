"use client";

import { Filter, Plus, Search, X } from "lucide-react";

import type {
  CategoryOption,
  ProductStatus,
} from "@/components/admin/products/product-types";

export type ProductStatusFilter = "all" | ProductStatus;

interface ProductFiltersProps {
  search: string;
  status: ProductStatusFilter;
  categoryId: string;
  categories: CategoryOption[];
  resultCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ProductStatusFilter) => void;
  onCategoryChange: (value: string) => void;
  onClear: () => void;
  onCreate: () => void;
}

const statusOptions: Array<{
  value: ProductStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function ProductFilters({
  search,
  status,
  categoryId,
  categories,
  resultCount,
  totalCount,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onClear,
  onCreate,
}: ProductFiltersProps) {
  const hasFilters =
    search.trim().length > 0 ||
    status !== "all" ||
    categoryId.length > 0;

  return (
    <div className="border-b border-slate-200">
      <div className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Search by product, SKU, barcode or model..."
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:flex">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <select
              value={status}
              onChange={(event) =>
                onStatusChange(
                  event.target.value as ProductStatusFilter,
                )
              }
              className="h-11 w-full min-w-44 appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-8 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            >
              {statusOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={categoryId}
            onChange={(event) =>
              onCategoryChange(event.target.value)
            }
            className="h-11 w-full min-w-48 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          >
            <option value="">All categories</option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
        >
          <Plus className="h-5 w-5" />
          New product
        </button>
      </div>

      <div className="border-t border-slate-100 px-6 py-3">
        <p className="text-sm text-slate-500">
          Showing {resultCount} of {totalCount} products
        </p>
      </div>
    </div>
  );
}