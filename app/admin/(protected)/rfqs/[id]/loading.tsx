export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />

      <div className="rounded-lg border p-6">
        <div className="h-5 w-96 animate-pulse rounded bg-muted" />

        <div className="mt-8 h-60 animate-pulse rounded bg-muted/40" />
      </div>
    </div>
  );
}