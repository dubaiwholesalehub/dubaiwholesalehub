"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Search, X } from "lucide-react";

interface SupplierPaymentFiltersProps {
  values: {
    search: string;

    status: string;

    paymentMethod: string;

    dateFrom: string;

    dateTo: string;

    pageSize: string;
  };
}

export default function SupplierPaymentFilters({
  values,
}: SupplierPaymentFiltersProps) {
  const router = useRouter();

  const searchParams = useSearchParams();

  function update(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    params.delete("page");

    router.push(`?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/admin/purchasing/supplier-payments");
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="relative xl:col-span-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <input
            key={values.search}
            defaultValue={values.search}
            placeholder="Payment or reference..."
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                update({
                  search: event.currentTarget.value,
                });
              }
            }}
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <select
          value={values.status}
          onChange={(event) =>
            update({
              status: event.target.value,
            })
          }
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All Statuses</option>

          <option value="posted">Posted</option>

          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={values.paymentMethod}
          onChange={(event) =>
            update({
              paymentMethod: event.target.value,
            })
          }
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All Methods</option>

          <option value="cash">Cash</option>

          <option value="bank">Bank Transfer</option>

          <option value="card">Card</option>

          <option value="cheque">Cheque</option>

          <option value="other">Other</option>
        </select>

        <input
          type="date"
          value={values.dateFrom}
          onChange={(event) =>
            update({
              dateFrom: event.target.value,
            })
          }
          className="h-10 rounded-md border bg-background px-3 text-sm"
        />

        <input
          type="date"
          value={values.dateTo}
          onChange={(event) =>
            update({
              dateTo: event.target.value,
            })
          }
          className="h-10 rounded-md border bg-background px-3 text-sm"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <select
          value={values.pageSize}
          onChange={(event) =>
            update({
              pageSize: event.target.value,
            })
          }
          className="h-9 rounded-md border bg-background px-3 text-xs"
        >
          <option value="25">25 per page</option>

          <option value="50">50 per page</option>

          <option value="100">100 per page</option>
        </select>

        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium hover:bg-muted"
        >
          <X className="size-3.5" />
          Clear Filters
        </button>
      </div>
    </div>
  );
}
