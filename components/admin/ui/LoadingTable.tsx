interface LoadingTableProps {
  rows?: number;
  columns?: number;
}

export default function LoadingTable({
  rows = 6,
  columns = 5,
}: LoadingTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div className="h-11 w-full max-w-sm rounded-xl bg-slate-200" />
          <div className="ml-4 h-11 w-36 rounded-xl bg-slate-300" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50">
              <tr>
                {Array.from({ length: columns }).map((_, index) => (
                  <th key={index} className="px-6 py-4">
                    <div className="h-3 w-20 rounded bg-slate-200" />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: columns }).map(
                    (_, columnIndex) => (
                      <td key={columnIndex} className="px-6 py-5">
                        <div
                          className={[
                            "h-4 rounded bg-slate-100",
                            columnIndex === 0
                              ? "w-40"
                              : "w-24",
                          ].join(" ")}
                        />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}