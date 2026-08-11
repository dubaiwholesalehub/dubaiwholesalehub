import {
  AlertTriangle,
  Boxes,
  PackageCheck,
  PackageOpen,
  Truck,
} from "lucide-react";

import SummaryCards from "@/components/admin/shared/SummaryCards";
import type {
  DeliveryOrderSummary,
} from "@/lib/repositories/delivery-order.repository";

interface DeliveryOrderSummaryCardsProps {
  summary: DeliveryOrderSummary;
}

export default function DeliveryOrderSummaryCards({
  summary,
}: DeliveryOrderSummaryCardsProps) {
  const warehouseQueue =
    summary.draft +
    summary.picking +
    summary.picked +
    summary.packing +
    summary.packed;

  return (
    <SummaryCards
      className="xl:grid-cols-5"
      cards={[
        {
          key: "total",
          label: "Total Deliveries",
          value: summary.total,
          description:
            "All delivery order records",
          icon: Truck,
        },
        {
          key: "warehouse-queue",
          label: "Warehouse Queue",
          value: warehouseQueue,
          description:
            "Draft, picking and packing",
          icon: Boxes,
          iconClassName:
            "bg-blue-50 text-blue-700",
        },
        {
          key: "dispatched",
          label: "Dispatched",
          value: summary.dispatched,
          description:
            `${formatQuantity(
              summary.dispatchedQuantity,
            )} units dispatched`,
          icon: PackageOpen,
          iconClassName:
            "bg-violet-50 text-violet-700",
        },
        {
          key: "delivered",
          label: "Delivered",
          value: summary.delivered,
          description:
            `${formatQuantity(
              summary.deliveredQuantity,
            )} units delivered`,
          icon: PackageCheck,
          iconClassName:
            "bg-emerald-50 text-emerald-700",
        },
        {
          key: "attention",
          label: "Needs Attention",
          value:
            summary.overdue +
            summary.urgent,
          description:
            `${summary.overdue} overdue · ${summary.urgent} urgent`,
          icon: AlertTriangle,
          iconClassName:
            "bg-amber-50 text-amber-700",
        },
      ]}
    />
  );
}

function formatQuantity(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-AE",
    {
      maximumFractionDigits: 2,
      notation: "compact",
    },
  ).format(value);
}