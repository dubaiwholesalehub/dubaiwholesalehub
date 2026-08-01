import Link from "next/link";
import { ArrowLeft, WarehouseIcon } from "lucide-react";

import WarehouseForm from "@/components/admin/inventory/warehouses/WarehouseForm";

import { createWarehouseAction } from "../actions";

export default function NewWarehousePage() {
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/inventory/warehouses"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Warehouses
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <WarehouseIcon className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              New Warehouse
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Create a warehouse for stock storage and
              inventory operations.
            </p>
          </div>
        </div>
      </header>

      <WarehouseForm
        mode="create"
        onSubmit={createWarehouseAction}
      />
    </div>
  );
}