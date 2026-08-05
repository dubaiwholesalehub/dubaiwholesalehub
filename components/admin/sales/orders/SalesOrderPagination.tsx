import Pagination from "@/components/admin/shared/Pagination";

interface SalesOrderPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;

  searchParams: {
    search?: string;
    status?: string;
    fulfilmentStatus?: string;
    paymentStatus?: string;
    source?: string;
    dateFrom?: string;
    dateTo?: string;
    pageSize?: string;
  };
}

export default function SalesOrderPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  searchParams,
}: SalesOrderPaginationProps) {
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={pageSize}
      basePath="/admin/sales/orders"
      itemLabel="sales order"
      query={{
        search:
          searchParams.search,

        status:
          searchParams.status &&
          searchParams.status !== "all"
            ? searchParams.status
            : undefined,

        fulfilmentStatus:
          searchParams.fulfilmentStatus &&
          searchParams.fulfilmentStatus !==
            "all"
            ? searchParams.fulfilmentStatus
            : undefined,

        paymentStatus:
          searchParams.paymentStatus &&
          searchParams.paymentStatus !==
            "all"
            ? searchParams.paymentStatus
            : undefined,

        source:
          searchParams.source &&
          searchParams.source !== "all"
            ? searchParams.source
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