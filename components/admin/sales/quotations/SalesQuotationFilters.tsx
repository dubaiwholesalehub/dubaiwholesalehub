import SearchFilters from "@/components/admin/shared/SearchFilters";

interface SalesQuotationFiltersProps {
  values: {
    search?: string;
    status?: string;
    source?: string;
    pageSize?: string;
  };
}

export default function SalesQuotationFilters({
  values,
}: SalesQuotationFiltersProps) {
  return (
    <SearchFilters
      basePath="/admin/sales/quotations"
      search={{
        value: values.search,
        placeholder:
          "Quotation number or reference...",
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
              label: "Draft",
              value: "draft",
            },
            {
              label: "Sent",
              value: "sent",
            },
            {
              label: "Accepted",
              value: "accepted",
            },
            {
              label: "Rejected",
              value: "rejected",
            },
            {
              label: "Expired",
              value: "expired",
            },
            {
              label: "Cancelled",
              value: "cancelled",
            },
            {
              label: "Converted",
              value: "converted",
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