export default function NewWarehouseLoading() {
  return <WarehouseFormSkeleton />;
}

function WarehouseFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      </div>

      <div className="space-y-6 rounded-xl border bg-card p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />

        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 10 }).map(
            (_, index) => (
              <div
                key={index}
                className="space-y-2"
              >
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-8 animate-pulse rounded bg-muted" />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}