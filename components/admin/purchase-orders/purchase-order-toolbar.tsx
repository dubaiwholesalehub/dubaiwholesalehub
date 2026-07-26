interface PurchaseOrderToolbarProps {
  search?: string;
  status?: string;
}

const statuses = [
  {
    value: "",
    label: "All Statuses",
  },
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "sent",
    label: "Sent",
  },
  {
    value: "partially_received",
    label: "Partially Received",
  },
  {
    value: "received",
    label: "Received",
  },
  {
    value: "closed",
    label: "Closed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
] as const;

export function PurchaseOrderToolbar({
  search = "",
  status = "",
}: PurchaseOrderToolbarProps) {
  return (
    <form
      method="GET"
      className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center"
    >
      <input
        type="search"
        name="search"
        defaultValue={search}
        placeholder="Search PO number or supplier..."
        className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary"
      />

      <select
        name="status"
        defaultValue={status}
        className="h-10 rounded-md border bg-background px-3 text-sm"
      >
        {statuses.map((item) => (
          <option
            key={item.value}
            value={item.value}
          >
            {item.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Search
      </button>
    </form>
  );
}