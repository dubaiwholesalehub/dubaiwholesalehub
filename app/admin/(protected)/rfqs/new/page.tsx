import Link from "next/link";

import { CreateRfqWizard } from "@/components/admin/rfqs/create-rfq-wizard";
import { getRfqItemOptions } from "@/lib/repositories/product.repository";
import { getRfqSupplierOptions } from "@/lib/repositories/rfq";

export default async function CreateRfqPage() {
  const [
    { products, units },
    { suppliers, countries },
  ] = await Promise.all([
    getRfqItemOptions(),
    getRfqSupplierOptions(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create Request for Quotation
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Prepare RFQ details, add requested items and invite suppliers.
          </p>
        </div>

        <Link
          href="/admin/rfqs"
          className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Back to RFQs
        </Link>
      </header>

      <CreateRfqWizard
        products={products}
        units={units}
        suppliers={suppliers}
        supplierCountries={countries}
      />
    </div>
  );
}