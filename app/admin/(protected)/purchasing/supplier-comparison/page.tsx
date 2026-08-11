import Link from "next/link";

import {
  ArrowLeft,
  Scale,
} from "lucide-react";

import SupplierComparisonSearch from "@/components/admin/purchasing/SupplierComparisonSearch";

import {
  createClient,
} from "@/lib/supabase/server";

export default async function SupplierComparisonWorkspacePage() {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "products",
    )
    .select(`
      id,
      name,
      sku
    `)
    .neq(
      "status",
      "archived",
    )
    .order(
      "name",
      {
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      `Unable to load products for supplier comparison: ${error.message}`,
    );
  }

  const products =
    data ?? [];

  return (
    <div className="space-y-8">
      <section>
        <Link
          href="/admin/purchasing"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-orange-600"
        >
          <ArrowLeft className="size-4" />
          Purchasing Dashboard
        </Link>

        <div className="mt-4">
          <p className="text-sm font-medium text-orange-600">
            Supplier Intelligence
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
            Supplier Comparison
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            Compare all active mapped suppliers for any product using price,
            lead time, MOQ and preferred supplier status.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Scale className="size-5" />
          </div>

          <div>
            <h2 className="font-semibold text-neutral-950">
              Start Comparison
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Select a product and enter the quantity you intend to purchase.
            </p>
          </div>
        </div>

        <SupplierComparisonSearch
          products={
            products
          }
        />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-neutral-950">
          How HM ERP compares suppliers
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            title="Price"
            value="45%"
            description="Effective supplier purchase cost."
          />

          <InfoCard
            title="Lead Time"
            value="25%"
            description="Mapped procurement lead time."
          />

          <InfoCard
            title="MOQ"
            value="20%"
            description="Minimum purchase quantity impact."
          />

          <InfoCard
            title="Preferred"
            value="10%"
            description="Preferred supplier relationship."
          />
        </div>
      </section>
    </div>
  );
}

function InfoCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {title}
      </p>

      <p className="mt-2 text-2xl font-semibold text-neutral-950">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-neutral-500">
        {description}
      </p>
    </div>
  );
}