import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Plus,
} from "lucide-react";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getProductSupplierMappings,
  getProductSupplierSummary,
} from "@/lib/repositories/product-supplier.repository";
import { createClient } from "@/lib/supabase/server";

import SupplierList from "@/components/admin/products/supplier-intelligence/SupplierList";
import SupplierSummary from "@/components/admin/products/supplier-intelligence/SupplierSummary";

type ProductSupplierPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductSupplierPage({
  params,
}: ProductSupplierPageProps) {
  await requireAdmin();

  const { id } = await params;
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      sku,
      slug,
      status
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load product: ${error.message}`,
    );
  }

  if (!product) {
    notFound();
  }

  const [mappings, summary] = await Promise.all([
    getProductSupplierMappings(id),
    getProductSupplierSummary(id),
  ]);

  return (
    <main className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to products
          </Link>

          <div className="mt-4 flex items-start gap-4">
            <div className="rounded-2xl bg-slate-950 p-3">
              <Building2 className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
                Supplier Intelligence
              </h1>

              <p className="mt-1 text-slate-500">
                {product.name}
                {product.sku
                  ? ` · ${product.sku}`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled
          title="The add-supplier form is coming in the next step."
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-300 px-5 font-semibold text-slate-600"
        >
          <Plus className="h-5 w-5" />
          Add Supplier
        </button>
      </div>

      <SupplierSummary summary={summary} />

      <SupplierList
        mappings={mappings}
        summary={summary}
      />
    </main>
  );
}