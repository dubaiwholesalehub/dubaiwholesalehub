export default function UnitsLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse">
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="mt-3 h-8 w-48 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-[34rem] max-w-full rounded bg-slate-200" />

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div className="h-11 w-80 rounded-xl bg-slate-200" />
          <div className="h-11 w-32 rounded-xl bg-slate-200" />
        </div>

        <div className="space-y-3 p-6">
          {Array.from({
            length: 7,
          }).map((_, index) => (
            <div
              key={index}
              className="h-14 rounded-xl bg-slate-100"
            />
          ))}
        </div>
      </div>
    </div>
  );
}