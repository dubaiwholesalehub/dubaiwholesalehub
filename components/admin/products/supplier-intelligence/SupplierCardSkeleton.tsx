export default function SupplierCardSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-start gap-3">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-200" />

            <div className="min-w-0 flex-1">
              <div className="h-5 w-44 rounded-md bg-slate-200" />

              <div className="mt-2 h-4 w-28 rounded-md bg-slate-100" />

              <div className="mt-3 flex gap-2">
                <div className="h-6 w-20 rounded-full bg-slate-100" />
                <div className="h-6 w-24 rounded-full bg-slate-100" />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="h-10 w-20 rounded-xl bg-slate-100" />
            <div className="h-10 w-28 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>

      <div className="grid gap-5 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index}>
            <div className="h-3.5 w-20 rounded bg-slate-100" />
            <div className="mt-2 h-5 w-28 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 px-6 py-5">
        <div className="h-4 w-24 rounded bg-slate-100" />
        <div className="mt-3 h-4 w-full rounded bg-slate-100" />
        <div className="mt-2 h-4 w-4/5 rounded bg-slate-100" />
      </div>
    </article>
  );
}