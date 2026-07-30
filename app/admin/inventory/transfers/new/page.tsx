import Link from "next/link";
import {
  ArrowLeft,
  ArrowRightLeft,
} from "lucide-react";

import { InventoryTransferForm } from "@/components/admin/inventory/transfers/InventoryTransferForm";
import { createClient } from "@/lib/supabase/server";

function getTodayDate(): string {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function NewInventoryTransferPage() {
  const supabase = await createClient();

  const { data: warehouses, error } =
    await supabase
      .from("warehouses")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

  if (error) {
    throw new Error(
      `Unable to load warehouses: ${error.message}`,
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/inventory/transfers"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Inventory Transfers
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <ArrowRightLeft className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              New Inventory Transfer
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Create a warehouse-to-warehouse stock transfer
              and save it as a draft.
            </p>
          </div>
        </div>
      </header>

      <InventoryTransferForm
        warehouses={warehouses ?? []}
        defaultTransferDate={getTodayDate()}
      />
    </div>
  );
}