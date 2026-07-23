import { notFound } from "next/navigation";

import { getSupplierQuotationEntryData } from "@/lib/repositories/rfq";
import { QuotationForm } from "@/components/admin/rfqs/quotation";

export default async function NewSupplierQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await getSupplierQuotationEntryData(id);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          New Supplier Quotation
        </h1>

        <p className="text-muted-foreground">
          {data.rfqNumber} — {data.title}
        </p>
      </div>
      <QuotationForm data={data} />
    </div>
  );
}