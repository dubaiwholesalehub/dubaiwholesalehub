import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MapPin,
  PackageCheck,
} from "lucide-react";

import type { InventoryTransferDetails } from "@/lib/repositories/inventory-transfer.repository";

interface InventoryTransferHeaderProps {
  transfer: Pick<
    InventoryTransferDetails,
    | "transfer_number"
    | "status"
    | "transfer_date"
    | "source_warehouse"
    | "destination_warehouse"
  >;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  approved: "border-blue-200 bg-blue-50 text-blue-700",
  dispatched: "border-amber-200 bg-amber-50 text-amber-700",
  in_transit: "border-violet-200 bg-violet-50 text-violet-700",
  received: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-green-200 bg-green-50 text-green-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function InventoryTransferHeader({
  transfer,
}: InventoryTransferHeaderProps) {
  const statusStyle =
    STATUS_STYLES[transfer.status] ??
    "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <section className="space-y-5">
      <Link
        href="/admin/inventory/transfers"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
      >
        <ArrowLeft className="size-4" />
        Inventory Transfers
      </Link>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-start sm:justify-between lg:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <PackageCheck className="size-5" />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">
                Inventory Transfer
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                {transfer.transfer_number}
              </h1>

              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays className="size-4" />
                <span>Transfer date: {formatDate(transfer.transfer_date)}</span>
              </div>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle}`}
          >
            {formatStatus(transfer.status)}
          </span>
        </div>

        <div className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_auto_1fr] md:items-center lg:px-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <MapPin className="size-4" />
              Source warehouse
            </div>

            <p className="mt-2 font-semibold text-slate-950">
              {transfer.source_warehouse?.name ?? "Unknown warehouse"}
            </p>
          </div>

          <div className="hidden size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm md:flex">
            <ArrowRight className="size-5" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <MapPin className="size-4" />
              Destination warehouse
            </div>

            <p className="mt-2 font-semibold text-slate-950">
              {transfer.destination_warehouse?.name ?? "Unknown warehouse"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
