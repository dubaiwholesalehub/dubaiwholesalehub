function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className}`}
    />
  );
}

export default function InventoryTransactionDetailsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <Skeleton className="h-5 w-40" />

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>

          <div className="flex gap-2">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </div>
      </div>

      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}