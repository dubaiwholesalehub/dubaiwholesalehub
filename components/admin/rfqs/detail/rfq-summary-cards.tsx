import { InfoCard } from "./info-card";

interface RfqSummaryCardsProps {
  currency: string;
  itemCount: number;
  supplierCount: number;
  quotationCount: number;
  pendingResponses: number;
}

export function RfqSummaryCards({
  currency,
  itemCount,
  supplierCount,
  quotationCount,
  pendingResponses,
}: RfqSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <InfoCard
        label="Currency"
        value={currency}
      />

      <InfoCard
        label="Items"
        value={itemCount}
      />

      <InfoCard
        label="Suppliers"
        value={supplierCount}
      />

      <InfoCard
        label="Quotations"
        value={quotationCount}
      />

      <InfoCard
        label="Pending Responses"
        value={pendingResponses}
      />
    </div>
  );
}