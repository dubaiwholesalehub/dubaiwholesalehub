import {
  Boxes,
  CircleDollarSign,
  PackageCheck,
  PackageOpen,
  Truck,
} from "lucide-react";

import type { InventoryTransferDetails } from "@/lib/repositories/inventory-transfer.repository";

interface InventoryTransferDetailsSummaryProps {
  items: InventoryTransferDetails["items"];
}

export function InventoryTransferDetailsSummary({
  items,
}: InventoryTransferDetailsSummaryProps) {
  const lineCount = items.length;

  const requestedQuantity = items.reduce(
    (total, item) => total + Number(item.requested_quantity),
    0,
  );

  const dispatchedQuantity = items.reduce(
    (total, item) => total + Number(item.dispatched_quantity),
    0,
  );

  const receivedQuantity = items.reduce(
    (total, item) => total + Number(item.received_quantity),
    0,
  );

  const totalValue = items.reduce(
    (total, item) =>
      total + Number(item.requested_quantity) * Number(item.unit_cost),
    0,
  );

  const cards = [
    {
      label: "Item Lines",
      value: formatNumber(lineCount),
      icon: Boxes,
    },
    {
      label: "Requested Qty",
      value: formatNumber(requestedQuantity),
      icon: PackageOpen,
    },
    {
      label: "Dispatched Qty",
      value: formatNumber(dispatchedQuantity),
      icon: Truck,
    },
    {
      label: "Received Qty",
      value: formatNumber(receivedQuantity),
      icon: PackageCheck,
    },
    {
      label: "Transfer Value",
      value: formatCurrency(totalValue),
      icon: CircleDollarSign,
    },
  ];

  return (
    <section>
      <h2 className="mb-3 font-semibold text-slate-950">Transfer Summary</h2>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>

                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {card.value}
                  </p>
                </div>

                <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon className="size-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(value);
}
