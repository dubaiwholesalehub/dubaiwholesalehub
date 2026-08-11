import Link from "next/link";
import {
  ArrowLeft,
  ClipboardCheck,
} from "lucide-react";

import StockCountForm from "@/components/admin/inventory/operations/StockCountForm";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getStockAdjustmentOptions,
} from "@/lib/inventory/inventory-operation.repository";

import {
  postStockCount,
} from "./actions";

interface StockCountPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function StockCountPage({
  searchParams,
}: StockCountPageProps) {
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
            <ClipboardCheck className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Stock Count
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Compare HM ERP stock with the actual physical quantity in the warehouse and post only the difference.
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
        Enter the actual quantity physically counted—not the adjustment amount. HM ERP calculates the difference automatically.
      </div>

      <StockCountForm
        options={options}
        action={postStockCount}
      />
    </div>
  );
}