"use client";

import type { RfqDraftItem } from "@/components/admin/rfqs/items/types";
import type { RfqSelectedSupplier } from "@/components/admin/rfqs/suppliers/types";

import {
  calculateItemsTargetValue,
  calculateTotalQuantity,
  formatCurrency,
} from "@/components/admin/rfqs/items/utils";

import {
  countSelectedSupplierCountries,
} from "@/components/admin/rfqs/suppliers/utils";

export interface RfqReviewDetails {
  title: string;
  priority: string;
  currencyCode: string;
  responseDeadline: string;
  requiredDeliveryDate: string;
  deliveryLocation: string;
  incoterm: string;
  description?: string;
  notes?: string;
}

interface RfqReviewStepProps {
  details: RfqReviewDetails;
  items: RfqDraftItem[];
  selectedSuppliers: RfqSelectedSupplier[];
  onBack: () => void;
  onCreate: () => void;
  isCreating?: boolean;
  createError?: string | null;
}

export function RfqReviewStep({
  details,
  items,
  selectedSuppliers,
  onBack,
  onCreate,
  isCreating = false,
  createError = null,
}: RfqReviewStepProps) {
  const totalQuantity =
    calculateTotalQuantity(items);

  const estimatedValue =
    calculateItemsTargetValue(items);

  const supplierCountryCount =
    countSelectedSupplierCountries(
      selectedSuppliers,
    );

  const validationItems = [
    {
      label: "RFQ title entered",
      valid: Boolean(details.title.trim()),
    },
    {
      label: "Currency selected",
      valid: Boolean(
        details.currencyCode.trim(),
      ),
    },
    {
      label: "Response deadline entered",
      valid: Boolean(
        details.responseDeadline,
      ),
    },
    {
      label: "Required delivery date entered",
      valid: Boolean(
        details.requiredDeliveryDate,
      ),
    },
    {
      label: "At least one item added",
      valid: items.length > 0,
    },
    {
      label: "At least one supplier selected",
      valid: selectedSuppliers.length > 0,
    },
  ];

  const isReady = validationItems.every(
    (item) => item.valid,
  );

  return (
    <>
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">
          Review RFQ
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Verify the RFQ details, requested items and
          selected suppliers before creating it.
        </p>
      </div>

      <div className="space-y-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticCard
            label="Items"
            value={items.length.toLocaleString(
              "en-AE",
            )}
            description="RFQ line items"
          />

          <StatisticCard
            label="Total quantity"
            value={totalQuantity.toLocaleString(
              "en-AE",
              {
                maximumFractionDigits: 2,
              },
            )}
            description="Combined requested quantity"
          />

          <StatisticCard
            label="Estimated value"
            value={formatCurrency(
              estimatedValue,
              details.currencyCode || "AED",
            )}
            description="Based on target prices"
          />

          <StatisticCard
            label="Suppliers"
            value={selectedSuppliers.length.toLocaleString(
              "en-AE",
            )}
            description="Invitation recipients"
          />
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <ReviewSection
              title="RFQ information"
              description="Commercial and delivery details for this request."
            >
              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <ReviewField
                  label="Title"
                  value={details.title}
                />

                <ReviewField
                  label="Priority"
                  value={formatLabel(
                    details.priority,
                  )}
                />

                <ReviewField
                  label="Currency"
                  value={details.currencyCode}
                />

                <ReviewField
                  label="Response deadline"
                  value={formatDateTime(
                    details.responseDeadline,
                  )}
                />

                <ReviewField
                  label="Required delivery"
                  value={formatDate(
                    details.requiredDeliveryDate,
                  )}
                />

                <ReviewField
                  label="Incoterm"
                  value={
                    details.incoterm ||
                    "Not selected"
                  }
                />

                <ReviewField
                  label="Delivery location"
                  value={
                    details.deliveryLocation ||
                    "Not provided"
                  }
                  className="sm:col-span-2"
                />

                {details.description ? (
                  <ReviewField
                    label="Description"
                    value={details.description}
                    className="sm:col-span-2"
                  />
                ) : null}

                {details.notes ? (
                  <ReviewField
                    label="Internal notes"
                    value={details.notes}
                    className="sm:col-span-2"
                  />
                ) : null}
              </div>
            </ReviewSection>

            <ReviewSection
              title="Requested items"
              description={`${items.length} ${items.length === 1
                ? "item"
                : "items"
                } included in this RFQ.`}
            >
              {items.length === 0 ? (
                <EmptyState
                  title="No items added"
                  description="Return to the Items step and add at least one item."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-medium text-muted-foreground">
                          Item
                        </th>

                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Quantity
                        </th>

                        <th className="px-4 py-3 font-medium text-muted-foreground">
                          Unit
                        </th>

                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Target price
                        </th>

                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Estimated total
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {items.map((item) => {
                        const lineTotal =
                          item.targetUnitPrice ===
                            null
                            ? null
                            : item.requestedQuantity *
                            item.targetUnitPrice;

                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-4">
                              <p className="font-medium">
                                {item.itemName}
                              </p>

                              <p className="mt-1 text-xs text-muted-foreground">
                                {item.productSku ||
                                  "Custom item"}
                              </p>
                            </td>

                            <td className="px-4 py-4 text-right font-medium">
                              {item.requestedQuantity.toLocaleString(
                                "en-AE",
                                {
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {item.unitName}
                            </td>

                            <td className="px-4 py-4 text-right">
                              {item.targetUnitPrice ===
                                null
                                ? "—"
                                : formatCurrency(
                                  item.targetUnitPrice,
                                  details.currencyCode ||
                                  "AED",
                                )}
                            </td>

                            <td className="px-4 py-4 text-right font-medium">
                              {lineTotal === null
                                ? "—"
                                : formatCurrency(
                                  lineTotal,
                                  details.currencyCode ||
                                  "AED",
                                )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid gap-3 border-t bg-muted/20 p-4 sm:grid-cols-3">
                <SummaryValue
                  label="Items"
                  value={items.length.toLocaleString(
                    "en-AE",
                  )}
                />

                <SummaryValue
                  label="Total quantity"
                  value={totalQuantity.toLocaleString(
                    "en-AE",
                    {
                      maximumFractionDigits: 2,
                    },
                  )}
                />

                <SummaryValue
                  label="Estimated value"
                  value={formatCurrency(
                    estimatedValue,
                    details.currencyCode || "AED",
                  )}
                />
              </div>
            </ReviewSection>

            <ReviewSection
              title="Selected suppliers"
              description={`${selectedSuppliers.length} ${selectedSuppliers.length === 1
                ? "supplier"
                : "suppliers"
                } will receive this RFQ.`}
            >
              {selectedSuppliers.length === 0 ? (
                <EmptyState
                  title="No suppliers selected"
                  description="Return to the Suppliers step and choose at least one supplier."
                />
              ) : (
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {selectedSuppliers.map(
                    (supplier) => (
                      <div
                        key={
                          supplier.supplierId
                        }
                        className="min-w-0 rounded-md border bg-muted/20 p-4"
                      >
                        <p className="truncate font-medium">
                          {supplier.companyName}
                        </p>

                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {supplier.contactName ||
                            "No contact person"}
                        </p>

                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <p>
                            {[
                              supplier.city,
                              supplier.countryName,
                            ]
                              .filter(Boolean)
                              .join(", ") ||
                              "Location not provided"}
                          </p>

                          <p className="break-all">
                            {supplier.email ||
                              supplier.whatsapp ||
                              supplier.phone ||
                              "No contact method"}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              <div className="grid gap-3 border-t bg-muted/20 p-4 sm:grid-cols-2">
                <SummaryValue
                  label="Recipients"
                  value={selectedSuppliers.length.toLocaleString(
                    "en-AE",
                  )}
                />

                <SummaryValue
                  label="Countries"
                  value={supplierCountryCount.toLocaleString(
                    "en-AE",
                  )}
                />
              </div>
            </ReviewSection>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6">
            <section className="overflow-hidden rounded-lg border bg-background">
              <div className="border-b px-5 py-4">
                <h3 className="font-medium">
                  Validation checklist
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Required information before creation.
                </p>
              </div>

              <div className="divide-y">
                {validationItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 px-5 py-3.5"
                  >
                    <span
                      className={[
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        item.valid
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-amber-500/10 text-amber-700",
                      ].join(" ")}
                    >
                      {item.valid ? "✓" : "!"}
                    </span>

                    <p className="text-sm">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t bg-muted/20 px-5 py-4">
                <div
                  className={[
                    "rounded-md border px-4 py-3",
                    isReady
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-amber-500/30 bg-amber-500/5",
                  ].join(" ")}
                >
                  <p className="text-sm font-medium">
                    {isReady
                      ? "Ready to create RFQ"
                      : "RFQ is incomplete"}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {isReady
                      ? "All required information has been provided."
                      : "Complete the missing requirements before creating the RFQ."}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border bg-background p-5">
              <h3 className="font-medium">
                Creation summary
              </h3>

              <div className="mt-4 space-y-3 text-sm">
                <SummaryRow
                  label="Items"
                  value={String(items.length)}
                />

                <SummaryRow
                  label="Suppliers"
                  value={String(
                    selectedSuppliers.length,
                  )}
                />

                <SummaryRow
                  label="Currency"
                  value={
                    details.currencyCode ||
                    "Not selected"
                  }
                />

                <SummaryRow
                  label="Estimated value"
                  value={formatCurrency(
                    estimatedValue,
                    details.currencyCode || "AED",
                  )}
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
      {createError ? (
        <div className="border-t border-destructive/20 bg-destructive/5 px-6 py-4">
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-background px-4 py-3"
          >
            <p className="text-sm font-medium text-destructive">
              RFQ could not be created
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {createError}
            </p>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-3 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isCreating}
          className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back to suppliers
        </button>

        <button
          type="button"
          onClick={onCreate}
          disabled={!isReady || isCreating}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating
            ? "Creating RFQ..."
            : "Create RFQ"}
        </button>
      </div>
    </>
  );
}

interface ReviewSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function ReviewSection({
  title,
  description,
  children,
}: ReviewSectionProps) {
  return (
    <section className="overflow-hidden rounded-lg border bg-background">
      <div className="border-b px-5 py-4">
        <h3 className="font-medium">
          {title}
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

interface ReviewFieldProps {
  label: string;
  value: string;
  className?: string;
}

function ReviewField({
  label,
  value,
  className,
}: ReviewFieldProps) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
        {value || "Not provided"}
      </p>
    </div>
  );
}

interface StatisticCardProps {
  label: string;
  value: string;
  description: string;
}

function StatisticCard({
  label,
  value,
  description,
}: StatisticCardProps) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm font-medium text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

interface SummaryValueProps {
  label: string;
  value: string;
}

function SummaryValue({
  label,
  value,
}: SummaryValueProps) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
}

function SummaryRow({
  label,
  value,
}: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">
        {label}
      </span>

      <span className="text-right font-medium">
        {value}
      </span>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
}

function EmptyState({
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="px-6 py-10 text-center">
      <h4 className="font-medium">
        {title}
      </h4>

      <p className="mt-1 text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatLabel(value: string) {
  if (!value) {
    return "Not selected";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}