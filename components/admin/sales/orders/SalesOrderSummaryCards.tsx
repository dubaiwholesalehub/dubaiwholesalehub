import {
  CircleDollarSign,
  Clock3,
  PackageCheck,
  ShoppingCart,
  WalletCards,
} from "lucide-react";

import SummaryCards from "@/components/admin/shared/SummaryCards";
import type {
  SalesOrderSummary,
} from "@/lib/repositories/sales-order.repository";

interface SalesOrderSummaryCardsProps {
  summary: SalesOrderSummary;
}

export default function SalesOrderSummaryCards({
  summary,
}: SalesOrderSummaryCardsProps) {
  return (
    <SummaryCards
      className="xl:grid-cols-5"
      cards={[
        {
          key: "total",
          label: "Total Orders",
          value: summary.total,
          description:
            "All sales order records",
          icon: ShoppingCart,
        },
        {
          key: "active",
          label: "Active Orders",
          value:
            summary.confirmed +
            summary.processing +
            summary.partiallyFulfilled,
          description:
            "Confirmed and in progress",
          icon: Clock3,
          iconClassName:
            "bg-blue-50 text-blue-700",
        },
        {
          key: "fulfilled",
          label: "Fulfilled",
          value:
            summary.fulfilled +
            summary.completed,
          description:
            "Fulfilled and completed",
          icon: PackageCheck,
          iconClassName:
            "bg-emerald-50 text-emerald-700",
        },
        {
          key: "value",
          label: "Order Value",
          value: formatCurrency(
            summary.totalOrderValue,
            "AED",
          ),
          description:
            "Combined sales order value",
          icon: CircleDollarSign,
          iconClassName:
            "bg-violet-50 text-violet-700",
        },
        {
          key: "outstanding",
          label: "Outstanding",
          value: formatCurrency(
            summary.totalOutstanding,
            "AED",
          ),
          description:
            `${summary.unpaid + summary.partiallyPaid} orders pending payment`,
          icon: WalletCards,
          iconClassName:
            "bg-amber-50 text-amber-700",
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