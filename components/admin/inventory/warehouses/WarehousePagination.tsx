import Pagination from "@/components/admin/shared/Pagination";

interface WarehousePaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;

  searchParams: {
    search?: string;
    status?: string;
    pageSize?: string;
  };
}

export default function WarehousePagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  searchParams,
}: WarehousePaginationProps) {
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={pageSize}
      basePath="/admin/inventory/warehouses"
      itemLabel="warehouse"
      query={{
        search: searchParams.search,
        status:
          searchParams.status && searchParams.status !== "all"
            ? searchParams.status
            : undefined,
        pageSize:
          searchParams.pageSize && searchParams.pageSize !== "25"
            ? searchParams.pageSize
            : undefined,
      }}
    />
  );
}
