import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
} from "lucide-react";

import OpeningStockForm from "@/components/admin/inventory/operations/OpeningStockForm";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getInventoryOperationOptions,
} from "@/lib/inventory/inventory-operation.repository";
import {
  postOpeningStock,
} from "./actions";

interface OpeningStockPageProps {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}

export default async function OpeningStockPage({
  searchParams,
}: OpeningStockPageProps) {
  await requireAdmin();

  const [
    options,
    messages,
  ] = await Promise.all([
    getInventoryOperationOptions(),
    searchParams,
  ]);

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/inventory"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Inventory
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Boxes className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Opening Stock
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Enter stock that already existed before inventory operations began in HM ERP.
            </p>
          </div>
        </div>
      </header>

      {messages.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {messages.error}
        </div>
      ) : null}

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Opening Stock should only be used for initial inventory balances. Use Receive Stock or Stock Adjustment for later movements.
      </div>

      <OpeningStockForm
        options={options}
        action={postOpeningStock}
      />
    </div>
  );
}