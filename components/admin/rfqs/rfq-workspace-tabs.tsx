import Link from "next/link";

interface RfqWorkspaceTabsProps {
  rfqId: string;
  active:
    | "overview"
    | "items"
    | "suppliers"
    | "quotations"
    | "comparison"
    | "activity";
}

const tabs = [
  { key: "overview", label: "Overview", href: "" },
  { key: "items", label: "Items", href: "/items" },
  { key: "suppliers", label: "Suppliers", href: "/suppliers" },
  { key: "quotations", label: "Quotations", href: "/quotations" },
  { key: "comparison", label: "Comparison", href: "/comparison" },
  { key: "activity", label: "Activity", href: "/activity" },
] as const;

export function RfqWorkspaceTabs({
  rfqId,
  active,
}: RfqWorkspaceTabsProps) {
  return (
    <nav className="flex gap-6 overflow-x-auto px-6">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/admin/rfqs/${rfqId}${tab.href}`}
          className={
            tab.key === active
              ? "border-b-2 border-primary pb-3 text-sm font-semibold"
              : "pb-3 text-sm text-muted-foreground hover:text-foreground"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}