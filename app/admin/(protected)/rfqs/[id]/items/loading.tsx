export default function RfqItemsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="h-8 w-52 animate-pulse rounded bg-muted" />
          <div className="h-5 w-80 animate-pulse rounded bg-muted" />
        </div>

        <div className="h-9 w-36 animate-pulse rounded bg-muted" />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="h-12 animate-pulse border-b bg-muted/40" />

        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-lg border bg-muted/30"
            />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="h-20 animate-pulse border-b bg-muted/30" />

        <div className="space-y-3 p-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded bg-muted/30"
            />
          ))}
        </div>
      </div>
    </div>
  );
}