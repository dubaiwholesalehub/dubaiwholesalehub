import Link from "next/link";
import {
  ArrowLeft,
  ShoppingBag,
} from "lucide-react";

import LocalPurchaseForm from "@/components/admin/inventory/operations/LocalPurchaseForm";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getStockAdjustmentOptions,
} from "@/lib/inventory/inventory-operation.repository";
import { createClient } from "@/lib/supabase/server";

import {
  postLocalPurchase,
} from "./actions";

interface LocalPurchasePageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function LocalPurchasePage({
  searchParams,
}: LocalPurchasePageProps) {
  await requireAdmin();

  const supabase =
    await createClient();

  const [
    options,
    suppliersResult,
    messages,
  ] = await Promise.all([
    getStockAdjustmentOptions(),

    supabase
      .from("suppliers")
      .select(`
        id,
        company_name
      `)
      .eq("is_active", true)
      .order("company_name"),

    searchParams,
  ]);

  if (suppliersResult.error) {
    throw new Error(
      `Unable to load suppliers: ${suppliersResult.error.message}`,
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/inventory/operations"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Inventory Operations
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ShoppingBag className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Receive Local Purchase
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Receive stock purchased directly from a local shop or supplier without creating a Purchase Order.
            </p>
          </div>
        </div>
      </header>

      {messages.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {messages.error}
        </div>
      ) : null}

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
        Supplier and receipt details are optional. HM ERP will still create a complete inventory transaction using the quantity, cost, warehouse and notes you provide.
      </div>

      <LocalPurchaseForm
        options={options}
        suppliers={
          suppliersResult.data ??
          []
        }
        action={
          postLocalPurchase
        }
      />
    </div>
  );
}