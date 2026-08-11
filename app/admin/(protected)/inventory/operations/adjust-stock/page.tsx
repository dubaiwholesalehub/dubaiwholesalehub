import Link from "next/link";
import {
  ArrowLeft,
  Scale,
} from "lucide-react";

import StockAdjustmentForm from "@/components/admin/inventory/operations/StockAdjustmentForm";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getStockAdjustmentOptions,
} from "@/lib/inventory/inventory-operation.repository";

import {
  postStockAdjustment,
} from "./actions";

interface StockAdjustmentPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function StockAdjustmentPage({
  searchParams,
}: StockAdjustmentPageProps) {
  await requireAdmin();

  const [
    options,
    messages,
  ] = await Promise.all([
    getStockAdjustmentOptions(),
    searchParams,
  ]);

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
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Scale className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Adjust Stock
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Record stock corrections, damaged or lost items, found inventory, samples and other physical stock differences.
            </p>
          </div>
        </div>
      </header>

      {messages.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {messages.error}
        </div>
      ) : null}

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Stock adjustments create audited inventory transactions. Use Goods Receipt or Receive Stock for normal purchases rather than using an adjustment.
      </div>

      <StockAdjustmentForm
        options={options}
        action={
          postStockAdjustment
        }
      />
    </div>
  );
}