import { CheckCircle2 } from "lucide-react";

import PageHeader from "@/components/admin/ui/PageHeader";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getAdminProducts,
  getProductFormOptions,
} from "@/lib/repositories/product.repository";

import ProductManager from "@/components/admin/products/ProductManager";

interface ProductsPageProps {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  await requireAdmin();

  const [products, options, messages] = await Promise.all([
    getAdminProducts(),
    getProductFormOptions(),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Catalog Management"
        title="Products"
        description="Manage product information, wholesale details, publishing status and catalog visibility."
      />

      {messages.success && (
        <div
          role="status"
          className="mt-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {messages.success}
        </div>
      )}

      {messages.error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {messages.error}
        </div>
      )}

      <ProductManager products={products} options={options} />
    </div>
  );
}