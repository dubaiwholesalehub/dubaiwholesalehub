import Link from "next/link";
import { notFound } from "next/navigation";

import { RfqStatusBadge } from "@/components/admin/rfqs/rfq-status-badge";
import { RfqWorkspaceTabs } from "@/components/admin/rfqs/rfq-workspace-tabs";
import { getRfqById } from "@/lib/repositories/rfq";

interface RfqSuppliersPageProps {
  params: Promise<{
    id: string;
  }>;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatusLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getSupplierStatusClasses(status: string) {
  const normalizedStatus = status.toLowerCase();

  switch (normalizedStatus) {
    case "awarded":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "responded":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "viewed":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    case "sent":
    case "invited":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "declined":
      return "border-red-200 bg-red-50 text-red-700";

    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

interface SupplierStatusBadgeProps {
  status: string;
}

function SupplierStatusBadge({
  status,
}: SupplierStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getSupplierStatusClasses(
        status,
      )}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  description?: string;
}

function SummaryCard({
  label,
  value,
  description,
}: SummaryCardProps) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold">
        {value}
      </p>

      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default async function RfqSuppliersPage({
  params,
}: RfqSuppliersPageProps) {
  const { id } = await params;

  const rfq = await getRfqById(id);

  if (!rfq) {
    notFound();
  }

  const invitedSuppliers = rfq.invited_suppliers ?? [];

  const invitationsSent = invitedSuppliers.filter(
    (supplier) => supplier.sent_at !== null,
  ).length;

  const viewedCount = invitedSuppliers.filter(
    (supplier) => supplier.viewed_at !== null,
  ).length;

  const respondedCount = invitedSuppliers.filter(
    (supplier) => supplier.responded_at !== null,
  ).length;

  const declinedCount = invitedSuppliers.filter(
    (supplier) =>
      supplier.declined_at !== null ||
      String(supplier.status).toLowerCase() === "declined",
  ).length;

  const awardedCount = invitedSuppliers.filter(
    (supplier) =>
      supplier.awarded_at !== null ||
      String(supplier.status).toLowerCase() === "awarded",
  ).length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {rfq.rfq_number}
            </h1>

            <RfqStatusBadge status={rfq.status} />
          </div>

          <div>
            <h2 className="text-lg font-medium">
              {rfq.title}
            </h2>

            {rfq.description ? (
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                {rfq.description}
              </p>
            ) : null}
          </div>
        </div>

        <Link
          href={`/admin/rfqs/${rfq.id}`}
          className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Back to overview
        </Link>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b">
          <RfqWorkspaceTabs
            rfqId={rfq.id}
            active="suppliers"
          />
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <SummaryCard
            label="Total invited"
            value={String(invitedSuppliers.length)}
            description="Suppliers linked to this RFQ"
          />

          <SummaryCard
            label="Sent"
            value={String(invitationsSent)}
            description="Invitations delivered"
          />

          <SummaryCard
            label="Viewed"
            value={String(viewedCount)}
            description="Suppliers who opened the RFQ"
          />

          <SummaryCard
            label="Responded"
            value={String(respondedCount)}
            description="Responses received"
          />

          <SummaryCard
            label="Declined"
            value={String(declinedCount)}
            description="Suppliers who declined"
          />

          <SummaryCard
            label="Awarded"
            value={String(awardedCount)}
            description="Selected suppliers"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-col gap-2 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              Invited suppliers
            </h2>

            <p className="text-sm text-muted-foreground">
              Track supplier invitations, responses and
              quotation progress.
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            {invitedSuppliers.length}{" "}
            {invitedSuppliers.length === 1
              ? "supplier"
              : "suppliers"}
          </div>
        </div>

        {invitedSuppliers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h3 className="font-medium">
              No suppliers invited
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Add suppliers to this RFQ before sending
              quotation requests.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1350px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr className="text-left">
                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Supplier
                  </th>

                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Contact
                  </th>

                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Country
                  </th>

                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Status
                  </th>

                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Reference
                  </th>

                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Sent
                  </th>

                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Viewed
                  </th>

                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Responded
                  </th>

                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {invitedSuppliers.map(
                  (invitedSupplier) => {
                    const supplier =
                      invitedSupplier.supplier;

                    return (
                      <tr
                        key={invitedSupplier.id}
                        className="align-top transition-colors hover:bg-muted/30"
                      >
                        <td className="px-6 py-4">
                          <div className="max-w-64">
                            <p className="font-medium">
                              {supplier?.company_name ??
                                "Unknown supplier"}
                            </p>

                            {supplier?.city ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {supplier.city}
                              </p>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="max-w-64 space-y-1">
                            <p>
                              {invitedSupplier.contact_name ??
                                supplier?.contact_name ??
                                "—"}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {invitedSupplier.contact_email ??
                                supplier?.email ??
                                "—"}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {invitedSupplier.contact_phone ??
                                invitedSupplier.contact_whatsapp ??
                                supplier?.phone ??
                                supplier?.whatsapp ??
                                "—"}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {supplier?.country?.name ?? "—"}
                        </td>

                        <td className="px-6 py-4">
                          <SupplierStatusBadge
                            status={String(
                              invitedSupplier.status,
                            )}
                          />

                          {invitedSupplier.decline_reason ? (
                            <p className="mt-2 max-w-52 text-xs text-red-600">
                              {
                                invitedSupplier.decline_reason
                              }
                            </p>
                          ) : null}
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-mono text-xs">
                            {invitedSupplier.supplier_reference ??
                              "—"}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {formatDateTime(
                            invitedSupplier.sent_at,
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {formatDateTime(
                            invitedSupplier.viewed_at,
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {formatDateTime(
                            invitedSupplier.responded_at,
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/admin/suppliers/${invitedSupplier.supplier_id}`}
                              className="inline-flex h-8 items-center justify-center rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                            >
                              View supplier
                            </Link>

                            <Link
                              href={`/admin/rfqs/${rfq.id}/quotations`}
                              className="inline-flex h-8 items-center justify-center rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                            >
                              Quotations
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}