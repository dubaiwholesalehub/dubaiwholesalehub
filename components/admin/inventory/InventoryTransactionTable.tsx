import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { InventoryTransactionListItem } from "@/lib/inventory/inventory.repository";

import { InventoryTransactionStatusBadge } from "./InventoryTransactionStatusBadge";
import { InventoryTransactionTypeBadge } from "./InventoryTransactionTypeBadge";

interface InventoryTransactionTableProps {
  items: InventoryTransactionListItem[];
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : dateFormatter.format(date);
}

export function InventoryTransactionTable({
  items,
}: InventoryTransactionTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <h3 className="font-semibold text-slate-900">
          No inventory transactions found
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Try changing the search criteria or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <TableHeading>Transaction</TableHeading>
              <TableHeading>Date</TableHeading>
              <TableHeading>Type</TableHeading>
              <TableHeading>Warehouse</TableHeading>
              <TableHeading>Reference</TableHeading>
              <TableHeading align="right">Lines</TableHeading>
              <TableHeading align="right">Quantity</TableHeading>
              <TableHeading align="right">Value</TableHeading>
              <TableHeading>Status</TableHeading>
              <TableHeading>
                <span className="sr-only">View</span>
              </TableHeading>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr
                key={item.id}
                className="transition hover:bg-slate-50"
              >
                <TableCell>
                  <Link
                    href={`/admin/inventory/transactions/${item.id}`}
                    className="font-semibold text-slate-950 transition hover:text-amber-700"
                  >
                    {item.transaction_number}
                  </Link>

                  {item.description && (
                    <span className="mt-1 block max-w-64 truncate text-xs text-slate-500">
                      {item.description}
                    </span>
                  )}
                </TableCell>

                <TableCell>
                  {formatDate(item.transaction_date)}
                </TableCell>

                <TableCell>
                  <InventoryTransactionTypeBadge
                    type={item.transaction_type}
                  />
                </TableCell>

                <TableCell>
                  <span className="font-medium text-slate-800">
                    {item.warehouse_name}
                  </span>
                </TableCell>

                <TableCell>
                  {item.reference_number ?? "—"}

                  {item.reference_type && (
                    <span className="mt-1 block text-xs capitalize text-slate-500">
                      {item.reference_type.replaceAll("_", " ")}
                    </span>
                  )}
                </TableCell>

                <TableCell align="right">
                  {numberFormatter.format(item.line_count)}
                </TableCell>

                <TableCell align="right">
                  <span className="font-medium text-slate-900">
                    {numberFormatter.format(
                      item.total_quantity,
                    )}
                  </span>
                </TableCell>

                <TableCell align="right">
                  <span className="font-semibold text-slate-950">
                    {currencyFormatter.format(item.total_value)}
                  </span>
                </TableCell>

                <TableCell>
                  <InventoryTransactionStatusBadge
                    status={item.status}
                  />
                </TableCell>

                <TableCell align="right">
                  <Link
                    href={`/admin/inventory/transactions/${item.id}`}
                    aria-label={`View ${item.transaction_number}`}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-700"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface TableHeadingProps {
  children: React.ReactNode;
  align?: "left" | "right";
}

function TableHeading({
  children,
  align = "left",
}: TableHeadingProps) {
  return (
    <th
      className={[
        "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

interface TableCellProps {
  children: React.ReactNode;
  align?: "left" | "right";
}

function TableCell({
  children,
  align = "left",
}: TableCellProps) {
  return (
    <td
      className={[
        "whitespace-nowrap px-4 py-4 text-sm text-slate-600",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </td>
  );
}