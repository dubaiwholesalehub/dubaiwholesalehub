import Link from "next/link";

interface InventoryTransferPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;

  searchParams: Record<
    string,
    string | undefined
  >;
}

function createPageHref(
  page: number,
  searchParams: Record<
    string,
    string | undefined
  >,
): string {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(
    ([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    },
  );

  if (page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }

  const query = params.toString();

  return query
    ? `/admin/inventory/transfers?${query}`
    : "/admin/inventory/transfers";
}

export function InventoryTransferPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  searchParams,
}: InventoryTransferPaginationProps) {
  if (totalCount === 0) {
    return null;
  }

  const firstRecord =
    (page - 1) * pageSize + 1;

  const lastRecord = Math.min(
    page * pageSize,
    totalCount,
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Showing {firstRecord.toLocaleString("en-US")}–
        {lastRecord.toLocaleString("en-US")} of{" "}
        {totalCount.toLocaleString("en-US")} transfer
        {totalCount === 1 ? "" : "s"}
      </p>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={createPageHref(
              page - 1,
              searchParams,
            )}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Previous
          </Link>
        ) : (
          <span className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 px-3 text-sm text-slate-400 opacity-60">
            Previous
          </span>
        )}

        <span className="px-2 text-sm font-medium text-slate-600">
          Page {page} of {totalPages}
        </span>

        {page < totalPages ? (
          <Link
            href={createPageHref(
              page + 1,
              searchParams,
            )}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Next
          </Link>
        ) : (
          <span className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 px-3 text-sm text-slate-400 opacity-60">
            Next
          </span>
        )}
      </div>
    </div>
  );
}