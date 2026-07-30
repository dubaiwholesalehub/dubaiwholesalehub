import {
  Boxes,
  Layers3,
  WalletCards,
} from "lucide-react";

import type {
  InventoryTransactionDetailHeader,
} from "@/lib/inventory/inventory.repository";

interface InventoryTransactionSummaryProps {
  transaction: InventoryTransactionDetailHeader;
}

function formatNumber(
  value: number,
  minimumFractionDigits = 0,
): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits: 4,
  }).format(value);
}

const summaryItems = [
  {
    key: "line_count",
    label: "Lines",
    icon: Layers3,
  },
  {
    key: "total_quantity",
    label: "Total Quantity",
    icon: Boxes,
  },
  {
    key: "total_value",
    label: "Inventory Value",
    icon: WalletCards,
  },
] as const;

export function InventoryTransactionSummary({
  transaction,
}: InventoryTransactionSummaryProps) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">
          Transaction Summary
        </h2>
      </div>

      <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          const value = transaction[item.key];

          return (
            <div
              key={item.key}
              className="flex items-center gap-3 p-5"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-5 text-muted-foreground" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  {item.label}
                </p>

                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatNumber(
                    value,
                    item.key === "total_value" ? 2 : 0,
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}