import SearchFilters from "@/components/admin/shared/SearchFilters";

interface SalesOrderFiltersProps {
  values: {
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

export default function SalesOrderFilters({
  values,
}: SalesOrderFiltersProps) {
  return (
    <SearchFilters
      basePath="/admin/sales/orders"
      search={{
        value: values.search,
        placeholder:
          "Order number, reference or customer...",
      }}
      filters={[
        {
          key: "status",
          label: "Order Status",
          defaultValue: "all",
          options: [
            {
              label: "All order statuses",
              value: "all",
            },
            {
              label: "Draft",
              value: "draft",
            },
            {
              label: "Confirmed",
              value: "confirmed",
            },
            {
              label: "Processing",
              value: "processing",
            },
            {
              label: "Partially Fulfilled",
              value: "partially_fulfilled",
            },
            {
              label: "Fulfilled",
              value: "fulfilled",
            },
            {
              label: "Completed",
              value: "completed",
            },
            {
              label: "Cancelled",
              value: "cancelled",
            },
            {
              label: "Closed",
              value: "closed",
            },
          ],
        },
        {
          key: "fulfilmentStatus",
          label: "Fulfilment",
          defaultValue: "all",
          options: [
            {
              label: "All fulfilment statuses",
              value: "all",
            },
            {
              label: "Unplanned",
              value: "unplanned",
            },
            {
              label: "Awaiting Stock",
              value: "awaiting_stock",
            },
            {
              label: "Awaiting Procurement",
              value: "awaiting_procurement",
            },
            {
              label: "Partially Allocated",
              value: "partially_allocated",
            },
            {
              label: "Allocated",
              value: "allocated",
            },
            {
              label: "Partially Fulfilled",
              value: "partially_fulfilled",
            },
            {
              label: "Fulfilled",
              value: "fulfilled",
            },
            {
              label: "Not Required",
              value: "not_required",
            },
          ],
        },
        {
          key: "paymentStatus",
          label: "Payment",
          defaultValue: "all",
          options: [
            {
              label: "All payment statuses",
              value: "all",
            },
            {
              label: "Unpaid",
              value: "unpaid",
            },
            {
              label: "Partially Paid",
              value: "partially_paid",
            },
            {
              label: "Paid",
              value: "paid",
            },
            {
              label: "Overpaid",
              value: "overpaid",
            },
            {
              label: "Refunded",
              value: "refunded",
            },
          ],
        },
        {
          key: "source",
          label: "Source",
          defaultValue: "all",
          options: [
            {
              label: "All sources",
              value: "all",
            },
            {
              label: "Internal",
              value: "internal",
            },
            {
              label: "HMShopOnline",
              value: "hmshoponline",
            },
            {
              label: "Dubai Wholesale Hub",
              value: "dubaiwholesalehub",
            },
            {
              label: "Imported",
              value: "import",
            },
          ],
        },
      ]}
      values={{
        status:
          values.status ?? "all",
        fulfilmentStatus:
          values.fulfilmentStatus ??
          "all",
        paymentStatus:
          values.paymentStatus ?? "all",
        source:
          values.source ?? "all",
        pageSize:
          values.pageSize ?? "25",
      }}
      pageSize={{
        value: values.pageSize ?? "25",
        defaultValue: "25",
        options: [10, 25, 50, 100],
      }}
    />
  );
}