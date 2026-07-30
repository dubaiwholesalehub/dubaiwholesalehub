import {
  ArrowRight,
  Building2,
  CalendarDays,
  FileText,
  Hash,
  MessageSquareText,
} from "lucide-react";

import type { InventoryTransferDetails } from "@/lib/repositories/inventory-transfer.repository";

interface InventoryTransferInformationProps {
  transfer: InventoryTransferDetails;
}

export function InventoryTransferInformation({
  transfer,
}: InventoryTransferInformationProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Building2 className="size-5" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-950">
              Transfer Information
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Warehouse movement and transfer details.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <WarehouseCard
            label="Source Warehouse"
            name={
              transfer.source_warehouse?.name ??
              "Warehouse unavailable"
            }
          />

          <div className="flex justify-center">
            <div className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-amber-600">
              <ArrowRight className="size-4" />
            </div>
          </div>

          <WarehouseCard
            label="Destination Warehouse"
            name={
              transfer.destination_warehouse?.name ??
              "Warehouse unavailable"
            }
          />
        </div>

        <div className="grid gap-x-8 gap-y-5 border-t border-slate-200 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <InformationItem
            icon={CalendarDays}
            label="Transfer Date"
            value={formatDate(transfer.transfer_date)}
          />

          <InformationItem
            icon={CalendarDays}
            label="Expected Arrival"
            value={formatDate(transfer.expected_arrival_date)}
          />

          <InformationItem
            icon={Hash}
            label="Reference Number"
            value={transfer.reference_number}
          />

          <InformationItem
            icon={FileText}
            label="Reason"
            value={transfer.reason}
          />
        </div>

        <div className="border-t border-slate-200 pt-5">
          <div className="flex items-start gap-3">
            <MessageSquareText className="mt-0.5 size-4 shrink-0 text-slate-400" />

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Internal Notes
              </p>

              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {transfer.internal_notes?.trim() ||
                  "No internal notes added."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface WarehouseCardProps {
  label: string;
  name: string;
}

function WarehouseCard({
  label,
  name,
}: WarehouseCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <Building2 className="size-4 text-slate-400" />

        <p className="font-semibold text-slate-900">
          {name}
        </p>
      </div>
    </div>
  );
}

interface InformationItemProps {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: string | null;
}

function InformationItem({
  icon: Icon,
  label,
  value,
}: InformationItemProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium text-slate-800">
          {value?.trim() || "Not provided"}
        </p>
      </div>
    </div>
  );
}

function formatDate(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

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