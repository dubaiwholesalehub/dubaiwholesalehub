import {
  Banknote,
  CircleDollarSign,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import type {
  CustomerReceiptSummary,
} from "@/lib/repositories/customer-receipt.repository";

interface CustomerReceiptSummaryCardsProps {
  summary:
    CustomerReceiptSummary;
}

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-AE",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

export default function CustomerReceiptSummaryCards({
  summary,
}: CustomerReceiptSummaryCardsProps) {
  const cards = [
    {
      label: "Posted Receipts",
      value:
        String(
          summary.postedCount,
        ),
      helper:
        `${summary.cancelledCount} cancelled`,
      icon: ReceiptText,
    },
    {
      label: "Total Received",
      value:
        `AED ${money(
          summary.totalAmount,
        )}`,
      helper:
        "Posted receipts only",
      icon: Banknote,
    },
    {
      label: "Allocated",
      value:
        `AED ${money(
          summary.totalAllocated,
        )}`,
      helper:
        "Applied to sales orders",
      icon: CircleDollarSign,
    },
    {
      label: "Unallocated",
      value:
        `AED ${money(
          summary.totalUnallocated,
        )}`,
      helper:
        "Customer credit available",
      icon: WalletCards,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(
        ({
          label,
          value,
          helper,
          icon: Icon,
        }) => (
          <div
            key={label}
            className="rounded-xl border bg-card p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {label}
                </p>

                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {value}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {helper}
                </p>
              </div>

              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-5" />
              </div>
            </div>
          </div>
        ),
      )}
    </div>
  );
}