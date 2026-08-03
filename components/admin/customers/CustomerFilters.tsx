import SearchFilters from "@/components/admin/shared/SearchFilters";

interface CustomerFiltersProps {
  values: {
    search?: string;
    status?: string;
    customerType?: string;
    source?: string;
    pageSize?: string;
  };
}

export default function CustomerFilters({
  values,
}: CustomerFiltersProps) {
  return (
    <SearchFilters
      basePath="/admin/customers"
      search={{
        value: values.search,
        placeholder:
          "Number, name, company, phone, email, TRN...",
      }}
      filters={[
        {
          key: "status",
          label: "Status",
          defaultValue: "all",
          options: [
            {
              label: "All statuses",
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
            {
              label: "Blocked",
              value: "blocked",
            },
          ],
        },
        {
          key: "customerType",
          label: "Customer Type",
          defaultValue: "all",
          options: [
            {
              label: "All types",
              value: "all",
            },
            {
              label: "Business",
              value: "business",
            },
            {
              label: "Individual",
              value: "individual",
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
        status: values.status ?? "all",
        customerType:
          values.customerType ?? "all",
        source: values.source ?? "all",
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