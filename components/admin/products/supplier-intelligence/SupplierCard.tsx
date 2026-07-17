import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  Clock3,
  Mail,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  Star,
  Tag,
  Truck,
} from "lucide-react";

import {
  archiveProductSupplierAction,
  restoreProductSupplierAction,
  setPreferredSupplierAction,
} from "@/app/admin/(protected)/products/supplier-actions";
import type {
  ProductSupplierMapping,
  ProductSupplierOption,
} from "@/lib/repositories/product-supplier.repository";

import EditSupplierSheet from "./EditSupplierSheet";


type SupplierCardProps = {
  mapping: ProductSupplierMapping;
  suppliers: ProductSupplierOption[];
  productName: string;
  isLowestCost: boolean;
  isFastest: boolean;
};

function formatMoney(
  value: number | null,
  currencyCode: string | null,
) {
  if (value === null) {
    return "Price not entered";
  }

  return `${Number(value).toFixed(2)} ${
    currencyCode ?? ""
  }`.trim();
}

function formatDate(value: string | null) {
  if (!value) {
    return "Never updated";
  }

  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function isStalePrice(value: string | null) {
  if (!value) {
    return true;
  }

  const threshold = new Date();

  threshold.setDate(threshold.getDate() - 90);

  return new Date(value) < threshold;
}

export default function SupplierCard({
  mapping,
  suppliers,
  productName,
  isLowestCost,
  isFastest,
}: SupplierCardProps) {
  const supplier = mapping.supplier;
  const stalePrice =
    mapping.cost_price !== null &&
    isStalePrice(mapping.last_price_update);

  return (
    <article
      className={[
        "rounded-2xl border bg-white p-6 shadow-sm",
        mapping.is_active
          ? "border-slate-200"
          : "border-dashed border-slate-300 bg-slate-50 opacity-80",
        mapping.is_preferred
          ? "ring-2 ring-amber-400 ring-offset-2"
          : "",
      ].join(" ")}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-950">
              {supplier?.company_name ??
                "Unknown supplier"}
            </h3>
            {mapping.is_preferred ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                <Star className="h-3.5 w-3.5 fill-current" />
                Preferred
              </span>
            ) : null}

            {isLowestCost ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <Tag className="h-3.5 w-3.5" />
                Lowest cost
              </span>
            ) : null}

            {isFastest ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                <Truck className="h-3.5 w-3.5" />
                Fastest
              </span>
            ) : null}

            {!mapping.is_active ? (
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                Archived
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
            {supplier?.contact_name ? (
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4" />
                {supplier.contact_name}
              </span>
            ) : null}

            {supplier?.phone ? (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-4 w-4" />
                {supplier.phone}
              </span>
            ) : null}

            {supplier?.email ? (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                {supplier.email}
              </span>
            ) : null}

            {supplier?.city ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {supplier.city}
              </span>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-left xl:text-right">
          <p className="text-2xl font-bold text-slate-950">
            {formatMoney(
              mapping.cost_price,
              mapping.currency_code,
            )}
          </p>

          {mapping.last_purchase_price !== null ? (
            <p className="mt-1 text-sm text-slate-500">
              Last purchase:{" "}
              {formatMoney(
                mapping.last_purchase_price,
                mapping.currency_code,
              )}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Detail
          label="Supplier SKU"
          value={mapping.supplier_sku ?? "Not entered"}
        />

        <Detail
          label="MOQ"
          value={
            mapping.moq !== null
              ? mapping.moq.toString()
              : "Not entered"
          }
        />

        <Detail
          label="Lead Time"
          value={
            mapping.lead_time_days !== null
              ? `${mapping.lead_time_days} days`
              : mapping.lead_time ?? "Not entered"
          }
        />

        <Detail
          label="Priority"
          value={mapping.priority.toString()}
        />

        <Detail
          label="Packaging"
          value={mapping.packaging ?? "Not entered"}
        />

        <Detail
          label="Payment Terms"
          value={
            mapping.payment_terms ?? "Not entered"
          }
        />

        <Detail
          label="Incoterm"
          value={mapping.incoterm ?? "Not entered"}
        />

        <Detail
          label="Loading Port"
          value={
            mapping.loading_port ?? "Not entered"
          }
        />
      </div>

      {mapping.notes ? (
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Internal notes
          </p>

          <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
            {mapping.notes}
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Clock3 className="h-4 w-4" />
            Price updated{" "}
            {formatDate(mapping.last_price_update)}
          </p>

          {stalePrice ? (
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Price verification required
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <EditSupplierSheet
    productId={mapping.product_id}
    productName={productName}
    mapping={mapping}
    suppliers={suppliers}
  />
          {mapping.is_active &&
          !mapping.is_preferred ? (
            <form
              action={setPreferredSupplierAction}
            >
              <input
                type="hidden"
                name="productId"
                value={mapping.product_id}
              />

              <input
                type="hidden"
                name="mappingId"
                value={mapping.id}
              />

              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                <Star className="h-4 w-4" />
                Make preferred
              </button>
            </form>
          ) : null}

          {mapping.is_active ? (
            <form
              action={archiveProductSupplierAction}
            >
              <input
                type="hidden"
                name="productId"
                value={mapping.product_id}
              />

              <input
                type="hidden"
                name="mappingId"
                value={mapping.id}
              />

              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
            </form>
          ) : (
            <form
              action={restoreProductSupplierAction}
            >
              <input
                type="hidden"
                name="productId"
                value={mapping.product_id}
              />

              <input
                type="hidden"
                name="mappingId"
                value={mapping.id}
              />

              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                <RotateCcw className="h-4 w-4" />
                Restore
              </button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}

type DetailProps = {
  label: string;
  value: string;
};

function Detail({ label, value }: DetailProps) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Package className="h-4 w-4 text-slate-400" />
        {value}
      </p>
    </div>
  );
}