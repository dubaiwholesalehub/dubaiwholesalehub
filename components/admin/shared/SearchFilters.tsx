"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SearchFilterOption {
  label: string;
  value: string;
}

export interface SearchFilterDefinition {
  key: string;
  label: string;
  options: SearchFilterOption[];
  defaultValue?: string;
}

interface SearchFiltersProps {
  basePath: string;

  search?: {
    key?: string;
    label?: string;
    placeholder?: string;
    value?: string;
  };

  filters?: SearchFilterDefinition[];

  values?: Record<
    string,
    string | undefined
  >;

  pageSize?: {
    enabled?: boolean;
    key?: string;
    label?: string;
    value?: string;
    defaultValue?: string;
    options?: number[];
  };
}

export default function SearchFilters({
  basePath,
  search,
  filters = [],
  values = {},
  pageSize,
}: SearchFiltersProps) {
  const router = useRouter();

  const searchKey =
    search?.key ?? "search";

  const pageSizeKey =
    pageSize?.key ?? "pageSize";

  const defaultPageSize =
    pageSize?.defaultValue ?? "25";

  const [searchValue, setSearchValue] =
    useState(search?.value ?? "");

  const [filterValues, setFilterValues] =
    useState<Record<string, string>>(
      Object.fromEntries(
        filters.map((filter) => [
          filter.key,
          values[filter.key] ??
            filter.defaultValue ??
            filter.options[0]?.value ??
            "",
        ]),
      ),
    );

  const [pageSizeValue, setPageSizeValue] =
    useState(
      pageSize?.value ??
        values[pageSizeKey] ??
        defaultPageSize,
    );

  useEffect(() => {
    setSearchValue(search?.value ?? "");

    setFilterValues(
      Object.fromEntries(
        filters.map((filter) => [
          filter.key,
          values[filter.key] ??
            filter.defaultValue ??
            filter.options[0]?.value ??
            "",
        ]),
      ),
    );

    setPageSizeValue(
      pageSize?.value ??
        values[pageSizeKey] ??
        defaultPageSize,
    );
  }, [
    defaultPageSize,
    filters,
    pageSize?.value,
    pageSizeKey,
    search?.value,
    values,
  ]);

  function applyFilters() {
    const params = new URLSearchParams();

    const normalizedSearch =
      searchValue.trim();

    if (normalizedSearch) {
      params.set(
        searchKey,
        normalizedSearch,
      );
    }

    for (const filter of filters) {
      const value =
        filterValues[filter.key];

      const defaultValue =
        filter.defaultValue ??
        filter.options[0]?.value;

      if (
        value &&
        value !== defaultValue
      ) {
        params.set(
          filter.key,
          value,
        );
      }
    }

    if (
      pageSize?.enabled !== false &&
      pageSizeValue !== defaultPageSize
    ) {
      params.set(
        pageSizeKey,
        pageSizeValue,
      );
    }

    const query = params.toString();

    router.push(
      query
        ? `${basePath}?${query}`
        : basePath,
    );
  }

  function resetFilters() {
    const resetFilterValues =
      Object.fromEntries(
        filters.map((filter) => [
          filter.key,
          filter.defaultValue ??
            filter.options[0]?.value ??
            "",
        ]),
      );

    setSearchValue("");
    setFilterValues(resetFilterValues);
    setPageSizeValue(defaultPageSize);

    router.push(basePath);
  }

  const pageSizeOptions =
    pageSize?.options ??
    [10, 25, 50, 100];

  const columnCount =
    1 +
    filters.length +
    (pageSize?.enabled === false
      ? 0
      : 1);

  return (
    <section className="rounded-xl border bg-card p-4">
      <div
        className="grid gap-4 lg:items-end"
        style={{
          gridTemplateColumns:
            columnCount <= 2
              ? undefined
              : `minmax(240px, 1fr) repeat(${
                  columnCount - 1
                }, minmax(140px, 180px)) auto`,
        }}
      >
        {search ? (
          <div className="space-y-2">
            <label
              htmlFor={`filter-${searchKey}`}
              className="text-sm font-medium"
            >
              {search.label ?? "Search"}
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id={`filter-${searchKey}`}
                value={searchValue}
                placeholder={
                  search.placeholder ??
                  "Search..."
                }
                className="pl-9"
                onChange={(event) =>
                  setSearchValue(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    applyFilters();
                  }
                }}
              />
            </div>
          </div>
        ) : null}

        {filters.map((filter) => (
          <div
            key={filter.key}
            className="space-y-2"
          >
            <label
              htmlFor={`filter-${filter.key}`}
              className="text-sm font-medium"
            >
              {filter.label}
            </label>

            <select
              id={`filter-${filter.key}`}
              value={
                filterValues[
                  filter.key
                ] ?? ""
              }
              onChange={(event) =>
                setFilterValues(
                  (current) => ({
                    ...current,
                    [filter.key]:
                      event.target.value,
                  }),
                )
              }
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {filter.options.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </div>
        ))}

        {pageSize?.enabled !== false ? (
          <div className="space-y-2">
            <label
              htmlFor={`filter-${pageSizeKey}`}
              className="text-sm font-medium"
            >
              {pageSize?.label ??
                "Rows"}
            </label>

            <select
              id={`filter-${pageSizeKey}`}
              value={pageSizeValue}
              onChange={(event) =>
                setPageSizeValue(
                  event.target.value,
                )
              }
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {pageSizeOptions.map(
                (option) => (
                  <option
                    key={option}
                    value={String(option)}
                  >
                    {option}
                  </option>
                ),
              )}
            </select>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={applyFilters}
          >
            Apply
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
          >
            <X className="size-4" />
            Reset
          </Button>
        </div>
      </div>
    </section>
  );
}