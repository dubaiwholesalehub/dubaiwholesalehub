import Link from "next/link";
import type { Database } from "@/lib/database.types";
import { getPurchaseOrders } from "@/lib/repositories/purchase-orders";
import { PurchaseOrderTable } from "@/components/admin/purchase-orders/purchase-order-table";
import { PurchaseOrderToolbar } from "@/components/admin/purchase-orders/purchase-order-toolbar";

interface PurchaseOrdersPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

type PurchaseOrderStatus =
  Database["public"]["Enums"]["purchase_order_status"];

type PurchaseOrderStatusFilter =
  | PurchaseOrderStatus
  | "all";

const purchaseOrderStatuses:
  readonly PurchaseOrderStatusFilter[] = [
    "all",
    "draft",
    "approved",
    "sent",
    "partially_received",
    "received",
    "closed",
    "cancelled",
  ];

function parsePurchaseOrderStatus(
  value: string | undefined,
): PurchaseOrderStatusFilter | undefined {
  if (!value) {
    return undefined;
  }

  return purchaseOrderStatuses.includes(
    value as PurchaseOrderStatusFilter,
  )
    ? (value as PurchaseOrderStatusFilter)
    : undefined;
}

function createPageHref({
  search,
  status,
  page,
}: {
  search: string;
  status: PurchaseOrderStatusFilter | undefined;
  page: number;
}): string {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  if (status && status !== "all") {
    params.set("status", status);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query
    ? `/admin/purchase-orders?${query}`
    : "/admin/purchase-orders";
}

export default async function PurchaseOrdersPage({
  searchParams,
}: PurchaseOrdersPageProps) {
  const params = await searchParams;

  const search = params.search?.trim() ?? "";

  const status = parsePurchaseOrderStatus(
    params.status?.trim(),
  );

  const requestedPage = Math.max(
    Number(params.page) || 1,
    1,
  );

  const {
    data: purchaseOrders,
    count,
    page,
    totalPages,
  } = await getPurchaseOrders({
    search: search || undefined,
    status,
    page: requestedPage,
  });

  const draftPurchaseOrders =
    purchaseOrders.filter(
      (purchaseOrder) =>
        purchaseOrder.status === "draft",
    ).length;

  const activePurchaseOrders =
    purchaseOrders.filter(
      (purchaseOrder) =>
        purchaseOrder.status === "approved" ||
        purchaseOrder.status === "sent" ||
        purchaseOrder.status ===
          "partially_received",
    ).length;

  const receivedPurchaseOrders =
    purchaseOrders.filter(
      (purchaseOrder) =>
        purchaseOrder.status === "received" ||
        purchaseOrder.status === "closed",
    ).length;

  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Purchase Orders
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage supplier Purchase Orders generated from
            awarded quotations.
          </p>
        </div>

        <Link
          href="/admin/rfqs?status=awarded"
          className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          View Awarded RFQs
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PurchaseOrderSummaryCard
          label="Total Purchase Orders"
          value={String(count)}
          description="Matching Purchase Orders"
        />

        <PurchaseOrderSummaryCard
          label="Draft"
          value={String(draftPurchaseOrders)}
          description="Visible drafts being prepared"
        />

        <PurchaseOrderSummaryCard
          label="In Progress"
          value={String(activePurchaseOrders)}
          description="Visible active supplier orders"
        />

        <PurchaseOrderSummaryCard
          label="Received"
          value={String(receivedPurchaseOrders)}
          description="Visible received or closed orders"
        />
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">
            Purchase Order Repository
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Search and manage all supplier Purchase Orders.
          </p>
        </div>

        <PurchaseOrderToolbar
          search={search}
          status={
            status === "all"
              ? ""
              : status ?? ""
          }
        />

        <PurchaseOrderTable
          purchaseOrders={purchaseOrders}
        />

        {count > 0 ? (
          <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {count}{" "}
              Purchase Order{count === 1 ? "" : "s"}
            </p>

            <div className="flex items-center gap-2">
              {hasPreviousPage ? (
                <Link
                  href={createPageHref({
                    search,
                    status,
                    page: page - 1,
                  })}
                  className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm transition-colors hover:bg-muted"
                >
                  Previous
                </Link>
              ) : (
                <span className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-md border px-3 text-sm text-muted-foreground opacity-50">
                  Previous
                </span>
              )}

              {hasNextPage ? (
                <Link
                  href={createPageHref({
                    search,
                    status,
                    page: page + 1,
                  })}
                  className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm transition-colors hover:bg-muted"
                >
                  Next
                </Link>
              ) : (
                <span className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-md border px-3 text-sm text-muted-foreground opacity-50">
                  Next
                </span>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

interface PurchaseOrderSummaryCardProps {
  label: string;
  value: string;
  description: string;
}

function PurchaseOrderSummaryCard({
  label,
  value,
  description,
}: PurchaseOrderSummaryCardProps) {
  return (
    <article className="rounded-lg border bg-card p-5 text-card-foreground">
      <p className="text-sm font-medium text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {description}
      </p>
    </article>
  );
}