interface RfqToolbarProps {
  search?: string;
  status?: string;
}

const statuses = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready" },
  { value: "sent", label: "Sent" },
  { value: "partially_quoted", label: "Partially Quoted" },
  { value: "quoted", label: "Quoted" },
  { value: "under_review", label: "Under Review" },
  { value: "awarded", label: "Awarded" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

export function RfqToolbar({
  search = "",
  status = "",
}: RfqToolbarProps) {
  return (
    <form
      method="GET"
      className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center"
    >
      <input
        type="search"
        name="search"
        defaultValue={search}
        placeholder="Search RFQ number or title..."
        className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
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
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Search
      </button>
    </form>
  );
}