import Pagination from "@/components/admin/shared/Pagination";

interface SalesReturnPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;

  searchParams: {
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    pageSize?: string;
  };
}

export default function SalesReturnPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  searchParams,
}: SalesReturnPaginationProps) {
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={pageSize}
      basePath="/admin/sales/returns"
      itemLabel="sales return"
      query={{
        search:
          searchParams.search,

        status:
          searchParams.status &&
          searchParams.status !== "all"
            ? searchParams.status
            : undefined,

        dateFrom:
          searchParams.dateFrom,

        dateTo:
          searchParams.dateTo,

        pageSize:
          searchParams.pageSize &&
          searchParams.pageSize !== "25"
            ? searchParams.pageSize
            : undefined,
      }}
    />
  );
}