import { ArrowLeft, HandCoins } from "lucide-react";

import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";

import { getSupplierPaymentOptions } from "@/lib/repositories/supplier-payment.repository";

import NewSupplierPaymentForm from "@/components/admin/purchasing/supplier-payments/NewSupplierPaymentForm";

export default async function NewSupplierPaymentPage() {
  await requireAdmin();

  const suppliers = await getSupplierPaymentOptions();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <Link
          href="/admin/purchasing/supplier-payments"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Supplier Payments
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <HandCoins className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              New Supplier Payment
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Record a supplier payment and allocate it against one or more
              outstanding Quick Purchases.
            </p>
          </div>
        </div>
      </div>

      <NewSupplierPaymentForm suppliers={suppliers} />
    </div>
  );
}
