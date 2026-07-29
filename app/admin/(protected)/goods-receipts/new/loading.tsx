export default function NewGoodsReceiptLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-neutral-200" />
          <div className="h-8 w-64 rounded bg-neutral-200" />
          <div className="h-4 w-96 max-w-full rounded bg-neutral-200" />
        </div>

        <div className="h-10 w-40 rounded bg-neutral-200" />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="h-5 w-48 rounded bg-neutral-200" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-neutral-200" />

        <div className="mt-6 flex gap-3">
          <div className="h-11 flex-1 rounded bg-neutral-200" />
          <div className="h-11 w-48 rounded bg-neutral-200" />
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-10">
        <div className="mx-auto h-5 w-60 rounded bg-neutral-200" />
        <div className="mx-auto mt-3 h-4 w-96 max-w-full rounded bg-neutral-200" />
      </div>
    </div>
  );
}