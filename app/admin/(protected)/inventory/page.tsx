import Link from "next/link";
import {
  ClipboardList,
  PackageSearch,
  ReceiptText,
  Warehouse,
} from "lucide-react";

import { InventorySummaryCards } from "@/components/admin/inventory/InventorySummaryCards";
import { getInventoryDashboard } from "@/lib/inventory/inventory-dashboard.repository";

export default async function InventoryDashboardPage() {
  const summary = await getInventoryDashboard();

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-orange-600">
            Inventory Management
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
            Inventory Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Monitor warehouse stock, inventory value, availability,
            and stock alerts across the business.
          </p>
        </div>

        <Link
          href="/admin/goods-receipts"
          className="inline-flex h-10 items-center justify-center rounded-md bg-orange-600 px-4 text-sm font-medium text-white transition hover:bg-orange-700"
        >
          View Goods Receipts
        </Link>
      </section>

      <InventorySummaryCards summary={summary} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Inventory Operations
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Access common stock and warehouse operations.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickLinkCard
            href="/admin/inventory/stock"
            title="Warehouse Stock"
            description="View stock quantities by product and warehouse."
            icon={Warehouse}
          />

          <QuickLinkCard
            href="/admin/inventory/transactions"
            title="Transactions"
            description="Review inventory receipts, issues, and adjustments."
            icon={ClipboardList}
          />

          <QuickLinkCard
            href="/admin/products"
            title="Product Inquiry"
            description="Search products and review product information."
            icon={PackageSearch}
          />

          <QuickLinkCard
            href="/admin/goods-receipts"
            title="Goods Receipts"
            description="Review and complete incoming stock receipts."
            icon={ReceiptText}
          />
        </div>
      </section>
    </div>
  );
}

interface QuickLinkCardProps {
  href: string;
  title: string;
  description: string;
  icon: typeof Warehouse;
}

function QuickLinkCard({
  href,
  title,
  description,
  icon: Icon,
}: QuickLinkCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 transition group-hover:bg-orange-50 group-hover:text-orange-600">
        <Icon className="size-5" aria-hidden="true" />
      </div>

      <h3 className="mt-4 font-semibold text-neutral-950">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-6 text-neutral-600">
        {description}
      </p>
    </Link>
  );
}