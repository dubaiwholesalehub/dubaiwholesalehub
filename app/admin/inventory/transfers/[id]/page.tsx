import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, CalendarDays } from "lucide-react";

import { InventoryTransferDetailsSummary } from "@/components/admin/inventory/transfers/InventoryTransferDetailsSummary";
import { InventoryTransferInformation } from "@/components/admin/inventory/transfers/InventoryTransferInformation";
import { InventoryTransferItemsSection } from "@/components/admin/inventory/transfers/InventoryTransferItemsSection";
import { InventoryTransferStatusBadge } from "@/components/admin/inventory/transfers/InventoryTransferStatusBadge";
import { getInventoryTransferById } from "@/lib/repositories/inventory-transfer.repository";

interface InventoryTransferDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InventoryTransferDetailsPage({
  params,
}: InventoryTransferDetailsPageProps) {
  const { id } = await params;

  const transfer = await getInventoryTransferById(id);

  if (!transfer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/inventory/transfers"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Inventory Transfers
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <ArrowRightLeft className="size-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {transfer.transfer_number}
                </h1>

                <InventoryTransferStatusBadge status={transfer.status} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span>
                  {transfer.source_warehouse?.name ?? "Unknown warehouse"}
                  {" → "}
                  {transfer.destination_warehouse?.name ?? "Unknown warehouse"}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  {formatDate(transfer.transfer_date)}
                </span>
              </div>
            </div>
          </div>

          <TransferHeaderActions
            transferId={transfer.id}
            status={transfer.status}
          />
        </div>
      </header>

      <InventoryTransferDetailsSummary items={transfer.items} />

      <InventoryTransferInformation transfer={transfer} />

      <InventoryTransferItemsSection
        transferId={transfer.id}
        status={transfer.status}
        items={transfer.items}
      />
    </div>
  );
}

interface TransferHeaderActionsProps {
  transferId: string;
  status: string;
}

function TransferHeaderActions({
  transferId,
  status,
}: TransferHeaderActionsProps) {
  if (status !== "draft") {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/admin/inventory/transfers/${transferId}/edit`}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Edit Transfer
      </Link>

      <button
        type="button"
        disabled
        title="Add at least one item before approval"
        className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-lg bg-slate-300 px-4 text-sm font-semibold text-slate-500"
      >
        Approve Transfer
      </button>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
