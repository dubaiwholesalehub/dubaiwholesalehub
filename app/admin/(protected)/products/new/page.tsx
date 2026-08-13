import Link from "next/link";

import { ArrowLeft, PackagePlus } from "lucide-react";

import PageHeader from "@/components/admin/ui/PageHeader";

import QuickProductForm from "@/components/admin/products/quick-upload/QuickProductForm";

import { requireAdmin } from "@/lib/auth/require-admin";

import { getProductFormOptions } from "@/lib/repositories/product.repository";

import { getProductSupplierOptions } from "@/lib/repositories/product-supplier.repository";

export default async function NewProductPage() {
  await requireAdmin();

  const [options, suppliers] = await Promise.all([
    getProductFormOptions(),
    getProductSupplierOptions(),
  ]);

  return (
    <div className="mx-auto max-w-[1300px] pb-16">
      <div className="mb-6">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-amber-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
      </div>

      <PageHeader
        eyebrow="Catalog Management"
        title="Quick Product Upload"
        description="Create the product, upload images and connect its first supplier in one workflow."
      />

      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <PackagePlus className="h-5 w-5 text-amber-700" />

        <p className="text-sm text-amber-900">
          Complete only the information you currently know. Optional information
          can still be edited later.
        </p>
      </div>

      <div className="mt-8">
        <QuickProductForm options={options} suppliers={suppliers} />
      </div>
    </div>
  );
}
