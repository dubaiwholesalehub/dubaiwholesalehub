import {
  CheckCircle2,
} from "lucide-react";

import UnitManager from "@/components/admin/units/UnitManager";
import PageHeader from "@/components/admin/ui/PageHeader";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getAdminUnits,
} from "@/lib/repositories/unit.repository";

interface UnitsPageProps {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}

export default async function UnitsPage({
  searchParams,
}: UnitsPageProps) {
  await requireAdmin();

  const [
    units,
    messages,
  ] = await Promise.all([
    getAdminUnits(),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Master Data"
        title="Units"
        description="Manage measurement and packaging units used throughout products, quotations, orders, purchasing and inventory."
      />

      {messages.success ? (
        <div
          role="status"
          className="mt-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <CheckCircle2 className="size-5 shrink-0" />
          {messages.success}
        </div>
      ) : null}

      {messages.error ? (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {messages.error}
        </div>
      ) : null}

      <UnitManager
        units={units}
      />
    </div>
  );
}