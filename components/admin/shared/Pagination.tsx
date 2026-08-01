import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  buttonVariants,
} from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationQueryValue {
  [key: string]: string | undefined;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;

  basePath: string;

  query?: PaginationQueryValue;

  itemLabel?: string;

  showRecordRange?: boolean;
}

export default function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  basePath,
  query = {},
  itemLabel = "record",
  showRecordRange = true,
}: PaginationProps) {
  if (totalCount === 0) {
    return null;
  }

  const normalizedTotalPages =
    Math.max(totalPages, 1);

  const currentPage = Math.min(
    Math.max(page, 1),
    normalizedTotalPages,
  );

  const firstRecord =
    (currentPage - 1) * pageSize + 1;

  const lastRecord = Math.min(
    currentPage * pageSize,
    totalCount,
  );

  const pluralLabel =
    totalCount === 1
      ? itemLabel
      : `${itemLabel}s`;

  return (
    <nav
      aria-label={`${itemLabel} pagination`}
      className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="text-sm text-muted-foreground">
        {showRecordRange ? (
          <>
            Showing {firstRecord}–{lastRecord} of{" "}
            {totalCount} {pluralLabel}
          </>
        ) : (
          <>
            {totalCount} {pluralLabel}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PaginationLink
          href={createPageHref({
            basePath,
            query,
            page: currentPage - 1,
          })}
          disabled={currentPage <= 1}
          label="Previous"
          icon="previous"
        />

        <span
          aria-current="page"
          className="px-2 text-sm text-muted-foreground"
        >
          Page {currentPage} of{" "}
          {normalizedTotalPages}
        </span>

        <PaginationLink
          href={createPageHref({
            basePath,
            query,
            page: currentPage + 1,
          })}
          disabled={
            currentPage >=
            normalizedTotalPages
          }
          label="Next"
          icon="next"
        />
      </div>
    </nav>
  );
}

interface PaginationLinkProps {
  href: string;
  disabled: boolean;
  label: string;
  icon: "previous" | "next";
}

function PaginationLink({
  href,
  disabled,
  label,
  icon,
}: PaginationLinkProps) {
  const className = cn(
    buttonVariants({
      variant: "outline",
      size: "default",
    }),
    disabled &&
      "pointer-events-none opacity-50",
  );

  const content =
    icon === "previous" ? (
      <>
        <ChevronLeft className="size-4" />
        {label}
      </>
    ) : (
      <>
        {label}
        <ChevronRight className="size-4" />
      </>
    );

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={className}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={className}
    >
      {content}
    </Link>
  );
}

interface CreatePageHrefInput {
  basePath: string;
  query: PaginationQueryValue;
  page: number;
}

function createPageHref({
  basePath,
  query,
  page,
}: CreatePageHrefInput): string {
  const params =
    new URLSearchParams();

  for (const [key, value] of Object.entries(
    query,
  )) {
    if (!value) {
      continue;
    }

    params.set(key, value);
  }

  if (page > 1) {
    params.set(
      "page",
      String(page),
    );
  } else {
    params.delete("page");
  }

  const queryString =
    params.toString();

  return queryString
    ? `${basePath}?${queryString}`
    : basePath;
}