export default function CategoriesLoading() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="animate-pulse">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="mt-4 h-10 w-64 rounded bg-slate-200" />
        <div className="mt-3 h-5 w-full max-w-xl rounded bg-slate-200" />

        <div className="mt-8 grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="h-[560px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-11 w-11 rounded-xl bg-slate-200" />

            <div className="mt-6 space-y-5">
              <div className="h-11 rounded-xl bg-slate-200" />
              <div className="h-11 rounded-xl bg-slate-200" />
              <div className="h-28 rounded-xl bg-slate-200" />
              <div className="h-11 rounded-xl bg-slate-200" />
              <div className="h-16 rounded-xl bg-slate-200" />
              <div className="h-11 rounded-xl bg-slate-300" />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="h-5 w-32 rounded bg-slate-200" />
              <div className="mt-2 h-4 w-24 rounded bg-slate-200" />
            </div>

            <div className="space-y-4 p-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 rounded-xl bg-slate-100"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}