import type { PurchaseOrderDetailSummary } from "@/lib/repositories/purchase-orders";

import { InfoCard } from "./info-card";

interface PurchaseOrderQuantitySummaryProps {
  summary: PurchaseOrderDetailSummary;
}

function formatQuantity(
  quantity: number,
): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
  }).format(quantity);
}

export function PurchaseOrderQuantitySummary({
  summary,
}: PurchaseOrderQuantitySummaryProps) {
  const receivingPercentage =
    summary.totalOrderedQuantity > 0
      ? Math.min(
          Math.round(
            (summary.totalReceivedQuantity /
              summary.totalOrderedQuantity) *
              100,
          ),
          100,
        )
      : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <InfoCard
        label="Line Items"
        value={summary.itemCount}
      />

      <InfoCard
        label="Ordered Quantity"
        value={formatQuantity(
          summary.totalOrderedQuantity,
        )}
      />

      <InfoCard
        label="Received Quantity"
        value={formatQuantity(
          summary.totalReceivedQuantity,
        )}
      />

      <InfoCard
        label="Remaining Quantity"
        value={formatQuantity(
          summary.remainingQuantity,
        )}
      />

      <InfoCard
        label="Receiving Progress"
        value={`${receivingPercentage}%`}
      />
    </div>
  );
}