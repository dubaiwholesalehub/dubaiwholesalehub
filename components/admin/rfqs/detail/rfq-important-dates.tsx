import { format } from "date-fns";

import { DetailSection } from "./detail-section";

interface RfqImportantDatesProps {
  responseDeadline: string | null;
  requiredDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return format(new Date(value), "dd MMM yyyy");
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="text-sm font-medium text-right">
        {value}
      </span>
    </div>
  );
}

export function RfqImportantDates({
  responseDeadline,
  requiredDeliveryDate,
  createdAt,
  updatedAt,
}: RfqImportantDatesProps) {
  return (
    <DetailSection title="Important Dates">
      <DetailRow
        label="Response Deadline"
        value={formatDate(responseDeadline)}
      />

      <DetailRow
        label="Required Delivery"
        value={formatDate(requiredDeliveryDate)}
      />

      <DetailRow
        label="Created"
        value={formatDate(createdAt)}
      />

      <DetailRow
        label="Last Updated"
        value={formatDate(updatedAt)}
      />
    </DetailSection>
  );
}