export default function SupplierIntelligenceLoading() {
  return (
    <main className="animate-pulse space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="h-10 w-72 rounded bg-slate-200" />
        <div className="h-5 w-56 rounded bg-slate-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-36 rounded-2xl bg-slate-200"
          />
        ))}
      </div>

      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-80 rounded-2xl bg-slate-200"
          />
        ))}
      </div>
    </main>
  );
}