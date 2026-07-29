export default function InventoryTransactionsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-9 w-72 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-slate-200" />
      </div>

      <div className="h-52 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />

      <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
    </div>
  );
}