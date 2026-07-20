import {
  Building2,
} from "lucide-react";

import type {
  ProductSupplierMapping,
  ProductSupplierOption,
  ProductSupplierSummary,
} from "@/lib/repositories/product-supplier.repository";

import SupplierCard from "./SupplierCard";
import SupplierSheet from "./SupplierSheet";

type SupplierListProps = {
  mappings: ProductSupplierMapping[];
  suppliers: ProductSupplierOption[];
  productId: string;
  productName: string;
  summary: ProductSupplierSummary;
};

export default function SupplierList({
  mappings,
  suppliers,
  productId,
  productName,
  summary,
}: SupplierListProps) {
  if (mappings.length === 0) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <Building2 className="h-8 w-8 text-slate-500" />
      </div>

      <h2 className="mt-5 text-lg font-bold text-slate-950">
        No suppliers connected
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        Connect the first supplier to begin tracking
        product costs, MOQ, lead time, payment terms,
        packaging and sourcing notes.
      </p>

      <div className="mt-6 flex justify-center">
        <SupplierSheet
          productId={productId}
          productName={productName}
          suppliers={suppliers}
        />
      </div>
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