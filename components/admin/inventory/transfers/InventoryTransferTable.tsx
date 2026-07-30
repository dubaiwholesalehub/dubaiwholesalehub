"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronRight,
} from "lucide-react";

import type { InventoryTransferListRow } from "@/lib/repositories/inventory-transfer.repository";

import { InventoryTransferStatusBadge } from "./InventoryTransferStatusBadge";

interface InventoryTransferTableProps {
  items: InventoryTransferListRow[];
}

const numberFormatter = new Intl.NumberFormat(
  "en-US",
  {
    maximumFractionDigits: 2,
  },
);

const dateFormatter = new Intl.DateTimeFormat(
  "en-US",
  {
    day: "2-digit",
    month: "short",
    year: "numeric",
  },
);

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(
    `${value.slice(0, 10)}T00:00:00`,
  );

  return Number.isNaN(date.getTime())
    ? value
    : dateFormatter.format(date);
}

export function InventoryTransferTable({
  items,
}: InventoryTransferTableProps) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <h3 className="font-semibold text-slate-900">
          No inventory transfers found
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Create a transfer or change the current
          filters.
        </p>

        <Link
          href="/admin/inventory/transfers/new"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          Create Transfer
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <TableHeading>
                Transfer
              </TableHeading>

              <TableHeading>Date</TableHeading>

              <TableHeading>
                Warehouse Movement
              </TableHeading>

              <TableHeading>
                Reference
              </TableHeading>

              <TableHeading align="right">
                Items
              </TableHeading>

              <TableHeading>
                Expected Arrival
              </TableHeading>

              <TableHeading>Status</TableHeading>

              <TableHeading>
                <span className="sr-only">
                  View
                </span>
              </TableHeading>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const detailHref =
                `/admin/inventory/transfers/${item.id}`;

              return (
                <tr
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    router.push(detailHref)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      router.push(detailHref);
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                >
                  <TableCell>
                    <Link
                      href={detailHref}
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                      className="font-semibold text-slate-950 transition hover:text-amber-700"
                    >
                      {item.transfer_number}
                    </Link>

                    {item.reason && (
                      <span className="mt-1 block max-w-56 truncate text-xs text-slate-500">
                        {item.reason}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    {formatDate(
                      item.transfer_date,
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="max-w-40 truncate font-medium text-slate-800">
                        {item.source_warehouse
                          ?.name ??
                          "Unknown warehouse"}
                      </span>

                      <ArrowRight className="size-4 shrink-0 text-slate-400" />

                      <span className="max-w-40 truncate font-medium text-slate-800">
                        {item.destination_warehouse
                          ?.name ??
                          "Unknown warehouse"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    {item.reference_number ??
                      "—"}
                  </TableCell>

                  <TableCell align="right">
                    <span className="font-medium text-slate-900">
                      {numberFormatter.format(
                        item.item_count,
                      )}
                    </span>
                  </TableCell>

                  <TableCell>
                    {formatDate(
                      item.expected_arrival_date,
                    )}
                  </TableCell>

                  <TableCell>
                    <InventoryTransferStatusBadge
                      status={item.status}
                    />
                  </TableCell>

                  <TableCell align="right">
                    <Link
                      href={detailHref}
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                      onKeyDown={(event) =>
                        event.stopPropagation()
                      }
                      aria-label={`View ${item.transfer_number}`}
                      className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-700"
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </TableCell>
                </tr>
              );
            })}
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
        align === "right"
          ? "text-right"
          : "text-left",
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
        align === "right"
          ? "text-right"
          : "text-left",
      ].join(" ")}
    >
      {children}
    </td>
  );
}