import Link from "next/link";

import type {
  PurchaseOrderHeader,
  PurchaseOrderSource,
} from "@/lib/repositories/purchase-orders";

import { DetailSection } from "./detail-section";

interface PurchaseOrderReferenceProps {
  purchaseOrder: PurchaseOrderHeader;
}

interface ReferenceRowProps {
  label: string;
  value: string | null;
  href?: string;
}

function ReferenceRow({
  label,
  value,
  href,
}: ReferenceRowProps) {
  const hasValue = Boolean(value?.trim());

  return (
    <div className="flex items-start justify-between gap-6 border-b py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      {hasValue && href ? (
        <Link
          href={href}
          className="max-w-[65%] break-all text-right text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {value}
        </Link>
      ) : (
        <span className="max-w-[65%] break-all text-right text-sm font-medium">
          {hasValue ? value : "—"}
        </span>
      )}
    </div>
  );
}

function formatSource(
  source: PurchaseOrderSource,
): string {
  return source === "rfq_award"
    ? "RFQ Award"
    : "Manual";
}

export function PurchaseOrderReference({
  purchaseOrder,
}: PurchaseOrderReferenceProps) {
  return (
    <DetailSection title="Reference Information">
      <ReferenceRow
        label="Source"
        value={formatSource(
          purchaseOrder.source,
        )}
      />

      <ReferenceRow
        label="RFQ"
        value={purchaseOrder.rfq_id}
        href={
          purchaseOrder.rfq_id
            ? `/admin/rfqs/${purchaseOrder.rfq_id}`
            : undefined
        }
      />

      <ReferenceRow
        label="Supplier Quotation"
        value={
          purchaseOrder.supplier_quotation_id
        }
        href={
          purchaseOrder.supplier_quotation_id
            ? `/admin/rfqs/${purchaseOrder.rfq_id}/quotations/${purchaseOrder.supplier_quotation_id}`
            : undefined
        }
      />

      <ReferenceRow
        label="Supplier"
        value={
          purchaseOrder.supplier.company_name
        }
      />
    </DetailSection>
  );
}