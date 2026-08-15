import {
  Banknote,
  CircleDollarSign,
  HandCoins,
  WalletCards,
} from "lucide-react";

import type { SupplierPaymentSummary } from "@/lib/repositories/supplier-payment.repository";

interface SupplierPaymentSummaryCardsProps {
  summary: SupplierPaymentSummary;
}

function money(value: number) {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,

    maximumFractionDigits: 2,
  }).format(value);
}

export default function SupplierPaymentSummaryCards({
  summary,
}: SupplierPaymentSummaryCardsProps) {
  const cards = [
    {
      label: "Posted Payments",

      value: String(summary.postedCount),

      helper: `${summary.cancelledCount} cancelled`,

      icon: HandCoins,
    },

    {
      label: "Total Paid",

      value: `AED ${money(summary.totalAmount)}`,

      helper: "Posted payments only",

      icon: Banknote,
    },

    {
      label: "Allocated",

      value: `AED ${money(summary.totalAllocated)}`,

      helper: "Applied to purchases",

      icon: CircleDollarSign,
    },

    {
      label: "Supplier Advance",

      value: `AED ${money(summary.totalUnallocated)}`,

      helper: "Unallocated supplier credit",

      icon: WalletCards,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, helper, icon: Icon }) => (
        <div key={label} className="rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>

              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {value}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
            </div>

            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
