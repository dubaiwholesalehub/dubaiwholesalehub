import { DetailSection } from "./detail-section";

interface RfqGeneralInformationProps {
  currency: string;
  deliveryLocation: string | null;
  incoterm: string | null;
  paymentTerms: string | null;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="text-sm font-medium text-right">
        {value || "—"}
      </span>
    </div>
  );
}

export function RfqGeneralInformation({
  currency,
  deliveryLocation,
  incoterm,
  paymentTerms,
}: RfqGeneralInformationProps) {
  return (
    <DetailSection title="General Information">
      <DetailRow
        label="Currency"
        value={currency}
      />

      <DetailRow
        label="Delivery Location"
        value={deliveryLocation}
      />

      <DetailRow
        label="Incoterm"
        value={incoterm}
      />

      <DetailRow
        label="Payment Terms"
        value={paymentTerms}
      />
    </DetailSection>
  );
}