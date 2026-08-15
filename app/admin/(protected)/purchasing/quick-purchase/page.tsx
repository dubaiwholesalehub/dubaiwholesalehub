import {
  ShoppingBag,
} from "lucide-react";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  getStockAdjustmentOptions,
} from "@/lib/inventory/inventory-operation.repository";

import {
  createClient,
} from "@/lib/supabase/server";

import QuickPurchaseForm from "@/components/admin/purchasing/quick-purchase/QuickPurchaseForm";

export default async function QuickPurchasePage() {
  await requireAdmin();

  const supabase =
    await createClient();

  const [
    options,
    suppliersResult,
  ] =
    await Promise.all([
      getStockAdjustmentOptions(),

      supabase
        .from("suppliers")
        .select(`
          id,
          company_name
        `)
        .eq(
          "is_active",
          true,
        )
        .order(
          "company_name",
        ),
    ]);

  if (
    suppliersResult.error
  ) {
    throw new Error(
      `Unable to load suppliers: ${suppliersResult.error.message}`,
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header>
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ShoppingBag className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Quick Purchase
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Receive multiple products, record supplier invoice details, VAT treatment and payment status in one step.
            </p>
          </div>
        </div>
      </header>

      <QuickPurchaseForm
        options={options}
        suppliers={
          suppliersResult.data ??
          []
        }
      />
    </div>
  );
}