import type { ReactNode } from "react";

import type {
  InventoryTransactionDetailHeader,
} from "@/lib/inventory/inventory.repository";

interface InventoryTransactionAuditCardProps {
  transaction: InventoryTransactionDetailHeader;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function AuditField({
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

      <dd className="break-all text-sm font-medium">
        {children}
      </dd>
    </div>
  );
}

export function InventoryTransactionAuditCard({
  transaction,
}: InventoryTransactionAuditCardProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">
            Audit Information
          </h2>
        </div>

        <dl className="grid gap-6 p-5 sm:grid-cols-2">
          <AuditField label="Created At">
            {formatDateTime(transaction.created_at)}
          </AuditField>

          <AuditField label="Created By">
            {transaction.created_by || "—"}
          </AuditField>

          <AuditField label="Posted At">
            {formatDateTime(transaction.posted_at)}
          </AuditField>

          <AuditField label="Posted By">
            {transaction.posted_by || "—"}
          </AuditField>

          {transaction.reversed_at ||
          transaction.reversed_by ? (
            <>
              <AuditField label="Reversed At">
                {formatDateTime(transaction.reversed_at)}
              </AuditField>

              <AuditField label="Reversed By">
                {transaction.reversed_by || "—"}
              </AuditField>
            </>
          ) : null}

          {transaction.cancelled_at ||
          transaction.cancelled_by ? (
            <>
              <AuditField label="Cancelled At">
                {formatDateTime(
                  transaction.cancelled_at,
                )}
              </AuditField>

              <AuditField label="Cancelled By">
                {transaction.cancelled_by || "—"}
              </AuditField>
            </>
          ) : null}
        </dl>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">
            Internal Notes
          </h2>
        </div>

        <div className="p-5">
          {transaction.internal_notes ? (
            <p className="whitespace-pre-wrap text-sm leading-6">
              {transaction.internal_notes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No internal notes were added to this
              transaction.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}