import { notFound } from "next/navigation";

import { getSupplierQuotationEntryData } from "@/lib/repositories/rfq";

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

      <div className="rounded-lg border p-6">
        <h2 className="font-semibold">
          Supplier Selection
        </h2>

        <div className="mt-4 space-y-3">
          {data.suppliers.map((supplier) => (
            <div
              key={supplier.rfqSupplierId}
              className="rounded border p-3"
            >
              <div className="font-medium">
                {supplier.supplierName}
              </div>

              <div className="text-sm text-muted-foreground">
                Status: {supplier.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="font-semibold">
          RFQ Items
        </h2>

        <div className="mt-4 space-y-3">
          {data.items.map((item) => (
            <div
              key={item.rfqItemId}
              className="rounded border p-3"
            >
              <div className="font-medium">
                {item.lineNumber}. {item.itemName}
              </div>

              <div className="text-sm text-muted-foreground">
                Qty: {item.requestedQuantity}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}