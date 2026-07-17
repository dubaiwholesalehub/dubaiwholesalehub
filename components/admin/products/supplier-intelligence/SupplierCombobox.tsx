"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  Search,
} from "lucide-react";

import type {
  ProductSupplierOption,
} from "@/lib/repositories/product-supplier.repository";

type SupplierComboboxProps = {
  suppliers: ProductSupplierOption[];
  defaultValue?: string;
  disabled?: boolean;
  error?: string;
};

export default function SupplierCombobox({
  suppliers,
  defaultValue = "",
  disabled = false,
  error,
}: SupplierComboboxProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] =
    useState(defaultValue);
  const [query, setQuery] = useState("");

  const selectedSupplier = suppliers.find(
    (supplier) => supplier.id === selectedId,
  );

  const filteredSuppliers = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLowerCase();

    if (!normalizedQuery) {
      return suppliers;
    }

    return suppliers.filter((supplier) => {
      const searchableText = [
        supplier.company_name,
        supplier.contact_name,
        supplier.city,
        supplier.country?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        normalizedQuery,
      );
    });
  }, [query, suppliers]);

  return (
    <div className="relative">
      <input
        type="hidden"
        name="supplierId"
        value={selectedId}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={[
          "flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm transition",
          error
            ? "border-red-400 focus:border-red-500"
            : "border-slate-300 hover:border-slate-400",
          disabled
            ? "cursor-not-allowed bg-slate-100 text-slate-500"
            : "",
        ].join(" ")}
      >
        <span className="truncate">
          {selectedSupplier
            ? selectedSupplier.company_name
            : "Search and select a supplier"}
        </span>

        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && !disabled ? (
        <>
          <button
            type="button"
            aria-label="Close supplier selector"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3">
              <Search className="h-4 w-4 text-slate-400" />

              <input
                type="search"
                autoFocus
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Search company, contact or city..."
                className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="max-h-72 overflow-y-auto p-1">
              {filteredSuppliers.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-500">
                  No suppliers found.
                </p>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(supplier.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-slate-100"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {supplier.company_name}
                      </span>

                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {[
                          supplier.contact_name,
                          supplier.city,
                          supplier.country?.name,
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                          "No additional details"}
                      </span>
                    </span>

                    {selectedId === supplier.id ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}

      {error ? (
        <p className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}