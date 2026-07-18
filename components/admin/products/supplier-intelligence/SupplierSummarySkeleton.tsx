export default function SupplierSummarySkeleton() {
  return (
    <section
    aria-label="Supplier intelligence summary"
    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {[0, 1, 2, 3, 4, 5].map((index) => (
  <article
    key={index}
    className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="h-4 w-28 rounded-md bg-slate-200" />

        <div className="mt-3 h-7 w-36 rounded-md bg-slate-200" />

        <div className="mt-2 h-4 w-40 rounded-md bg-slate-100" />
      </div>

      <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-200" />
    </div>
  </article>
))}
    </section>
  );
}