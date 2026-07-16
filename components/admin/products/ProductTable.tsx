"use client";

import {
  Archive,
  CheckCircle2,
  Clock3,
  Edit3,
  FileCheck2,
  ImageIcon,
  PackageSearch,
  Send,
} from "lucide-react";

import ProductStatusBadge from "@/components/admin/products/ProductStatusBadge";
import type {
  Product,
  ProductStatus,
} from "@/components/admin/products/product-types";
import EmptyState from "@/components/admin/ui/EmptyState";

import { changeProductStatus } from "@/app/admin/(protected)/products/actions";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onCreate: () => void;
}

export default function ProductTable({
  products,
  onEdit,
  onCreate,
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No products found"
        description="Try another search or add your first wholesale product."
        action={
          <button
            type="button"
            onClick={onCreate}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Create product
          </button>
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1250px] text-left">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-6 py-4 font-semibold">
              Product
            </th>
            <th className="px-6 py-4 font-semibold">
              Classification
            </th>
            <th className="px-6 py-4 font-semibold">
              Wholesale
            </th>
            <th className="px-6 py-4 font-semibold">
              Status
            </th>
            <th className="px-6 py-4 font-semibold">
              Updated
            </th>
            <th className="px-6 py-4 text-right font-semibold">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr
              key={product.id}
              className="transition hover:bg-slate-50"
            >
              <td className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <ImageIcon className="h-6 w-6 text-slate-400" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="max-w-sm font-semibold text-slate-900">
                        {product.name}
                      </p>

                      {product.featured && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          Featured
                        </span>
                      )}

                      {product.is_new && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          New
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        SKU: {product.sku || "Not set"}
                      </span>

                      {product.model_number && (
                        <span>
                          Model: {product.model_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </td>

              <td className="px-6 py-4 text-sm text-slate-600">
                <p className="font-medium text-slate-800">
                  {product.category?.name ||
                    "No category"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {[
                    product.subcategory?.name,
                    product.brand?.name,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No additional classification"}
                </p>
              </td>

              <td className="px-6 py-4 text-sm text-slate-600">
                <p>
                  MOQ:{" "}
                  <span className="font-semibold text-slate-800">
                    {product.moq ?? 1}{" "}
                    {product.unit?.short_name ?? "PCS"}
                  </span>
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {product.lead_time
                    ? `Lead time: ${product.lead_time}`
                    : "Lead time not specified"}
                </p>
              </td>

              <td className="px-6 py-4">
                <ProductStatusBadge
                  status={product.status}
                />
              </td>

              <td className="px-6 py-4 text-sm text-slate-500">
                {formatDate(product.updated_at)}
              </td>

              <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>

                  <StatusAction product={product} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusAction({ product }: { product: Product }) {
  const nextAction = getNextStatusAction(product.status);
  const Icon = nextAction.icon;

  return (
    <form action={changeProductStatus}>
      <input
        type="hidden"
        name="id"
        value={product.id}
      />

      <input
        type="hidden"
        name="status"
        value={nextAction.status}
      />

      <button
        type="submit"
        className={[
          "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
          nextAction.classes,
        ].join(" ")}
      >
        <Icon className="h-4 w-4" />
        {nextAction.label}
      </button>
    </form>
  );
}

function getNextStatusAction(status: ProductStatus) {
  switch (status) {
    case "draft":
      return {
        status: "pending_review" as ProductStatus,
        label: "Submit",
        icon: Send,
        classes:
          "border-amber-200 text-amber-700 hover:bg-amber-50",
      };

    case "pending_review":
      return {
        status: "published" as ProductStatus,
        label: "Publish",
        icon: FileCheck2,
        classes:
          "border-green-200 text-green-700 hover:bg-green-50",
      };

    case "published":
      return {
        status: "archived" as ProductStatus,
        label: "Archive",
        icon: Archive,
        classes:
          "border-red-200 text-red-700 hover:bg-red-50",
      };

    case "archived":
      return {
        status: "draft" as ProductStatus,
        label: "Restore",
        icon: CheckCircle2,
        classes:
          "border-blue-200 text-blue-700 hover:bg-blue-50",
      };

    default:
      return {
        status: "draft" as ProductStatus,
        label: "Reset",
        icon: Clock3,
        classes:
          "border-slate-200 text-slate-700 hover:bg-slate-50",
      };
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}