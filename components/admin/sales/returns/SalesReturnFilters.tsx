import SearchFilters from "@/components/admin/shared/SearchFilters";

interface SalesReturnFiltersProps {
  values: {
    search?: string;
    status?: string;
    pageSize?: string;
  };
}

export default function SalesReturnFilters({
  values,
}: SalesReturnFiltersProps) {
  return (
    <SearchFilters
      basePath="/admin/sales/returns"
      search={{
        value: values.search,
        placeholder:
          "Return number or reason...",
      }}
      filters={[
        {
          key: "status",
          label: "Return Status",
          defaultValue: "all",
          options: [
            {
              label: "All return statuses",
              value: "all",
            },
            {
              label: "Draft",
              value: "draft",
            },
            {
              label: "Approved",
              value: "approved",
            },
            {
              label: "Received",
              value: "received",
            },
            {
              label: "Posted",
              value: "posted",
            },
            {
              label: "Cancelled",
              value: "cancelled",
            },
          ],
        },
      ]}
      values={{
        status:
          values.status ?? "all",

        pageSize:
          values.pageSize ?? "25",
      }}
      pageSize={{
        value:
          values.pageSize ?? "25",

        defaultValue:
          "25",

        options: [
          10,
          25,
          50,
          100,
        ],
      }}
    />
  );
}