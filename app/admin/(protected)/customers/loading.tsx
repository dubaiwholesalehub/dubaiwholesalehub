export default function CustomersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="size-11 animate-pulse rounded-xl bg-muted" />

        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({
          length: 5,
        }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-xl border bg-card"
          />
        ))}
      </div>

      <div className="h-28 animate-pulse rounded-xl border bg-card" />

      <div className="h-80 animate-pulse rounded-xl border bg-card" />
    </div>
  );
}