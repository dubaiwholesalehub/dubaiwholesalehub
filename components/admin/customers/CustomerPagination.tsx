import Pagination from "@/components/admin/shared/Pagination";

interface CustomerPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;

  searchParams: {
    search?: string;
    status?: string;
    customerType?: string;
    source?: string;
    pageSize?: string;
  };
}

export default function CustomerPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  searchParams,
}: CustomerPaginationProps) {
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={pageSize}
      basePath="/admin/customers"
      itemLabel="customer"
      query={{
        search: searchParams.search,

        status:
          searchParams.status &&
          searchParams.status !== "all"
            ? searchParams.status
            : undefined,

        customerType:
          searchParams.customerType &&
          searchParams.customerType !== "all"
            ? searchParams.customerType
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