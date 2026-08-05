import Pagination from "@/components/admin/shared/Pagination";

interface SalesQuotationPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;

  searchParams: {
    search?: string;
    status?: string;
    source?: string;
    pageSize?: string;
  };
}

export default function SalesQuotationPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  searchParams,
}: SalesQuotationPaginationProps) {
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={pageSize}
      basePath="/admin/sales/quotations"
      itemLabel="quotation"
      query={{
        search:
          searchParams.search,

        status:
          searchParams.status &&
          searchParams.status !== "all"
            ? searchParams.status
            : undefined,

        source:
          searchParams.source &&
          searchParams.source !== "all"
            ? searchParams.source
            : undefined,

        pageSize:
          searchParams.pageSize &&
          searchParams.pageSize !== "25"
            ? searchParams.pageSize
            : undefined,
      }}
    />
  );
}