import {
  CircleDollarSign,
  ClipboardCheck,
  PackageCheck,
  RotateCcw,
  Scale,
} from "lucide-react";

import SummaryCards from "@/components/admin/shared/SummaryCards";
import type {
  SalesReturnSummary,
} from "@/lib/repositories/sales-return.repository";

interface SalesReturnSummaryCardsProps {
  summary: SalesReturnSummary;
}

export default function SalesReturnSummaryCards({
  summary,
}: SalesReturnSummaryCardsProps) {
  return (
    <SummaryCards
      className="xl:grid-cols-5"
      cards={[
        {
          key: "total",
          label: "Total Returns",
          value: summary.total,
          description:
            "All customer sales returns",
          icon: RotateCcw,
        },
        {
          key: "awaitingInventory",
          label: "Awaiting Receipt",
          value: summary.awaitingInventory,
          description:
            "Approved returns awaiting stock receipt",
          icon: PackageCheck,
          iconClassName:
            "bg-blue-50 text-blue-700",
        },
        {
          key: "awaitingPosting",
          label: "Awaiting Posting",
          value: summary.awaitingGlPosting,
          description:
            "Received returns awaiting GL posting",
          icon: Scale,
          iconClassName:
            "bg-amber-50 text-amber-700",
        },
        {
          key: "posted",
          label: "Posted",
          value: summary.posted,
          description:
            "Fully posted sales returns",
          icon: ClipboardCheck,
          iconClassName:
            "bg-emerald-50 text-emerald-700",
        },
        {
          key: "value",
          label: "Return Value",
          value: formatCurrency(
            summary.totalReturnValue,
            "AED",
          ),
          description:
            "Non-cancelled customer credit value",
          icon: CircleDollarSign,
          iconClassName:
            "bg-violet-50 text-violet-700",
        },
      ]}
    />
  );
}

function formatCurrency(
  value: number,
  currency: string,
): string {
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}