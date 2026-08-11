import Pagination from "@/components/admin/shared/Pagination";

interface DeliveryOrderPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;

  searchParams: {
    search?: string;
    status?: string;
    priority?: string;
    deliveryMethod?: string;
    dateFrom?: string;
    dateTo?: string;
    pageSize?: string;
  };
}

export default function DeliveryOrderPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  searchParams,
}: DeliveryOrderPaginationProps) {
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={pageSize}
      basePath="/admin/sales/deliveries"
      itemLabel="delivery order"
      query={{
        search:
          searchParams.search,

        status:
          searchParams.status &&
          searchParams.status !== "all"
            ? searchParams.status
            : undefined,

        priority:
          searchParams.priority &&
          searchParams.priority !== "all"
            ? searchParams.priority
            : undefined,

        deliveryMethod:
          searchParams.deliveryMethod &&
          searchParams.deliveryMethod !==
            "all"
            ? searchParams.deliveryMethod
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