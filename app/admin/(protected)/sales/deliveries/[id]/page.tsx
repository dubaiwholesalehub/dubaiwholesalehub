import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  MapPin,
  Package,
  Truck,
  Warehouse,
} from "lucide-react";

import DetailsCard from "@/components/admin/shared/DetailsCard";
import PageHeader from "@/components/admin/shared/PageHeader";
import DeliveryItemsTable from "@/components/admin/sales/deliveries/DeliveryItemsTable";
import DeliveryStatusBadge from "@/components/admin/sales/deliveries/DeliveryStatusBadge";
import DeliveryWorkflowActions from "@/components/admin/sales/deliveries/DeliveryWorkflowActions";
import { getDeliveryOrderById } from "@/lib/repositories/delivery-order.repository";

interface DeliveryOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DeliveryOrderDetailPage({
  params,
}: DeliveryOrderDetailPageProps) {
  const { id } = await params;

  const delivery = await getDeliveryOrderById(id);

  if (!delivery) {
    notFound();
  }

  const totalPlanned = delivery.items.reduce(
    (total, item) => total + item.delivery_quantity,
    0,
  );

  const totalPicked = delivery.items.reduce(
    (total, item) => total + item.picked_quantity,
    0,
  );

  const totalPacked = delivery.items.reduce(
    (total, item) => total + item.packed_quantity,
    0,
  );

  const totalDispatched = delivery.items.reduce(
    (total, item) => total + item.dispatched_quantity,
    0,
  );

  const totalDelivered = delivery.items.reduce(
    (total, item) => total + item.delivered_quantity,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={delivery.delivery_number}
        description="Warehouse picking, packing, dispatch and delivery execution."
        icon={Truck}
        backLink={{
          href: "/admin/sales/deliveries",
          label: "Delivery Orders",
          icon: ArrowLeft,
        }}
      >
        <DeliveryStatusBadge status={delivery.status} />

        <DeliveryWorkflowActions
          deliveryOrderId={delivery.id}
          status={delivery.status}
          hasItems={delivery.items.length > 0}
        />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-3">
        <DetailsCard title="Delivery Information">
          <div className="grid gap-5 sm:grid-cols-2">
            <DetailItem
              icon={CalendarDays}
              label="Delivery Date"
              value={formatDate(delivery.delivery_date)}
            />

            <DetailItem
              icon={CalendarDays}
              label="Expected Date"
              value={
                delivery.expected_delivery_date
                  ? formatDate(delivery.expected_delivery_date)
                  : "Not set"
              }
            />

            <DetailItem
              icon={Truck}
              label="Delivery Method"
              value={formatLabel(delivery.delivery_method)}
            />

            <DetailItem
              icon={ClipboardList}
              label="Priority"
              value={formatLabel(delivery.priority)}
            />
          </div>
        </DetailsCard>

        <DetailsCard title="Customer and Sales Order">
          <div className="space-y-5">
            <DetailItem
              icon={Package}
              label="Customer"
              value={delivery.customer?.display_name ?? "Unknown customer"}
              secondary={delivery.customer?.customer_number ?? undefined}
            />

            <DetailItem
              icon={ClipboardList}
              label="Sales Order"
              value={delivery.sales_order?.order_number ?? "Unavailable"}
              href={
                delivery.sales_order
                  ? `/admin/sales/orders/${delivery.sales_order.id}`
                  : undefined
              }
            />
          </div>
        </DetailsCard>

        <DetailsCard title="Warehouse and Address">
          <div className="space-y-5">
            <DetailItem
              icon={Warehouse}
              label="Warehouse"
              value={delivery.warehouse?.name ?? "Unknown warehouse"}
              secondary={delivery.warehouse?.code ?? undefined}
            />

            <DetailItem
              icon={MapPin}
              label="Shipping Address"
              value={formatAddress(delivery.shipping_address)}
            />
          </div>
        </DetailsCard>
      </div>

      <DetailsCard title="Warehouse Progress">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Planned" value={totalPlanned} />

          <MetricCard label="Picked" value={totalPicked} />

          <MetricCard label="Packed" value={totalPacked} />

          <MetricCard label="Dispatched" value={totalDispatched} />

          <MetricCard label="Delivered" value={totalDelivered} />
        </div>
      </DetailsCard>

      <DetailsCard title="Delivery Items">
        <DeliveryItemsTable
          deliveryOrderId={delivery.id}
          status={delivery.status}
          items={delivery.items}
        />
      </DetailsCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <DetailsCard title="Transport Information">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextDetail label="Carrier" value={delivery.carrier_name} />

            <TextDetail
              label="Tracking Number"
              value={delivery.tracking_number}
            />

            <TextDetail
              label="Vehicle Number"
              value={delivery.vehicle_number}
            />

            <TextDetail label="Driver" value={delivery.driver_name} />

            <TextDetail label="Driver Phone" value={delivery.driver_phone} />
          </div>
        </DetailsCard>

        <DetailsCard title="Notes">
          <div className="space-y-5">
            <TextDetail label="Packing Notes" value={delivery.packing_notes} />

            <TextDetail
              label="Delivery Notes"
              value={delivery.delivery_notes}
            />

            <TextDetail
              label="Internal Notes"
              value={delivery.internal_notes}
            />
          </div>
        </DetailsCard>
      </div>

      <DetailsCard title="System Information">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <TextDetail
            label="Created"
            value={formatDateTime(delivery.created_at)}
          />

          <TextDetail
            label="Last Updated"
            value={formatDateTime(delivery.updated_at)}
          />

          <TextDetail
            label="Picked At"
            value={
              delivery.picked_at ? formatDateTime(delivery.picked_at) : null
            }
          />

          <TextDetail
            label="Packed At"
            value={
              delivery.packed_at ? formatDateTime(delivery.packed_at) : null
            }
          />

          <TextDetail
            label="Dispatched At"
            value={
              delivery.dispatched_at
                ? formatDateTime(delivery.dispatched_at)
                : null
            }
          />

          <TextDetail
            label="Delivered At"
            value={
              delivery.delivered_at
                ? formatDateTime(delivery.delivered_at)
                : null
            }
          />
        </div>
      </DetailsCard>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  secondary,
  href,
}: {
  icon: typeof Truck;
  label: string;
  value: string;
  secondary?: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-sm font-medium">{value}</p>

      {secondary ? (
        <p className="mt-1 text-xs text-muted-foreground">{secondary}</p>
      ) : null}
    </>
  );

  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-muted p-2 text-muted-foreground">
        <Icon className="size-4" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <div className="mt-1">
          {href ? (
            <Link href={href} className="transition-colors hover:text-primary">
              {content}
            </Link>
          ) : (
            content
          )}
        </div>
      </div>
    </div>
  );
}

function TextDetail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-wrap text-sm">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold">{formatQuantity(value)}</p>
    </div>
  );
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAddress(
  address: {
    address_name: string | null;
    contact_name: string | null;
    phone: string | null;
    address_line_1: string;
    address_line_2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
  } | null,
): string {
  if (!address) {
    return "Not provided";
  }

  return [
    address.address_name,
    address.contact_name,
    address.address_line_1,
    address.address_line_2,
    address.city,
    address.state,
    address.country,
    address.postal_code,
    address.phone,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 4,
  }).format(value);
}
