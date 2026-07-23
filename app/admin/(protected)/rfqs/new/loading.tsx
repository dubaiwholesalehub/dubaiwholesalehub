export default function CreateRfqLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-8 w-80 animate-pulse rounded bg-muted" />
        <div className="h-5 w-96 max-w-full animate-pulse rounded bg-muted" />
      </div>

      <div className="h-24 animate-pulse rounded-lg border bg-muted/30" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-[760px] animate-pulse rounded-lg border bg-muted/30" />
        <div className="h-[520px] animate-pulse rounded-lg border bg-muted/30" />
      </div>
    </div>
  );
}