export default function CustomerDetailsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />

        <div className="flex items-center gap-3">
          <div className="size-11 animate-pulse rounded-xl bg-muted" />

          <div className="space-y-2">
            <div className="h-7 w-64 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-xl border bg-card" />
        <div className="h-96 animate-pulse rounded-xl border bg-card" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl border bg-card" />
        <div className="h-72 animate-pulse rounded-xl border bg-card" />
      </div>

      <div className="h-64 animate-pulse rounded-xl border bg-card" />

      <div className="h-44 animate-pulse rounded-xl border bg-card" />
    </div>
  );
}