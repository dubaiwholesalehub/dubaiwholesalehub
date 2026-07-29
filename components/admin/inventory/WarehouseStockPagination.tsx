import Link from "next/link";

interface WarehouseStockPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  searchParams: Record<string, string | undefined>;
}

export function WarehouseStockPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  searchParams,
}: WarehouseStockPaginationProps) {
  const firstItem =
    totalCount === 0 ? 0 : (page - 1) * pageSize + 1;

  const lastItem = Math.min(page * pageSize, totalCount);

  function createPageHref(nextPage: number) {
    const params = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && key !== "page") {
        params.set(key, value);
      }
    });

    params.set("page", String(nextPage));

    return `/admin/inventory/stock?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        Showing{" "}
        <span className="font-medium text-slate-900">
          {firstItem}
        </span>{" "}
        to{" "}
        <span className="font-medium text-slate-900">
          {lastItem}
        </span>{" "}
        of{" "}
        <span className="font-medium text-slate-900">
          {totalCount}
        </span>{" "}
        stock records
      </p>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={createPageHref(page - 1)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Previous
          </Link>
        ) : (
          <span className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-400">
            Previous
          </span>
        )}

        <span className="px-2 text-sm text-slate-600">
          Page{" "}
          <span className="font-medium text-slate-900">
            {page}
          </span>{" "}
          of{" "}
          <span className="font-medium text-slate-900">
            {Math.max(totalPages, 1)}
          </span>
        </span>

        {page < totalPages ? (
          <Link
            href={createPageHref(page + 1)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Next
          </Link>
        ) : (
          <span className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-400">
            Next
          </span>
        )}
      </div>
    </div>
  );
}