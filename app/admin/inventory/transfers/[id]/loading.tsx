export default function InventoryTransferDetailsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="size-11 animate-pulse rounded-xl bg-slate-200" />

          <div className="space-y-2">
            <div className="h-7 w-52 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
          />
        ))}
      </div>

      <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />

      <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}