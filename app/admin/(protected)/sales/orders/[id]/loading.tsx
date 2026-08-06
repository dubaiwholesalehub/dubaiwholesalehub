export default function SalesOrderDetailsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-20 animate-pulse rounded-xl bg-muted" />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {Array.from({
          length: 3,
        }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>

      <div className="h-96 animate-pulse rounded-xl bg-muted" />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
