export default function NewInventoryTransferLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />

        <div className="h-8 w-72 animate-pulse rounded bg-slate-200" />

        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="h-20 animate-pulse border-b border-slate-200 bg-slate-50" />

        <div className="space-y-6 p-5">
          <div className="grid gap-5 md:grid-cols-2">
            <SkeletonField />
            <SkeletonField />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <SkeletonField />
            <SkeletonField />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <SkeletonField />
            <SkeletonField />
          </div>

          <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </div>

      <div className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}

function SkeletonField() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />

      <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}