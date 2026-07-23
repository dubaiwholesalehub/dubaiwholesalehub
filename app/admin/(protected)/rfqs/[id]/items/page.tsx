import Link from "next/link";
import { notFound } from "next/navigation";

import { RfqStatusBadge } from "@/components/admin/rfqs/rfq-status-badge";
import { RfqWorkspaceTabs } from "@/components/admin/rfqs/rfq-workspace-tabs";
import { getRfqById } from "@/lib/repositories/rfq";

interface RfqItemsPageProps {
  params: Promise<{
    id: string;
  }>;
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(
  value: number | null,
  currencyCode: string | null,
) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: currencyCode ?? "AED",
    minimumFractionDigits: 2,
  }).format(value);
}

export default async function RfqItemsPage({
  params,
}: RfqItemsPageProps) {
  const { id } = await params;

  const rfq = await getRfqById(id);

  if (!rfq) {
    notFound();
  }

  const items = rfq.items ?? [];

  const totalRequestedQuantity = items.reduce(
    (total, item) =>
      total + Number(item.requested_quantity ?? 0),
    0,
  );

  const totalTargetValue = items.reduce((total, item) => {
    const quantity = Number(item.requested_quantity ?? 0);
    const unitPrice = Number(item.target_unit_price ?? 0);

    return total + quantity * unitPrice;
  }, 0);

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
            active="items"
          />
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total items"
            value={String(items.length)}
          />

          <SummaryCard
            label="Requested quantity"
            value={totalRequestedQuantity.toLocaleString(
              "en-AE",
            )}
          />

          <SummaryCard
            label="Target value"
            value={formatMoney(
              totalTargetValue,
              rfq.currency_code,
            )}
          />

          <SummaryCard
            label="Required delivery"
            value={formatDate(
              rfq.required_delivery_date,
            )}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-col gap-2 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">RFQ items</h2>
            <p className="text-sm text-muted-foreground">
              Products and requirements included in this
              request for quotation.
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            {items.length}{" "}
            {items.length === 1 ? "item" : "items"}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h3 className="font-medium">
              No RFQ items found
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Add products or custom items to this RFQ.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr className="text-left">
                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Line
                  </th>

                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Item
                  </th>

                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    SKU
                  </th>

                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                    Quantity
                  </th>

                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Unit
                  </th>

                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                    Target price
                  </th>

                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                    Target total
                  </th>

                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Delivery date
                  </th>

                  <th className="px-6 py-3 font-medium text-muted-foreground">
                    Specifications
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {items.map((item) => {
                  const quantity = Number(
                    item.requested_quantity ?? 0,
                  );

                  const targetUnitPrice =
                    item.target_unit_price === null
                      ? null
                      : Number(item.target_unit_price);

                  const targetTotal =
                    targetUnitPrice === null
                      ? null
                      : quantity * targetUnitPrice;

                  return (
                    <tr
                      key={item.id}
                      className="align-top transition-colors hover:bg-muted/30"
                    >
                      <td className="px-6 py-4 font-medium">
                        {item.line_number}
                      </td>

                      <td className="px-6 py-4">
                        <div className="max-w-64">
                          <p className="font-medium">
                            {item.item_name}
                          </p>

                          {item.item_description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {item.item_description}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-xs">
                          {item.product_sku ??
                            item.product?.sku ??
                            "—"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right font-medium">
                        {quantity.toLocaleString("en-AE")}
                      </td>

                      <td className="px-6 py-4">
                        {item.unit?.short_name ??
                          item.unit?.name ??
                          "—"}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {formatMoney(
                          targetUnitPrice,
                          item.target_currency_code ??
                            rfq.currency_code,
                        )}
                      </td>

                      <td className="px-6 py-4 text-right font-medium">
                        {formatMoney(
                          targetTotal,
                          item.target_currency_code ??
                            rfq.currency_code,
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {formatDate(
                          item.target_delivery_date,
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="max-w-72 space-y-1">
                          <p className="line-clamp-2 text-xs">
                            {item.specifications ?? "—"}
                          </p>

                          {item.packaging_requirements ? (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              Packaging:{" "}
                              {
                                item.packaging_requirements
                              }
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
}

function SummaryCard({
  label,
  value,
}: SummaryCardProps) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold">
        {value}
      </p>
    </div>
  );
}