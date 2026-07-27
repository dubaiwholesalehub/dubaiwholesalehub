import type {
  PurchaseOrderHeader,
  PurchaseOrderSource,
} from "@/lib/repositories/purchase-orders";

import { DetailSection } from "./detail-section";

interface PurchaseOrderGeneralInformationProps {
  purchaseOrder: PurchaseOrderHeader;
}

interface DetailRowProps {
  label: string;
  value: string | number | null | undefined;
}

function DetailRow({
  label,
  value,
}: DetailRowProps) {
  const displayValue =
    value === null ||
    value === undefined ||
    value === ""
      ? "—"
      : String(value);

  return (
    <div className="flex items-start justify-between gap-6 border-b py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="max-w-[65%] text-right text-sm font-medium">
        {displayValue}
      </span>
    </div>
  );
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSource(
  source: PurchaseOrderSource,
): string {
  return source === "rfq_award"
    ? "RFQ Award"
    : "Manual";
}

export function PurchaseOrderGeneralInformation({
  purchaseOrder,
}: PurchaseOrderGeneralInformationProps) {
  const supplierAddress = [
    purchaseOrder.supplier.address,
    purchaseOrder.supplier.city,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <DetailSection title="General Information">
        <DetailRow
          label="PO Number"
          value={purchaseOrder.po_number}
        />

        <DetailRow
          label="Source"
          value={formatSource(
            purchaseOrder.source,
          )}
        />

        <DetailRow
          label="Currency"
          value={purchaseOrder.currency_code}
        />

        <DetailRow
          label="Order Date"
          value={formatDate(
            purchaseOrder.order_date,
          )}
        />

        <DetailRow
          label="Expected Delivery"
          value={formatDate(
            purchaseOrder.expected_delivery_date,
          )}
        />

        <DetailRow
          label="Created"
          value={formatDateTime(
            purchaseOrder.created_at,
          )}
        />

        <DetailRow
          label="Last Updated"
          value={formatDateTime(
            purchaseOrder.updated_at,
          )}
        />
      </DetailSection>

      <DetailSection title="Supplier Information">
        <DetailRow
          label="Company"
          value={
            purchaseOrder.supplier.company_name
          }
        />

        <DetailRow
          label="Contact Person"
          value={
            purchaseOrder.supplier.contact_name
          }
        />

        <DetailRow
          label="Phone"
          value={purchaseOrder.supplier.phone}
        />

        <DetailRow
          label="WhatsApp"
          value={
            purchaseOrder.supplier.whatsapp
          }
        />

        <DetailRow
          label="Email"
          value={purchaseOrder.supplier.email}
        />

        <DetailRow
          label="Address"
          value={supplierAddress || null}
        />
      </DetailSection>

      <DetailSection title="Commercial Terms">
        <DetailRow
          label="Payment Terms"
          value={purchaseOrder.payment_terms}
        />

        <DetailRow
          label="Incoterm"
          value={purchaseOrder.incoterm}
        />

        <DetailRow
          label="Lead Time"
          value={purchaseOrder.lead_time}
        />

        <DetailRow
          label="Lead Time Days"
          value={
            purchaseOrder.lead_time_days
          }
        />

        <DetailRow
          label="Packaging"
          value={purchaseOrder.packaging}
        />

        <DetailRow
          label="Warranty"
          value={purchaseOrder.warranty}
        />
      </DetailSection>

      <DetailSection title="Delivery Information">
        <DetailRow
          label="Delivery Location"
          value={
            purchaseOrder.delivery_location
          }
        />

        <DetailRow
          label="Delivery Terms"
          value={purchaseOrder.delivery_terms}
        />

        <DetailRow
          label="Loading Port"
          value={purchaseOrder.loading_port}
        />

        <DetailRow
          label="Supplier Notes"
          value={purchaseOrder.supplier_notes}
        />

        <DetailRow
          label="Internal Notes"
          value={purchaseOrder.internal_notes}
        />
      </DetailSection>
    </div>
  );
}