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
  PackageCheck,
  Pencil,
  ReceiptText,
  ShoppingCart,
  Printer,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react";

import DetailsCard from "@/components/admin/shared/DetailsCard";
import EmptyState from "@/components/admin/shared/EmptyState";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import {
  getSalesOrderById,
  type SalesOrderAddress,
  type SalesOrderFulfilmentStatus,
  type SalesOrderPaymentStatus,
  type SalesOrderSource,
  getSalesOrderMarginAnalysis,
  getSalesMarginApproval,
} from "@/lib/repositories/sales-order.repository";
import { cn } from "@/lib/utils";
import SalesOrderWorkflowActions from "@/components/admin/sales/orders/SalesOrderWorkflowActions";

interface SalesOrderDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SalesOrderDetailsPage({
  params,
}: SalesOrderDetailsPageProps) {
  const { id } = await params;

  const [order, marginAnalysis, marginApproval] = await Promise.all([
    getSalesOrderById(id),

    getSalesOrderMarginAnalysis(id),

    getSalesMarginApproval(id),
  ]);

  if (!order) {
    notFound();
  }

  const requiresMarginApproval = marginAnalysis.some(
    (line) =>
      line.marginStatus === "blocked" || line.marginStatus === "cost_missing",
  );

  const hasApprovedMarginException = marginApproval?.status === "approved";
  const hasMarginWarning = marginAnalysis.some(
    (line) => line.marginStatus === "warning",
  );

  const marginPercentages = marginAnalysis
    .map((line) => line.estimatedMarginPercentage)
    .filter((value): value is number => value !== null);

  const lowestMarginPercentage =
    marginPercentages.length > 0 ? Math.min(...marginPercentages) : null;
  return (
    <div className="space-y-6">
      <PageHeader
        title={order.order_number}
        description={`${
          order.customer?.display_name ?? "Unknown customer"
        } · ${formatDate(order.order_date)}`}
        icon={ShoppingCart}
        backLink={{
          href: "/admin/sales/orders",
          label: "Sales Orders",
          icon: ArrowLeft,
        }}
      >
        <StatusBadge status={order.status} />

        {order.status === "draft" ? (
          <Link
            href={`/admin/sales/orders/${order.id}/edit`}
            className={cn(
              buttonVariants({
                variant: "outline",
                size: "default",
              }),
            )}
          >
            <Pencil className="size-4" />
            Edit Sales Order
          </Link>
        ) : null}
        {order.status !== "draft" && order.status !== "cancelled" ? (
          <Link
            href={`/admin/sales/orders/${order.id}/invoice`}
            className={cn(
              buttonVariants({
                variant: "outline",
                size: "default",
              }),
            )}
          >
            <Printer className="size-4" />
            Invoice / Print
          </Link>
        ) : null}
        <SalesOrderWorkflowActions
          salesOrderId={order.id}

          status={order.status}

          hasItems={order.items.length > 0}

          requiresMarginApproval={requiresMarginApproval}

          hasApprovedMarginException={hasApprovedMarginException}

          hasMarginWarning={hasMarginWarning}

          lowestMarginPercentage={lowestMarginPercentage}
        />
      </PageHeader>

      <section className="grid gap-6 xl:grid-cols-2">
        <DetailsCard
          title="Customer Information"
          description="Customer and contact linked to this sales order."
        >
          <div className="space-y-5">
            <DetailItem
              icon={UserRound}
              label="Customer"
              value={order.customer?.display_name ?? "Customer unavailable"}
              secondaryValue={order.customer?.customer_number ?? null}
            />

            <DetailItem
              icon={ContactRound}
              label="Contact"
              value={order.customer_contact?.contact_name ?? "Not selected"}
              secondaryValue={
                order.customer_contact?.job_title ??
                order.customer_contact?.email ??
                order.customer_contact?.phone ??
                null
              }
            />

            <DetailItem
              icon={ReceiptText}
              label="Customer Reference"
              value={order.customer_reference ?? "Not provided"}
            />

            <DetailItem
              icon={FileText}
              label="Source"
              value={formatSource(order.source)}
              secondaryValue={order.external_reference}
            />

            {order.quotation ? (
              <DetailItem
                icon={FileText}
                label="Quotation"
                value={order.quotation.quotation_number}
                secondaryValue={formatDate(order.quotation.quotation_date)}
              />
            ) : null}
          </div>
        </DetailsCard>

        <DetailsCard
          title="Order Information"
          description="Dates, warehouse and commercial setup."
        >
          <div className="space-y-5">
            <DetailItem
              icon={CalendarDays}
              label="Order Date"
              value={formatDate(order.order_date)}
            />

            <DetailItem
              icon={Truck}
              label="Requested Delivery"
              value={
                order.requested_delivery_date
                  ? formatDate(order.requested_delivery_date)
                  : "Not specified"
              }
            />

            <DetailItem
              icon={Truck}
              label="Expected Delivery"
              value={
                order.expected_delivery_date
                  ? formatDate(order.expected_delivery_date)
                  : "Not specified"
              }
            />

            <DetailItem
              icon={Building2}
              label="Warehouse"
              value={order.warehouse?.name ?? "Not selected"}
              secondaryValue={order.warehouse?.code ?? null}
            />

            <DetailItem
              icon={CircleDollarSign}
              label="Currency"
              value={order.currency_code}
              secondaryValue={`Exchange rate: ${order.exchange_rate}`}
            />
          </div>
        </DetailsCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <StatusInformationCard
          title="Order Status"
          icon={ShoppingCart}
          value={formatLabel(order.status)}
        />

        <StatusInformationCard
          title="Fulfilment Status"
          icon={PackageCheck}
          value={formatFulfilmentStatus(order.fulfilment_status)}
        />

        <StatusInformationCard
          title="Payment Status"
          icon={WalletCards}
          value={formatPaymentStatus(order.payment_status)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AddressDetailsCard
          title="Billing Address"
          description="Address used for billing and invoicing."
          address={order.billing_address}
        />

        <AddressDetailsCard
          title="Shipping Address"
          description="Address used for delivery and fulfilment."
          address={order.shipping_address}
        />
      </section>

      {/* =====================================================
          Margin Analysis
          ===================================================== */}

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Margin Analysis</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Estimated margin based on the current warehouse average inventory
              cost.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[950px] text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3 text-right">Qty</th>
                <th className="px-3 py-3 text-right">Sell / Unit</th>
                <th className="px-3 py-3 text-right">Cost / Unit</th>
                <th className="px-3 py-3 text-right">Profit</th>
                <th className="px-3 py-3 text-right">Margin</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {marginAnalysis.map((line) => (
                <tr key={line.salesOrderItemId}>
                  <td className="px-3 py-4">
                    <p className="font-medium">{line.itemName}</p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {line.sku ?? "No SKU"}
                    </p>
                  </td>

                  <td className="px-3 py-4 text-right">
                    {line.quantity.toFixed(2)}
                  </td>

                  <td className="px-3 py-4 text-right">
                    AED {line.effectiveUnitSellingPrice.toFixed(2)}
                  </td>

                  <td className="px-3 py-4 text-right">
                    {line.currentUnitCost === null
                      ? "—"
                      : `AED ${line.currentUnitCost.toFixed(2)}`}
                  </td>

                  <td
                    className={`px-3 py-4 text-right font-semibold ${
                      (line.estimatedGrossProfit ?? 0) < 0
                        ? "text-red-700"
                        : "text-emerald-700"
                    }`}
                  >
                    {line.estimatedGrossProfit === null
                      ? "—"
                      : `AED ${line.estimatedGrossProfit.toFixed(2)}`}
                  </td>

                  <td className="px-3 py-4 text-right font-semibold">
                    {line.estimatedMarginPercentage === null
                      ? "—"
                      : `${line.estimatedMarginPercentage.toFixed(2)}%`}
                  </td>

                  <td className="px-3 py-4">
                    <span
                      className={
                        line.marginStatus === "healthy"
                          ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                          : line.marginStatus === "warning"
                            ? "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"
                            : "rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800"
                      }
                    >
                      {line.marginStatus === "healthy"
                        ? "Healthy"
                        : line.marginStatus === "warning"
                          ? "Warning"
                          : line.marginStatus === "blocked"
                            ? "Approval Required"
                            : "Cost Review"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <DetailsCard
        title="Sales Order Items"
        description="Products and custom lines included in this order."
      >
        {order.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px] border-collapse text-left">
              <thead className="border-b bg-muted/40">
                <tr>
                  <TableHeader>#</TableHeader>

                  <TableHeader>Item</TableHeader>

                  <TableHeader>Fulfilment</TableHeader>

                  <TableHeader>Warehouse</TableHeader>

                  <TableHeader>Qty</TableHeader>

                  <TableHeader>Reserved</TableHeader>

                  <TableHeader>Allocated</TableHeader>

                  <TableHeader>Fulfilled</TableHeader>

                  <TableHeader>Shortage</TableHeader>

                  <TableHeader align="right">Unit Price</TableHeader>

                  <TableHeader align="right">Discount</TableHeader>

                  <TableHeader align="right">Tax</TableHeader>

                  <TableHeader align="right">Total</TableHeader>
                </tr>
              </thead>

              <tbody className="divide-y">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <TableCell>{item.line_number}</TableCell>

                    <TableCell>
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

                        {item.procurement_required ? (
                          <p className="mt-2 text-xs font-medium text-amber-700">
                            Procurement required
                          </p>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {formatLabel(item.fulfilment_method)}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {formatFulfilmentStatus(
                            item.fulfilment_status === "cancelled"
                              ? "unplanned"
                              : item.fulfilment_status,
                          )}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="text-sm">
                          {item.warehouse?.name ?? "Order warehouse"}
                        </p>

                        {item.warehouse?.code ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.warehouse.code}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell>{formatQuantity(item.quantity)}</TableCell>

                    <TableCell>
                      {formatQuantity(item.quantity_reserved)}
                    </TableCell>

                    <TableCell>
                      {formatQuantity(item.quantity_allocated)}
                    </TableCell>

                    <TableCell>
                      {formatQuantity(item.quantity_fulfilled)}
                    </TableCell>

                    <TableCell>
                      <span
                        className={
                          item.shortage_quantity > 0
                            ? "font-semibold text-amber-700"
                            : "text-muted-foreground"
                        }
                      >
                        {formatQuantity(item.shortage_quantity)}
                      </span>
                    </TableCell>

                    <TableCell align="right">
                      {formatCurrency(item.unit_price, order.currency_code)}
                    </TableCell>

                    <TableCell align="right">
                      {item.discount_percentage}%
                    </TableCell>

                    <TableCell align="right">{item.tax_percentage}%</TableCell>

                    <TableCell align="right">
                      <span className="font-semibold">
                        {formatCurrency(item.line_total, order.currency_code)}
                      </span>
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            compact
            icon={ShoppingCart}
            title="No sales order items"
            description="This sales order does not contain any items yet."
          />
        )}
      </DetailsCard>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <DetailsCard
          title="Terms & Notes"
          description="Customer-facing and internal sales order information."
        >
          <div className="space-y-6">
            <NotesBlock title="Delivery Terms" value={order.delivery_terms} />

            <NotesBlock title="Payment Terms" value={order.payment_terms} />

            <NotesBlock title="Customer Notes" value={order.customer_notes} />

            <NotesBlock title="Internal Notes" value={order.internal_notes} />
          </div>
        </DetailsCard>

        <DetailsCard
          title="Order Totals"
          description="Calculated from the sales order lines."
        >
          <div className="divide-y rounded-lg border">
            <TotalRow
              label="Subtotal"
              value={formatCurrency(order.subtotal, order.currency_code)}
            />

            <TotalRow
              label="Discount"
              value={`- ${formatCurrency(
                order.discount_amount,
                order.currency_code,
              )}`}
            />

            <TotalRow
              label="Tax"
              value={formatCurrency(order.tax_amount, order.currency_code)}
            />

            <TotalRow
              label="Shipping"
              value={formatCurrency(order.shipping_amount, order.currency_code)}
            />

            <TotalRow
              label="Grand Total"
              value={formatCurrency(order.grand_total, order.currency_code)}
              emphasized
            />

            <TotalRow
              label="Paid Amount"
              value={formatCurrency(order.paid_amount, order.currency_code)}
            />

            <TotalRow
              label="Balance Due"
              value={formatCurrency(order.balance_due, order.currency_code)}
              emphasized
            />
          </div>

          <div className="mt-4 rounded-lg border bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payment Terms
            </p>

            <p className="mt-2 text-sm font-medium">
              {order.payment_terms_days} day
              {order.payment_terms_days === 1 ? "" : "s"}
            </p>
          </div>
        </DetailsCard>
      </section>

      <DetailsCard title="System Information">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SystemInformation
            label="Created"
            value={formatDateTime(order.created_at)}
          />

          <SystemInformation
            label="Last Updated"
            value={formatDateTime(order.updated_at)}
          />

          <SystemInformation
            label="Confirmed"
            value={
              order.confirmed_at
                ? formatDateTime(order.confirmed_at)
                : "Not confirmed"
            }
          />

          <SystemInformation
            label="Processing"
            value={
              order.processing_at
                ? formatDateTime(order.processing_at)
                : "Not processing"
            }
          />

          <SystemInformation
            label="Completed"
            value={
              order.completed_at
                ? formatDateTime(order.completed_at)
                : "Not completed"
            }
          />

          <SystemInformation
            label="Cancelled"
            value={
              order.cancelled_at
                ? formatDateTime(order.cancelled_at)
                : "Not cancelled"
            }
          />

          <SystemInformation
            label="Closed"
            value={
              order.closed_at ? formatDateTime(order.closed_at) : "Not closed"
            }
          />

          <SystemInformation
            label="Source"
            value={formatSource(order.source)}
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
  address: SalesOrderAddress | null;
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
          description={`No ${title.toLowerCase()} has been selected for this order.`}
        />
      )}
    </DetailsCard>
  );
}

function StatusInformationCard({
  title,
  icon: Icon,
  value,
}: {
  title: string;

  icon: React.ComponentType<{
    className?: string;
  }>;

  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>

          <p className="mt-1 font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td className={cn("px-4 py-4 text-sm", align === "right" && "text-right")}>
      {children}
    </td>
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

function formatSource(source: SalesOrderSource): string {
  const labels: Record<SalesOrderSource, string> = {
    internal: "Internal",
    hmshoponline: "HMShopOnline",
    dubaiwholesalehub: "Dubai Wholesale Hub",
    import: "Imported",
  };

  return labels[source];
}

function formatFulfilmentStatus(status: SalesOrderFulfilmentStatus): string {
  const labels: Record<SalesOrderFulfilmentStatus, string> = {
    unplanned: "Unplanned",
    awaiting_stock: "Awaiting Stock",
    awaiting_procurement: "Awaiting Procurement",
    partially_allocated: "Partially Allocated",
    allocated: "Allocated",
    partially_fulfilled: "Partially Fulfilled",
    fulfilled: "Fulfilled",
    not_required: "Not Required",
  };

  return labels[status];
}

function formatPaymentStatus(status: SalesOrderPaymentStatus): string {
  const labels: Record<SalesOrderPaymentStatus, string> = {
    unpaid: "Unpaid",
    partially_paid: "Partially Paid",
    paid: "Paid",
    overpaid: "Overpaid",
    refunded: "Refunded",
  };

  return labels[status];
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatAddress(address: SalesOrderAddress): string {
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
