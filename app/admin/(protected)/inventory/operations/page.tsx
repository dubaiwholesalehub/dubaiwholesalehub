import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  ClipboardCheck,
  PackagePlus,
  RotateCcw,
  Scale,
  Truck,
} from "lucide-react";

const operations = [
  {
    title: "Opening Stock",
    description:
      "Load stock that existed before HM ERP inventory operations began.",
    href: "/admin/inventory/operations/opening-stock",
    icon: Boxes,
    available: true,
  },
  {
    title: "Receive Local Purchase",
    description:
      "Receive stock bought directly from local shops or suppliers without requiring a purchase order.",
    href: "/admin/inventory/operations/local-purchase",
    icon: PackagePlus,
    available: true,
  },
  {
    title: "Adjust Stock",
    description:
      "Record stock corrections, damaged items, losses, found stock, and other adjustments.",
    href: "/admin/inventory/operations/adjust-stock",
    icon: Scale,
    available: true,
  },
  {
    title: "Stock Count",
    description:
      "Enter physical counts and let HM ERP calculate the required adjustment.",
    href: "/admin/inventory/operations/stock-count",
    icon: ClipboardCheck,
    available: true,
  },
  {
    title: "Customer Return",
    description:
      "Receive returned goods back into inventory with a complete audit trail.",
    href: "#",
    icon: RotateCcw,
    available: false,
  },
  {
    title: "Warehouse Transfer",
    description: "Move inventory safely between warehouses.",
    href: "/admin/inventory/transfers",
    icon: Truck,
    available: true,
  },
];

export default function InventoryOperationsPage() {
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/inventory"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Inventory
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Inventory Operations
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Record what happened physically in the warehouse and let HM ERP
            create the correct audited inventory transaction.
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {operations.map((operation) => {
          const Icon = operation.icon;

          const content = (
            <div className="group flex h-full flex-col rounded-xl border bg-card p-5 transition hover:border-amber-300 hover:shadow-sm">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Icon className="size-5" />
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{operation.title}</h2>

                  {!operation.available ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                      Coming next
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {operation.description}
                </p>
              </div>

              <div className="mt-auto pt-5 text-sm font-semibold">
                {operation.available ? "Open operation →" : "Planned"}
              </div>
            </div>
          );

          if (!operation.available) {
            return (
              <div
                key={operation.title}
                className="cursor-not-allowed opacity-60"
              >
                {content}
              </div>
            );
          }

          return (
            <Link key={operation.title} href={operation.href}>
              {content}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
