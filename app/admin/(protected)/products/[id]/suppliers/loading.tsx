import SupplierListSkeleton from "@/components/admin/products/supplier-intelligence/SupplierListSkeleton";
import SupplierSummarySkeleton from "@/components/admin/products/supplier-intelligence/SupplierSummarySkeleton";

export default function ProductSuppliersLoading() {
  return (
    <main className="space-y-8">
      <section className="animate-pulse">
        <div className="h-4 w-32 rounded bg-slate-200" />

        <div className="mt-3 h-9 w-72 max-w-full rounded-lg bg-slate-200" />

        <div className="mt-3 h-5 w-full max-w-xl rounded bg-slate-100" />

        <div className="mt-2 h-5 w-4/5 max-w-lg rounded bg-slate-100" />
      </section>

      <SupplierSummarySkeleton />

      <div className="flex items-center justify-between gap-4">
        <div className="animate-pulse">
          <div className="h-6 w-40 rounded bg-slate-200" />
          <div className="mt-2 h-4 w-56 rounded bg-slate-100" />
        </div>

        <div className="h-12 w-36 animate-pulse rounded-xl bg-slate-200" />
      </div>

      <SupplierListSkeleton />
    </main>
  );
}