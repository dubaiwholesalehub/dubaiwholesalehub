export default function SalesOrdersLoading() {
  return (
    <div className="space-y-6">
      <div className="h-20 animate-pulse rounded-xl bg-muted" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map(
          (_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-xl bg-muted"
            />
          ),
        )}
      </div>

      <div className="h-20 animate-pulse rounded-xl bg-muted" />

      <div className="h-[440px] animate-pulse rounded-xl bg-muted" />
    </div>
  );
}