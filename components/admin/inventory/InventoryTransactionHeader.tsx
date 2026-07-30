import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { InventoryTransactionDetailHeader } from "@/lib/inventory/inventory.repository";

import { InventoryTransactionStatusBadge } from "./InventoryTransactionStatusBadge";
import { InventoryTransactionTypeBadge } from "./InventoryTransactionTypeBadge";
import { CopyTransactionNumberButton } from "./CopyTransactionNumberButton";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PrintButton } from "@/components/ui/PrintButton";

interface InventoryTransactionHeaderProps {
  transaction: InventoryTransactionDetailHeader;
}

export function InventoryTransactionHeader({
  transaction,
}: InventoryTransactionHeaderProps) {
  return (
    <div className="space-y-5">
      <div className="no-print space-y-3">
        <Breadcrumbs
          items={[
            {
              label: "Dashboard",
              href: "/admin",
            },
            {
              label: "Inventory",
              href: "/admin/inventory",
            },
            {
              label: "Transactions",
              href: "/admin/inventory/transactions",
            },
            {
              label: transaction.transaction_number,
            },
          ]}
        />

        <Link
          href="/admin/inventory/transactions"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to transactions
        </Link>
      </div>

      <div className="print-only border-b border-slate-300 pb-5 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          SANWAN ALSHAMS TRADING L.L.C.
        </h1>

        <p className="mt-1 text-sm font-semibold uppercase">
          Inventory Transaction
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Inventory Transaction
          </p>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {transaction.transaction_number}
          </h1>

          {transaction.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {transaction.description}
            </p>
          ) : null}
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <CopyTransactionNumberButton
            transactionNumber={transaction.transaction_number}
          />

          <PrintButton />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InventoryTransactionTypeBadge type={transaction.transaction_type} />

          <InventoryTransactionStatusBadge status={transaction.status} />
        </div>
      </div>
    </div>
  );
}
