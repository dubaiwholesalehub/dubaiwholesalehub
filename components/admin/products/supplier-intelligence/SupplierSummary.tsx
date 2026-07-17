import {
  AlertTriangle,
  Building2,
  Clock3,
  Star,
  Tag,
  Truck,
} from "lucide-react";

import type {
  ProductSupplierSummary,
} from "@/lib/repositories/product-supplier.repository";

type SupplierSummaryProps = {
  summary: ProductSupplierSummary;
};

function formatDate(value: string | null) {
  if (!value) {
    return "No price date";
  }

  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function SupplierSummary({
  summary,
}: SupplierSummaryProps) {
  const cards = [
    {
      title: "Active Suppliers",
      value: summary.activeSuppliers.toString(),
      description:
        summary.archivedSuppliers > 0
          ? `${summary.archivedSuppliers} archived`
          : "No archived suppliers",
      icon: Building2,
    },
    {
      title: "Lowest Comparable Cost",
      value: summary.lowestCost
        ? `${summary.lowestCost.amount.toFixed(2)} ${summary.lowestCost.currencyCode}`
        : "Not available",
      description:
        summary.lowestCost?.supplierName ??
        "Add supplier pricing",
      icon: Tag,
    },
    {
      title: "Preferred Supplier",
      value:
        summary.preferredSupplier?.supplierName ??
        "Not selected",
      description: summary.preferredSupplier
        ? "Current preferred source"
        : "Select a preferred supplier",
      icon: Star,
    },
    {
      title: "Fastest Delivery",
      value: summary.fastestSupplier
        ? `${summary.fastestSupplier.leadTimeDays} days`
        : "Not available",
      description:
        summary.fastestSupplier?.supplierName ??
        "Add lead-time information",
      icon: Truck,
    },
    {
      title: "Latest Price Update",
      value: formatDate(summary.newestPriceUpdate),
      description: summary.newestPriceUpdate
        ? "Most recently verified price"
        : "No supplier price recorded",
      icon: Clock3,
    },
    {
      title: "Prices Requiring Review",
      value: summary.stalePriceCount.toString(),
      description:
        summary.stalePriceCount > 0
          ? "Older than 90 days"
          : "All recorded prices are current",
      icon: AlertTriangle,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {card.title}
                </p>

                <p className="mt-2 text-xl font-bold text-slate-950">
                  {card.value}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {card.description}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <Icon className="h-5 w-5 text-slate-700" />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}