export default function InventoryTransfersLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white"
          />
        ))}
      </div>

      <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />

      <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}