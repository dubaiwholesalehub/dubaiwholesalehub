import {
  ArrowLeft,
  RotateCcw,
} from "lucide-react";

import Link from "next/link";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  getEligibleSupplierReturnPurchases,
} from "@/lib/repositories/supplier-return.repository";

import SupplierReturnForm from "@/components/admin/purchasing/supplier-returns/SupplierReturnForm";


export default async function NewSupplierReturnPage() {
  await requireAdmin();

  const purchases =
  await getEligibleSupplierReturnPurchases();
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="space-y-4">
        <Link
          href="/admin/purchasing/returns"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />

          Supplier Returns
        </Link>

        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <RotateCcw className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              New Supplier Return
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Create a controlled supplier return from an
              existing Quick Purchase. Only quantities that
              remain returnable can be selected.
            </p>
          </div>
        </div>
      </header>

      <SupplierReturnForm
        purchases={purchases}
      />
    </div>
  );
}