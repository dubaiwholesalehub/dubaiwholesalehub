export default function InventoryDashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-36 animate-pulse rounded bg-neutral-200" />
        <div className="h-8 w-64 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-neutral-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100"
          />
        ))}
      </div>
    </div>
  );
}