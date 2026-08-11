"use client";

import { useState } from "react";
import {
  CalendarDays,
  Loader2,
  PackageCheck,
  Truck,
  Warehouse,
} from "lucide-react";

import { createDeliveryAction } from "@/app/admin/(protected)/sales/deliveries/actions";
import EmptyState from "@/components/admin/shared/EmptyState";
import { Button } from "@/components/ui/button";
import type { DeliverableSalesOrder } from "@/lib/repositories/delivery-order.repository";

interface CreateDeliveryListProps {
  orders: DeliverableSalesOrder[];
}

export default function CreateDeliveryList({
  orders,
}: CreateDeliveryListProps) {
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  async function handleCreate(salesOrderId: string, orderNumber: string) {
    const confirmed = window.confirm(
      `Create a Delivery Order from ${orderNumber}? The system will copy all currently reserved and deliverable stock items.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setPendingOrderId(salesOrderId);

    try {
      await createDeliveryAction(salesOrderId);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to create the delivery order.",
      );

      setPendingOrderId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={PackageCheck}
        title="No Sales Orders are ready for delivery"
        description="Confirm a Sales Order and reserve stock before creating a Delivery Order."
        action={{
          href: "/admin/sales/orders",
          label: "View Sales Orders",
          icon: Truck,
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        {orders.map((order) => {
          const isPending = pendingOrderId === order.id;

          return (
            <article
              key={order.id}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 space-y-4">
                  <div>
                    <p className="text-lg font-semibold">
                      {order.order_number}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.customer_name}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <InfoItem
                      icon={Warehouse}
                      label="Warehouse"
                      value={order.warehouse_name}
                    />

                    <InfoItem
                      icon={CalendarDays}
                      label="Order Date"
                      value={formatDate(order.order_date)}
                    />

                    <InfoItem
                      icon={CalendarDays}
                      label="Expected Delivery"
                      value={
                        order.expected_delivery_date
                          ? formatDate(order.expected_delivery_date)
                          : "Not set"
                      }
                    />

                    <InfoItem
                      icon={PackageCheck}
                      label="Deliverable Lines"
                      value={String(order.deliverable_line_count)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    <MetricBadge
                      label="Reserved"
                      value={order.reserved_quantity}
                    />

                    <MetricBadge
                      label="Fulfilled"
                      value={order.fulfilled_quantity}
                    />

                    <MetricBadge
                      label="Ready Now"
                      value={order.remaining_reserved_quantity}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 items-center">
                  <Button
                    type="button"
                    disabled={pendingOrderId !== null}
                    onClick={() => handleCreate(order.id, order.order_number)}
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Truck className="size-4" />
                    )}

                    {isPending ? "Creating..." : "Create Delivery"}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Warehouse;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-muted p-2 text-muted-foreground">
        <Icon className="size-4" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function MetricBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1.5">
      <span className="text-muted-foreground">{label}</span>

      <span className="font-semibold">{formatQuantity(value)}</span>
    </span>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 4,
  }).format(value);
}
