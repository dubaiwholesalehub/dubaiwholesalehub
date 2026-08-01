import SearchFilters from "@/components/admin/shared/SearchFilters";

interface WarehouseFiltersProps {
  values: {
    search?: string;
    status?: string;
    pageSize?: string;
  };
}

export default function WarehouseFilters({ values }: WarehouseFiltersProps) {
  return (
    <SearchFilters
      basePath="/admin/inventory/warehouses"
      search={{
        value: values.search,
        placeholder: "Code, name, city, country...",
      }}
      filters={[
        {
          key: "status",
          label: "Status",
          defaultValue: "all",
          options: [
            {
              label: "All warehouses",
              value: "all",
            },
            {
              label: "Active",
              value: "active",
            },
            {
              label: "Inactive",
              value: "inactive",
            },
          ],
        },
      ]}
      values={{
        status: values.status ?? "all",
        pageSize: values.pageSize ?? "25",
      }}
      pageSize={{
        value: values.pageSize ?? "25",
        defaultValue: "25",
        options: [10, 25, 50, 100],
      }}
    />
  );
}
