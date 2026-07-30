import type { ReactNode } from "react";

import type {
  InventoryTransactionDetailHeader,
} from "@/lib/inventory/inventory.repository";

interface InventoryTransactionInformationProps {
  transaction: InventoryTransactionDetailHeader;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatLabel(value: string | null): string {
  if (!value) {
    return "—";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function InformationField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>

      <dd className="text-sm font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

export function InventoryTransactionInformation({
  transaction,
}: InventoryTransactionInformationProps) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">
          Document Information
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Main transaction and source-document information.
        </p>
      </div>

      <dl className="grid gap-6 p-5 sm:grid-cols-2 xl:grid-cols-3">
        <InformationField label="Transaction Number">
          {transaction.transaction_number}
        </InformationField>

        <InformationField label="Transaction Date">
          {formatDate(transaction.transaction_date)}
        </InformationField>

        <InformationField label="Warehouse">
          {transaction.warehouse.name}
        </InformationField>

        {transaction.related_warehouse ? (
          <InformationField label="Related Warehouse">
            {transaction.related_warehouse.name}
          </InformationField>
        ) : null}

        <InformationField label="Reference Type">
          {formatLabel(transaction.reference_type)}
        </InformationField>

        <InformationField label="Reference Number">
          {transaction.reference_number || "—"}
        </InformationField>

        <InformationField label="Description">
          {transaction.description || "—"}
        </InformationField>
      </dl>
    </section>
  );
}