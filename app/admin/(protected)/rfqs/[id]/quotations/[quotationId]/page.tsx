import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SubmitQuotationButton } from "@/components/admin/rfqs/quotation/submit-quotation-button";

export default async function SupplierQuotationDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
    quotationId: string;
  }>;
}) {
  const { id, quotationId } = await params;

  const supabase = await createClient();

  const { data: quotation, error } = await supabase
    .from("supplier_quotations")
    .select(
      `
        id,
        rfq_id,
        quotation_number,
        revision_number,
        status,
        currency_code,
        subtotal,
        total_amount,
        lead_time_days,
        payment_terms,
        submitted_at,
        created_at,
        updated_at,
        rfq_supplier:rfq_suppliers (
          id,
          supplier:suppliers (
            id,
            company_name
          )
        )
      `,
    )
    .eq("id", quotationId)
    .eq("rfq_id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load quotation: ${error.message}`);
  }

  if (!quotation) {
    notFound();
  }

  const supplierRelation = Array.isArray(quotation.rfq_supplier)
    ? quotation.rfq_supplier[0]
    : quotation.rfq_supplier;

  const supplier =
    supplierRelation && Array.isArray(supplierRelation.supplier)
      ? supplierRelation.supplier[0]
      : supplierRelation?.supplier;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{quotation.quotation_number}</h1>

          <p className="text-muted-foreground">
            {supplier?.company_name ?? "Unknown supplier"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {quotation.status === "draft" ? (
            <SubmitQuotationButton rfqId={id} quotationId={quotation.id} />
          ) : null}

          <Link href={`/admin/rfqs/${id}`}>
            <Button variant="outline">Back to RFQ</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DetailCard label="Status" value={quotation.status} />

        <DetailCard
          label="Revision"
          value={String(quotation.revision_number)}
        />

        <DetailCard label="Currency" value={quotation.currency_code} />

        <DetailCard
          label="Total"
          value={formatAmount(quotation.total_amount, quotation.currency_code)}
        />
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Commercial Information</h2>

        <dl className="grid gap-4 md:grid-cols-2">
          <DetailRow
            label="Subtotal"
            value={formatAmount(quotation.subtotal, quotation.currency_code)}
          />

          <DetailRow
            label="Lead time"
            value={
              quotation.lead_time_days
                ? `${quotation.lead_time_days} days`
                : "Not provided"
            }
          />

          <DetailRow
            label="Payment terms"
            value={quotation.payment_terms || "Not provided"}
          />

          <DetailRow
            label="Submitted at"
            value={
              quotation.submitted_at
                ? new Date(quotation.submitted_at).toLocaleString()
                : "Not submitted"
            }
          />
        </dl>
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>

      <p className="mt-1 font-semibold capitalize">
        {value.replaceAll("_", " ")}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>

      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function formatAmount(amount: number | string | null, currencyCode: string) {
  const value = Number(amount ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(value);
}
