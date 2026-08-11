import SearchFilters from "@/components/admin/shared/SearchFilters";

interface DeliveryOrderFiltersProps {
  values: {
    search?: string;
    status?: string;
    priority?: string;
    deliveryMethod?: string;
    dateFrom?: string;
    dateTo?: string;
    pageSize?: string;
  };
}

export default function DeliveryOrderFilters({
  values,
}: DeliveryOrderFiltersProps) {
  return (
    <SearchFilters
      basePath="/admin/sales/deliveries"
      search={{
        value: values.search,
        placeholder:
          "Delivery number, tracking, carrier or reference...",
      }}
      filters={[
        {
          key: "status",
          label: "Delivery Status",
          defaultValue: "all",
          options: [
            {
              label: "All delivery statuses",
              value: "all",
            },
            {
              label: "Draft",
              value: "draft",
            },
            {
              label: "Picking",
              value: "picking",
            },
            {
              label: "Picked",
              value: "picked",
            },
            {
              label: "Packing",
              value: "packing",
            },
            {
              label: "Packed",
              value: "packed",
            },
            {
              label: "Dispatched",
              value: "dispatched",
            },
            {
              label: "Delivered",
              value: "delivered",
            },
            {
              label: "Cancelled",
              value: "cancelled",
            },
          ],
        },
        {
          key: "priority",
          label: "Priority",
          defaultValue: "all",
          options: [
            {
              label: "All priorities",
              value: "all",
            },
            {
              label: "Low",
              value: "low",
            },
            {
              label: "Normal",
              value: "normal",
            },
            {
              label: "High",
              value: "high",
            },
            {
              label: "Urgent",
              value: "urgent",
            },
          ],
        },
        {
          key: "deliveryMethod",
          label: "Delivery Method",
          defaultValue: "all",
          options: [
            {
              label: "All delivery methods",
              value: "all",
            },
            {
              label: "Company Delivery",
              value: "company_delivery",
            },
            {
              label: "Customer Pickup",
              value: "customer_pickup",
            },
            {
              label: "Courier",
              value: "courier",
            },
            {
              label: "Freight",
              value: "freight",
            },
            {
              label: "Export Shipment",
              value: "export_shipment",
            },
            {
              label: "Dropship",
              value: "dropship",
            },
            {
              label: "Other",
              value: "other",
            },
          ],
        },
      ]}
      values={{
        status:
          values.status ?? "all",

        priority:
          values.priority ?? "all",

        deliveryMethod:
          values.deliveryMethod ??
          "all",

        pageSize:
          values.pageSize ?? "25",
      }}
      pageSize={{
        value:
          values.pageSize ?? "25",
        defaultValue: "25",
        options: [10, 25, 50, 100],
      }}
    />
  );
}