import { CheckCircle2 } from "lucide-react";

import SupplierManager from "@/components/admin/suppliers/SupplierManager";
import PageHeader from "@/components/admin/ui/PageHeader";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getAdminSuppliers,
  getSupplierCountryOptions,
} from "@/lib/repositories/supplier.repository";
import { getSupplierFinancialPositions } from "@/lib/repositories/supplier-statement.repository";

interface SuppliersPageProps {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}

export default async function SuppliersPage({
  searchParams,
}: SuppliersPageProps) {
  await requireAdmin();

  const [suppliers, countries, messages] = await Promise.all([
    getAdminSuppliers(),
    getSupplierCountryOptions(),
    searchParams,
  ]);

  const financialPositions = await getSupplierFinancialPositions(
    suppliers.map((supplier) => supplier.id),
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Sourcing Management"
        title="Suppliers"
        description="Manage sourcing partners, contact information and supplier availability."
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

      <SupplierManager
        suppliers={suppliers}
        countries={countries}
        financialPositions={financialPositions}
      />
    </div>
  );
}
