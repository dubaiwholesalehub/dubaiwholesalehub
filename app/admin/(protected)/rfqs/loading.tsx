export default function RfqsLoading() {
  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 animate-pulse rounded bg-muted" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
        </div>

        <div className="h-10 w-28 animate-pulse rounded-md bg-muted" />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-lg border bg-muted/50"
          />
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="space-y-2 border-b p-4">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>

        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-md bg-muted/60"
            />
          ))}
        </div>
      </section>
    </main>
  );
}