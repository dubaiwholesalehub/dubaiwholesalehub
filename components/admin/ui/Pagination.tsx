"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords?: number;
  onPageChange: (page: number) => void;
}

function createVisiblePages(
  currentPage: number,
  totalPages: number,
) {
  const pages = new Set<number>();

  pages.add(1);
  pages.add(totalPages);
  pages.add(currentPage);
  pages.add(currentPage - 1);
  pages.add(currentPage + 1);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export default function Pagination({
  currentPage,
  totalPages,
  totalRecords,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = createVisiblePages(
    currentPage,
    totalPages,
  );

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Page {currentPage} of {totalPages}
        {typeof totalRecords === "number"
          ? ` · ${totalRecords} records`
          : ""}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="hidden items-center gap-1 sm:flex">
          {visiblePages.map((page, index) => {
            const previousPage = visiblePages[index - 1];
            const showGap =
              previousPage !== undefined &&
              page - previousPage > 1;

            return (
              <div key={page} className="flex items-center gap-1">
                {showGap && (
                  <span className="px-1 text-slate-400">…</span>
                )}

                <button
                  type="button"
                  onClick={() => onPageChange(page)}
                  className={[
                    "flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition",
                    page === currentPage
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {page}
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}