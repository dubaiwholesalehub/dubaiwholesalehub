import Link from "next/link";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface CustomerReceiptPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;

  searchParams:
    Record<
      string,
      string | undefined
    >;
}

function buildHref(
  page: number,
  searchParams:
    Record<
      string,
      string | undefined
    >,
) {
  const params =
    new URLSearchParams();

  for (
    const [
      key,
      value,
    ] of Object.entries(
      searchParams,
    )
  ) {
    if (
      value &&
      value !== "all"
    ) {
      params.set(
        key,
        value,
      );
    }
  }

  params.set(
    "page",
    String(page),
  );

  return `?${params.toString()}`;
}

export default function CustomerReceiptPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  searchParams,
}: CustomerReceiptPaginationProps) {
  if (
    totalCount === 0
  ) {
    return null;
  }

  const firstItem =
    (page - 1) *
      pageSize +
    1;

  const lastItem =
    Math.min(
      page *
        pageSize,
      totalCount,
    );

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        {firstItem}-
        {lastItem} of{" "}
        {totalCount}
      </p>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={buildHref(
              page - 1,
              searchParams,
            )}
            className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
            Previous
          </Link>
        ) : (
          <span className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-md border px-3 text-sm opacity-40">
            <ChevronLeft className="size-4" />
            Previous
          </span>
        )}

        <span className="px-2 text-sm text-muted-foreground">
          Page {page} of{" "}
          {totalPages}
        </span>

        {page <
        totalPages ? (
          <Link
            href={buildHref(
              page + 1,
              searchParams,
            )}
            className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm hover:bg-muted"
          >
            Next
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-md border px-3 text-sm opacity-40">
            Next
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}