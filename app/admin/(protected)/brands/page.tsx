import { CheckCircle2 } from "lucide-react";

import BrandManager from "@/components/admin/brands/BrandManager";
import PageHeader from "@/components/admin/ui/PageHeader";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getAdminBrands,
  getBrandCountryOptions,
} from "@/lib/repositories/brand.repository";

interface BrandsPageProps {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}

export default async function BrandsPage({
  searchParams,
}: BrandsPageProps) {
  await requireAdmin();

  const [brands, countries, messages] = await Promise.all([
    getAdminBrands(),
    getBrandCountryOptions(),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Catalog Management"
        title="Brands"
        description="Create and manage branded, generic and OEM products in your wholesale catalog."
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

      <BrandManager brands={brands} countries={countries} />
    </div>
  );
}