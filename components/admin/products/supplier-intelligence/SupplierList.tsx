import {
  Building2,
} from "lucide-react";

import type {
  ProductSupplierMapping,
  ProductSupplierSummary,
} from "@/lib/repositories/product-supplier.repository";

import SupplierCard from "./SupplierCard";

type SupplierListProps = {
  mappings: ProductSupplierMapping[];
  suppliers: ProductSupplierOption[];
  productName: string;
  summary: ProductSupplierSummary;
};

export default function SupplierList({
  mappings,
  suppliers,
  productName,
  summary,
}: SupplierListProps) {
  if (mappings.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <Building2 className="mx-auto h-10 w-10 text-slate-400" />

        <h2 className="mt-4 text-lg font-bold text-slate-950">
          No suppliers connected
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
          Add the first supplier to begin tracking
          product costs, MOQ, lead time, payment terms,
          packaging and sourcing notes.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {mappings.map((mapping) => (
        <SupplierCard
  key={mapping.id}
  mapping={mapping}
  suppliers={suppliers}
  productName={productName}
  isLowestCost={
    summary.lowestCost?.mappingId === mapping.id
  }
  isFastest={
    summary.fastestSupplier?.mappingId ===
    mapping.id
  }
/>
      ))}
    </section>
  );
}