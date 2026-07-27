import { InfoCard } from "./info-card";

interface PurchaseOrderSummaryCardsProps {
  currencyCode: string;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  otherCharges: number;
  totalAmount: number;
}

function formatMoney(
  amount: number,
  currencyCode: string,
): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export function PurchaseOrderSummaryCards({
  currencyCode,
  subtotal,
  discountAmount,
  shippingAmount,
  taxAmount,
  otherCharges,
  totalAmount,
}: PurchaseOrderSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <InfoCard
        label="Subtotal"
        value={formatMoney(
          subtotal,
          currencyCode,
        )}
      />

      <InfoCard
        label="Discount"
        value={formatMoney(
          discountAmount,
          currencyCode,
        )}
      />

      <InfoCard
        label="Shipping"
        value={formatMoney(
          shippingAmount,
          currencyCode,
        )}
      />

      <InfoCard
        label="Tax"
        value={formatMoney(
          taxAmount,
          currencyCode,
        )}
      />

      <InfoCard
        label="Other Charges"
        value={formatMoney(
          otherCharges,
          currencyCode,
        )}
      />

      <InfoCard
        label="Grand Total"
        value={formatMoney(
          totalAmount,
          currencyCode,
        )}
        description="Final supplier order value"
      />
    </div>
  );
}