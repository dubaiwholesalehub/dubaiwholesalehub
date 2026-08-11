import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  Building2,
  CircleDollarSign,
  Globe2,
  ImageIcon,
  Package,
  Pencil,
  SearchCheck,
  Star,
  Tags,
  Truck,
  Warehouse,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  TrendingUp,
} from "lucide-react";

import DetailsCard from "@/components/admin/shared/DetailsCard";
import PageHeader from "@/components/admin/shared/PageHeader";
import ProductStatusBadge from "@/components/admin/products/ProductStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { getProductWorkspace } from "@/lib/repositories/product-workspace.repository";
import { getProductImageUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";

interface ProductWorkspacePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductWorkspacePage({
  params,
}: ProductWorkspacePageProps) {
  const { id } = await params;

  const workspace = await getProductWorkspace(id);

  if (!workspace) {
    notFound();
  }

  const { product, inventory, warehouseStock, supplierSummary, intelligence } =
    workspace;
  const primaryImage =
    [...product.product_images].sort((first, second) => {
      if (first.is_primary !== second.is_primary) {
        return first.is_primary ? -1 : 1;
      }

      return (first.sort_order ?? 0) - (second.sort_order ?? 0);
    })[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={[
          product.sku ? `SKU: ${product.sku}` : "No SKU",
          product.category?.name,
          product.subcategory?.name,
        ]
          .filter(Boolean)
          .join(" · ")}
        icon={Package}
        backLink={{
          href: "/admin/products",
          label: "Products",
          icon: ArrowLeft,
        }}
      >
        <ProductStatusBadge status={product.status ?? "draft"} />

        <Link
          href={`/admin/products?edit=${product.id}`}
          className={cn(
            buttonVariants({
              variant: "outline",
            }),
          )}
        >
          <Pencil className="size-4" />
          Edit Product
        </Link>

        <Link
          href={`/admin/products/${product.id}/suppliers`}
          className={cn(
            buttonVariants({
              variant: "outline",
            }),
          )}
        >
          <Building2 className="size-4" />
          Suppliers
        </Link>
      </PageHeader>

      <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <DetailsCard title="Product Identity">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border bg-muted/20">
              <div className="flex aspect-square items-center justify-center">
                {primaryImage ? (
                  (() => {
                    const imageUrl = getProductImageUrl(
                      primaryImage.storage_path,
                    );

                    return imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={primaryImage.alt_text ?? product.name}
                        className="h-full w-full object-contain p-4"
                      />
                    ) : (
                      <ImageIcon className="size-14 text-muted-foreground" />
                    );
                  })()
                ) : (
                  <ImageIcon className="size-14 text-muted-foreground" />
                )}
              </div>
            </div>

            <InformationRow label="Product Name" value={product.name} />

            <InformationRow label="SKU" value={product.sku} />

            <InformationRow label="Barcode" value={product.barcode} />

            <InformationRow label="Model Number" value={product.model_number} />

            <InformationRow
              label="Brand"
              value={product.brand?.name ?? "Generic / Not specified"}
            />
          </div>
        </DetailsCard>

        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Boxes}
              label="On Hand"
              value={formatQuantity(inventory.totalOnHand)}
              description="Physical stock"
            />

            <MetricCard
              icon={Warehouse}
              label="Reserved"
              value={formatQuantity(inventory.totalReserved)}
              description="Committed to orders"
            />

            <MetricCard
              icon={Package}
              label="Available"
              value={formatQuantity(inventory.totalAvailable)}
              description="Ready to sell"
            />

            <MetricCard
              icon={CircleDollarSign}
              label="Inventory Value"
              value={formatCurrency(inventory.totalInventoryValue, "AED")}
              description="Based on average cost"
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Building2}
              label="Active Suppliers"
              value={String(supplierSummary.activeSuppliers)}
              description={`${supplierSummary.totalSuppliers} total mappings`}
            />

            <MetricCard
              icon={Star}
              label="Preferred Supplier"
              value={
                supplierSummary.preferredSupplier?.supplierName ??
                "Not assigned"
              }
              description="Primary sourcing option"
            />

            <MetricCard
              icon={CircleDollarSign}
              label="Lowest Cost"
              value={
                supplierSummary.lowestCost
                  ? formatCurrency(
                      supplierSummary.lowestCost.amount,
                      supplierSummary.lowestCost.currencyCode,
                    )
                  : "Not available"
              }
              description={
                supplierSummary.lowestCost?.supplierName ?? "No supplier price"
              }
            />

            <MetricCard
              icon={Truck}
              label="Fastest Supplier"
              value={
                supplierSummary.fastestSupplier
                  ? `${supplierSummary.fastestSupplier.leadTimeDays} day${
                      supplierSummary.fastestSupplier.leadTimeDays === 1
                        ? ""
                        : "s"
                    }`
                  : "Not available"
              }
              description={
                supplierSummary.fastestSupplier?.supplierName ??
                "No lead time data"
              }
            />
          </section>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              icon={TrendingUp}
              label="Product Health"
              value={formatHealthLabel(intelligence.health.status)}
              description={getHealthDescription(intelligence.health.status)}
            />

            <MetricCard
              icon={Activity}
              label="Sold 30 Days"
              value={formatQuantity(intelligence.sales.sold30Days)}
              description="Actual inventory sales issues"
            />

            <MetricCard
              icon={Activity}
              label="Sold 90 Days"
              value={formatQuantity(intelligence.sales.sold90Days)}
              description="Actual inventory sales issues"
            />

            <MetricCard
              icon={Activity}
              label="Sold 180 Days"
              value={formatQuantity(intelligence.sales.sold180Days)}
              description="Actual inventory sales issues"
            />

            <MetricCard
              icon={Clock3}
              label="Last Sale"
              value={
                intelligence.sales.lastSaleDate
                  ? formatDate(intelligence.sales.lastSaleDate)
                  : "Never"
              }
              description="Latest posted sales issue"
            />
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DetailsCard
          title="Wholesale & Export"
          description="Commercial and export settings for this product."
        >
          <div className="divide-y rounded-lg border">
            <InformationRow
              label="Unit"
              value={
                product.unit
                  ? `${product.unit.name} (${product.unit.short_name})`
                  : "Not specified"
              }
            />

            <InformationRow
              label="Minimum Order Quantity"
              value={product.moq !== null ? formatQuantity(product.moq) : null}
            />

            <InformationRow
              label="Carton Quantity"
              value={
                product.carton_quantity !== null
                  ? formatQuantity(product.carton_quantity)
                  : null
              }
            />

            <InformationRow label="Packaging" value={product.packaging} />

            <InformationRow label="Lead Time" value={product.lead_time} />

            <InformationRow label="HS Code" value={product.hs_code} />

            <InformationRow
              label="Country of Origin"
              value={product.country?.name}
            />
          </div>
        </DetailsCard>

        <DetailsCard
          title="Procurement & Fulfilment"
          description="How this product is sourced and delivered."
        >
          <div className="divide-y rounded-lg border">
            <InformationRow
              label="Fulfilment Method"
              value={formatLabel(product.fulfilment_method)}
            />

            <InformationRow
              label="Procurement Lead Time"
              value={`${product.procurement_lead_time_days} day${
                product.procurement_lead_time_days === 1 ? "" : "s"
              }`}
            />

            <InformationRow
              label="Allow Backorder"
              value={product.allow_backorder ? "Yes" : "No"}
            />

            <InformationRow
              label="Procurement Notes"
              value={product.procurement_notes}
            />
          </div>
        </DetailsCard>
      </section>

      <DetailsCard
        title="Inventory by Warehouse"
        description="Current stock and reservation position for each warehouse."
      >
        {warehouseStock.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Warehouse className="mx-auto size-9 text-muted-foreground" />

            <p className="mt-3 font-semibold">No warehouse stock</p>

            <p className="mt-1 text-sm text-muted-foreground">
              This product does not yet have stock records in any warehouse.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[880px] text-left">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Warehouse</th>

                  <th className="px-4 py-3 text-right font-medium">On Hand</th>

                  <th className="px-4 py-3 text-right font-medium">Reserved</th>

                  <th className="px-4 py-3 text-right font-medium">
                    Available
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Avg. Cost
                  </th>

                  <th className="px-4 py-3 font-medium">Last Movement</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {warehouseStock.map((stock) => (
                  <tr key={stock.id}>
                    <td className="px-4 py-4">
                      <p className="font-medium">{stock.warehouseName}</p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {stock.warehouseCode}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-right font-medium">
                      {formatQuantity(stock.quantityOnHand)}
                    </td>

                    <td className="px-4 py-4 text-right">
                      {formatQuantity(stock.quantityReserved)}
                    </td>

                    <td className="px-4 py-4 text-right font-semibold">
                      {formatQuantity(stock.quantityAvailable)}
                    </td>

                    <td className="px-4 py-4 text-right">
                      {formatCurrency(stock.averageUnitCost, "AED")}
                    </td>

                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {stock.lastTransactionAt
                        ? formatDateTime(stock.lastTransactionAt)
                        : "No movement"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailsCard>
      <DetailsCard
        title="Product Health"
        description="Movement intelligence based on posted inventory transactions."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <HealthDetail
            label="Status"
            value={formatHealthLabel(intelligence.health.status)}
          />

          <HealthDetail
            label="Sold — 30 Days"
            value={formatQuantity(intelligence.health.sold30Days)}
          />

          <HealthDetail
            label="Sold — 90 Days"
            value={formatQuantity(intelligence.health.sold90Days)}
          />

          <HealthDetail
            label="Sold — 180 Days"
            value={formatQuantity(intelligence.health.sold180Days)}
          />

          <HealthDetail
            label="On Hand"
            value={formatQuantity(intelligence.health.quantityOnHand)}
          />

          <HealthDetail
            label="Reserved"
            value={formatQuantity(intelligence.health.quantityReserved)}
          />

          <HealthDetail
            label="Available"
            value={formatQuantity(intelligence.health.quantityAvailable)}
          />

          <HealthDetail
            label="Inventory Value"
            value={formatCurrency(intelligence.health.inventoryValue, "AED")}
          />
        </div>

        <div className="mt-5 rounded-xl border bg-muted/20 p-4">
          <p className="text-sm font-semibold">HM ERP Insight</p>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {getHealthInsight(
              intelligence.health.status,
              intelligence.health.quantityAvailable,
              intelligence.health.sold30Days,
            )}
          </p>
        </div>
      </DetailsCard>

      <DetailsCard
        title="Recent Inventory Activity"
        description="Latest posted stock movements for this product."
      >
        {intelligence.recentTransactions.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Activity className="mx-auto size-9 text-muted-foreground" />

            <p className="mt-3 font-semibold">No inventory activity</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Posted inventory movements for this product will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {intelligence.recentTransactions.map((item) => {
              const positive = item.quantityChange > 0;

              return (
                <Link
                  key={item.id}
                  href={`/admin/inventory/transactions/${item.transactionId}`}
                  className="flex flex-col gap-4 rounded-xl border p-4 transition hover:border-orange-200 hover:bg-orange-50/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={[
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        positive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700",
                      ].join(" ")}
                    >
                      {positive ? (
                        <ArrowDownRight className="size-5" />
                      ) : (
                        <ArrowUpRight className="size-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                          {formatLabel(item.transactionType)}
                        </p>

                        <span className="text-xs text-muted-foreground">
                          {item.transactionNumber}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.warehouseName}
                        {item.warehouseCode ? ` · ${item.warehouseCode}` : ""}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(item.transactionDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6 sm:justify-end">
                    <div className="text-right">
                      <p
                        className={[
                          "font-semibold",
                          positive ? "text-emerald-700" : "text-red-700",
                        ].join(" ")}
                      >
                        {positive ? "+" : ""}
                        {formatQuantity(item.quantityChange)}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Quantity
                      </p>
                    </div>

                    <div className="min-w-[110px] text-right">
                      <p className="font-semibold">
                        {formatCurrency(Math.abs(item.totalCost), "AED")}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Movement Value
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-4">
          <Link
            href={`/admin/inventory/transactions?search=${encodeURIComponent(
              product.sku ?? product.name,
            )}`}
            className="text-sm font-semibold text-orange-600 transition hover:text-orange-700"
          >
            View inventory transactions →
          </Link>
        </div>
      </DetailsCard>

      <section className="grid gap-6 xl:grid-cols-2">
        <DetailsCard
          title="Catalog & Publishing"
          description="Website visibility and catalog readiness."
        >
          <div className="divide-y rounded-lg border">
            <InformationRow
              label="Status"
              value={formatLabel(product.status ?? "draft")}
            />

            <InformationRow
              label="Featured"
              value={product.featured ? "Yes" : "No"}
            />

            <InformationRow
              label="New Arrival"
              value={product.is_new ? "Yes" : "No"}
            />

            <InformationRow
              label="Published At"
              value={
                product.published_at
                  ? formatDateTime(product.published_at)
                  : null
              }
            />
          </div>
        </DetailsCard>

        <DetailsCard
          title="SEO Readiness"
          description="Search metadata for public product pages."
        >
          <div className="space-y-5">
            <SeoItem
              icon={SearchCheck}
              label="Meta Title"
              value={product.meta_title}
            />

            <SeoItem
              icon={Globe2}
              label="Meta Description"
              value={product.meta_description}
            />

            <SeoItem icon={Tags} label="URL Slug" value={product.slug} />
          </div>
        </DetailsCard>
      </section>

      <DetailsCard title="System Information">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SystemInformation
            label="Created"
            value={
              product.created_at
                ? formatDateTime(product.created_at)
                : "Not available"
            }
          />

          <SystemInformation
            label="Last Updated"
            value={
              product.updated_at
                ? formatDateTime(product.updated_at)
                : "Not available"
            }
          />

          <SystemInformation
            label="Warehouses"
            value={String(inventory.warehouseCount)}
          />

          <SystemInformation
            label="Warehouses With Stock"
            value={String(inventory.stockedWarehouseCount)}
          />
        </div>
      </DetailsCard>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>

          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>

          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function InformationRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="text-sm text-muted-foreground">{label}</span>

      <span className="max-w-xl whitespace-pre-wrap text-sm font-medium sm:text-right">
        {value === null || value === undefined || value === ""
          ? "Not provided"
          : String(value)}
      </span>
    </div>
  );
}

function SeoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe2;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>

      <div>
        <p className="text-sm font-medium">{label}</p>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {value?.trim() || "Not provided"}
        </p>
      </div>
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
function HealthDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function formatHealthLabel(
  status:
    | "fast_moving"
    | "slow_moving"
    | "dead_stock"
    | "no_sales"
    | "low_stock"
    | "out_of_stock"
    | "healthy",
): string {
  switch (status) {
    case "fast_moving":
      return "Fast Moving";

    case "slow_moving":
      return "Slow Moving";

    case "dead_stock":
      return "Dead Stock";

    case "no_sales":
      return "Never Sold";

    case "low_stock":
      return "Low Stock";

    case "out_of_stock":
      return "Out of Stock";

    default:
      return "Healthy";
  }
}

function getHealthDescription(
  status:
    | "fast_moving"
    | "slow_moving"
    | "dead_stock"
    | "no_sales"
    | "low_stock"
    | "out_of_stock"
    | "healthy",
): string {
  switch (status) {
    case "fast_moving":
      return "Strong recent movement";

    case "slow_moving":
      return "Sales have slowed";

    case "dead_stock":
      return "No sale for 180+ days";

    case "no_sales":
      return "No posted sale yet";

    case "low_stock":
      return "Replenishment may be needed";

    case "out_of_stock":
      return "No physical stock";

    default:
      return "Inventory movement is normal";
  }
}

function getHealthInsight(
  status:
    | "fast_moving"
    | "slow_moving"
    | "dead_stock"
    | "no_sales"
    | "low_stock"
    | "out_of_stock"
    | "healthy",
  available: number,
  sold30Days: number,
): string {
  switch (status) {
    case "fast_moving":
      return `This product is moving strongly. ${formatQuantity(
        sold30Days,
      )} units were issued through sales during the last 30 days, with ${formatQuantity(
        available,
      )} currently available. Review replenishment requirements.`;

    case "slow_moving":
      return "This product has previous sales history but little or no recent movement. Consider promoting it, reviewing pricing, or reducing future purchasing.";

    case "dead_stock":
      return "This stock has not generated a posted sale for more than 180 days. Review pricing, customer demand, bundling opportunities, or liquidation options.";

    case "no_sales":
      return "This product currently holds inventory but has no posted sales history. Review whether it is newly stocked, awaiting promotion, or tying up working capital.";

    case "low_stock":
      return `Only ${formatQuantity(
        available,
      )} units are currently available. Review open demand and supplier lead time before replenishment.`;

    case "out_of_stock":
      return "This product currently has no physical stock. Review customer demand and procurement options before deciding whether to replenish.";

    default:
      return "Current inventory and recent sales movement do not show an immediate stock-health concern.";
  }
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

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
