import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ContactRound,
  FileText,
  MapPin,
  Pencil,
  ReceiptText,
  Truck,
  UserRound,
  Plus,
} from "lucide-react";

import DetailsCard from "@/components/admin/shared/DetailsCard";
import EmptyState from "@/components/admin/shared/EmptyState";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import {
  getSalesQuotationById,
  getSalesQuotationItemFormOptions,
  type SalesQuotationAddress,
  type SalesQuotationSource,
} from "@/lib/repositories/sales-quotation.repository";
import { cn } from "@/lib/utils";
import QuickSalesQuotationItemsForm from "@/components/admin/sales/quotations/items/QuickSalesQuotationItemsForm";

interface SalesQuotationDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SalesQuotationDetailsPage({
  params,
}: SalesQuotationDetailsPageProps) {
  const { id } = await params;

  const [quotation, itemOptions] = await Promise.all([
    getSalesQuotationById(id),
    getSalesQuotationItemFormOptions(),
  ]);

  if (!quotation) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={quotation.quotation_number}
        description={`${quotation.customer?.display_name ?? "Unknown customer"} · ${formatDate(
          quotation.quotation_date,
        )}`}
        icon={FileText}
        backLink={{
          href: "/admin/sales/quotations",
          label: "Sales Quotations",
          icon: ArrowLeft,
        }}
      >
        <StatusBadge status={quotation.status} />

        {quotation.status === "draft" ? (
          <Link
            href={`/admin/sales/quotations/${quotation.id}/edit`}
            className={cn(
              buttonVariants({
                variant: "outline",
                size: "default",
              }),
            )}
          >
            <Pencil className="size-4" />
            Edit Quotation
          </Link>
        ) : null}
      </PageHeader>

      <section className="grid gap-6 xl:grid-cols-2">
        <DetailsCard
          title="Customer Information"
          description="Customer and contact linked to this quotation."
        >
          <div className="space-y-5">
            <DetailItem
              icon={UserRound}
              label="Customer"
              value={quotation.customer?.display_name ?? "Customer unavailable"}
              secondaryValue={quotation.customer?.customer_number ?? null}
            />

            <DetailItem
              icon={ContactRound}
              label="Contact"
              value={quotation.customer_contact?.contact_name ?? "Not selected"}
              secondaryValue={
                quotation.customer_contact?.job_title ??
                quotation.customer_contact?.email ??
                quotation.customer_contact?.phone ??
                null
              }
            />

            <DetailItem
              icon={ReceiptText}
              label="Customer Reference"
              value={quotation.customer_reference ?? "Not provided"}
            />

            <DetailItem
              icon={FileText}
              label="Source"
              value={formatSource(quotation.source)}
              secondaryValue={quotation.external_reference}
            />
          </div>
        </DetailsCard>

        <DetailsCard
          title="Quotation Information"
          description="Validity, warehouse and commercial setup."
        >
          <div className="space-y-5">
            <DetailItem
              icon={CalendarDays}
              label="Quotation Date"
              value={formatDate(quotation.quotation_date)}
            />

            <DetailItem
              icon={CalendarDays}
              label="Valid Until"
              value={
                quotation.valid_until
                  ? formatDate(quotation.valid_until)
                  : "Not specified"
              }
            />

            <DetailItem
              icon={Building2}
              label="Warehouse"
              value={quotation.warehouse?.name ?? "Not selected"}
              secondaryValue={quotation.warehouse?.code ?? null}
            />

            <DetailItem
              icon={CircleDollarSign}
              label="Currency"
              value={quotation.currency_code}
              secondaryValue={`Exchange rate: ${quotation.exchange_rate}`}
            />
          </div>
        </DetailsCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AddressDetailsCard
          title="Billing Address"
          description="Address used for billing and invoicing."
          address={quotation.billing_address}
        />

        <AddressDetailsCard
          title="Shipping Address"
          description="Address used for delivery and fulfilment."
          address={quotation.shipping_address}
        />
      </section>

      <DetailsCard
        title="Quotation Items"
        description="Products and custom sourcing lines included in this quotation."
        footer={
          quotation.status === "draft" ? (
            <Link
              href={`/admin/sales/quotations/${quotation.id}/items/new`}
              className={cn(
                buttonVariants({
                  variant: "outline",
                  size: "default",
                }),
              )}
            >
              <Plus className="size-4" />
              Detailed Add Item
            </Link>
          ) : null
        }
      >
        {quotation.status === "draft" ? (
          <div className="mb-6">
            <QuickSalesQuotationItemsForm
              quotationId={quotation.id}
              currencyCode={quotation.currency_code}
              options={itemOptions}
            />
          </div>
        ) : null}
        {quotation.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    #
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Item
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Qty
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Unit
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Unit Price
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Discount
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tax
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {quotation.items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="px-4 py-4 text-sm">{item.line_number}</td>

                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold">{item.item_name}</p>

                        {item.sku ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            SKU: {item.sku}
                          </p>
                        ) : null}

                        {item.description ? (
                          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm">
                      {formatQuantity(item.quantity)}
                    </td>

                    <td className="px-4 py-4 text-sm">
                      {item.unit?.short_name ?? item.unit?.name ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-right text-sm">
                      {formatCurrency(item.unit_price, quotation.currency_code)}
                    </td>

                    <td className="px-4 py-4 text-right text-sm">
                      {item.discount_percentage}%
                    </td>

                    <td className="px-4 py-4 text-right text-sm">
                      {item.tax_percentage}%
                    </td>

                    <td className="px-4 py-4 text-right text-sm font-semibold">
                      {formatCurrency(item.line_total, quotation.currency_code)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {quotation.status === "draft" ? (
                        <Link
                          href={`/admin/sales/quotations/${quotation.id}/items/${item.id}/edit`}
                          aria-label={`Edit ${item.item_name}`}
                          className={cn(
                            buttonVariants({
                              variant: "ghost",
                              size: "icon",
                            }),
                          )}
                        >
                          <Pencil className="size-4" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            compact
            icon={FileText}
            title="No quotation items"
            description="Add products or custom sourcing lines to complete this quotation."
            action={
              quotation.status === "draft"
                ? {
                    href: `/admin/sales/quotations/${quotation.id}/items/new`,
                    label: "Add Item",
                    icon: Plus,
                  }
                : undefined
            }
          />
        )}
      </DetailsCard>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <DetailsCard
          title="Terms & Notes"
          description="Customer-facing and internal quotation information."
        >
          <div className="space-y-6">
            <NotesBlock
              title="Delivery Terms"
              value={quotation.delivery_terms}
            />

            <NotesBlock title="Payment Terms" value={quotation.payment_terms} />

            <NotesBlock
              title="Customer Notes"
              value={quotation.customer_notes}
            />

            <NotesBlock
              title="Internal Notes"
              value={quotation.internal_notes}
            />
          </div>
        </DetailsCard>

        <DetailsCard
          title="Quotation Totals"
          description="Calculated from the quotation lines."
        >
          <div className="divide-y rounded-lg border">
            <TotalRow
              label="Subtotal"
              value={formatCurrency(
                quotation.subtotal,
                quotation.currency_code,
              )}
            />

            <TotalRow
              label="Discount"
              value={`- ${formatCurrency(
                quotation.discount_amount,
                quotation.currency_code,
              )}`}
            />

            <TotalRow
              label="Tax"
              value={formatCurrency(
                quotation.tax_amount,
                quotation.currency_code,
              )}
            />

            <TotalRow
              label="Shipping"
              value={formatCurrency(
                quotation.shipping_amount,
                quotation.currency_code,
              )}
            />

            <TotalRow
              label="Grand Total"
              value={formatCurrency(
                quotation.grand_total,
                quotation.currency_code,
              )}
              emphasized
            />
          </div>

          <div className="mt-4 rounded-lg border bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payment Terms
            </p>

            <p className="mt-2 text-sm font-medium">
              {quotation.payment_terms_days} day
              {quotation.payment_terms_days === 1 ? "" : "s"}
            </p>
          </div>
        </DetailsCard>
      </section>

      <DetailsCard title="System Information">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SystemInformation
            label="Created"
            value={formatDateTime(quotation.created_at)}
          />

          <SystemInformation
            label="Last Updated"
            value={formatDateTime(quotation.updated_at)}
          />

          <SystemInformation
            label="Sent"
            value={
              quotation.sent_at ? formatDateTime(quotation.sent_at) : "Not sent"
            }
          />

          <SystemInformation
            label="Accepted"
            value={
              quotation.accepted_at
                ? formatDateTime(quotation.accepted_at)
                : "Not accepted"
            }
          />
        </div>
      </DetailsCard>
    </div>
  );
}

interface DetailItemProps {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: string;
  secondaryValue?: string | null;
}

function DetailItem({
  icon: Icon,
  label,
  value,
  secondaryValue,
}: DetailItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>

      <div>
        <p className="text-sm font-medium">{label}</p>

        <p className="mt-1 text-sm text-muted-foreground">{value}</p>

        {secondaryValue ? (
          <p className="mt-1 text-xs text-muted-foreground">{secondaryValue}</p>
        ) : null}
      </div>
    </div>
  );
}

interface AddressDetailsCardProps {
  title: string;
  description: string;
  address: SalesQuotationAddress | null;
}

function AddressDetailsCard({
  title,
  description,
  address,
}: AddressDetailsCardProps) {
  return (
    <DetailsCard title={title} description={description}>
      {address ? (
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPin className="size-4" />
          </div>

          <div>
            <p className="font-semibold">
              {address.address_name?.trim() || title}
            </p>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {formatAddress(address)}
            </p>

            {address.contact_name || address.phone ? (
              <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
                <SmallDetail label="Contact" value={address.contact_name} />

                <SmallDetail label="Phone" value={address.phone} />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <EmptyState
          compact
          icon={MapPin}
          title={`No ${title.toLowerCase()}`}
          description={`No ${title.toLowerCase()} has been selected for this quotation.`}
        />
      )}
    </DetailsCard>
  );
}

function NotesBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {value?.trim() || "Not provided"}
      </p>
    </div>
  );
}

function TotalRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span
        className={
          emphasized ? "font-semibold" : "text-sm text-muted-foreground"
        }
      >
        {label}
      </span>

      <span
        className={emphasized ? "text-lg font-semibold" : "text-sm font-medium"}
      >
        {value}
      </span>
    </div>
  );
}

function SmallDetail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-medium">{value?.trim() || "Not provided"}</p>
    </div>
  );
}

function SystemInformation({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function formatSource(source: SalesQuotationSource): string {
  const labels: Record<SalesQuotationSource, string> = {
    internal: "Internal",
    hmshoponline: "HMShopOnline",
    dubaiwholesalehub: "Dubai Wholesale Hub",
    import: "Imported",
  };

  return labels[source];
}

function formatAddress(address: SalesQuotationAddress): string {
  return [
    address.address_line_1,
    address.address_line_2,
    address.city,
    address.state,
    address.country,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatDate(value: string): string {
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

function formatDateTime(value: string): string {
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

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 4,
  }).format(value);
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
