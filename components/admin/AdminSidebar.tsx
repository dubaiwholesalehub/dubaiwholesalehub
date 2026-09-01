"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Building2,
  FileQuestion,
  Gauge,
  Layers3,
  PackageSearch,
  Settings,
  Tags,
  Users,
  X,
  ChevronDown,
  Ruler,
  ClipboardCheck,
  ArrowLeftRight,
  ShoppingCart,
  PackageCheck,
  TrendingUp,
  Scale,
  FileText,
  ClipboardList,
  Truck,
  Zap,
  ReceiptText,
  ShoppingBag,
  BookOpenText,
  HandCoins,
  Landmark,
} from "lucide-react";

interface AdminSidebarProps {
  mobileOpen: boolean;
  desktopOpen: boolean;
  onClose: () => void;
}

const navigationGroups = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: Gauge,
      },
    ],
  },

  {
    label: "Sales",
    items: [
      {
        label: "Quick Sale",
        href: "/admin/sales/quick-sale",
        icon: Zap,
      },
      {
        label: "Quotations",
        href: "/admin/sales/quotations",
        icon: FileText,
      },
      {
        label: "Sales Orders",
        href: "/admin/sales/orders",
        icon: ClipboardList,
      },
      {
        label: "Deliveries",
        href: "/admin/sales/deliveries",
        icon: Truck,
      },
      {
        label: "Customer Receipts",
        href: "/admin/sales/receipts",
        icon: ReceiptText,
      },
      {
        label: "Sales Returns",
        href: "/admin/sales/returns",
        icon: ArrowLeftRight,
      },
      {
        label: "Customers",
        href: "/admin/customers",
        icon: Users,
      },
    ],
  },

  {
    label: "Purchasing",
    items: [
      {
        label: "Quick Purchase",
        href: "/admin/purchasing/quick-purchase",
        icon: ShoppingBag,
      },
      {
        label: "Purchase Orders",
        href: "/admin/purchase-orders",
        icon: ShoppingCart,
      },
      {
        label: "Goods Receipts",
        href: "/admin/goods-receipts",
        icon: PackageCheck,
      },
      {
        label: "Supplier Payments",
        href: "/admin/purchasing/supplier-payments",
        icon: HandCoins,
      },
      {
        label: "Supplier Returns",
        href: "/admin/purchasing/returns",
        icon: ArrowLeftRight,
      },
      {
        label: "Suppliers",
        href: "/admin/suppliers",
        icon: Building2,
      },
    ],
  },

  {
    label: "Inventory",
    items: [
      {
        label: "Warehouse Stock",
        href: "/admin/inventory/stock",
        icon: Boxes,
      },
      {
        label: "Inventory Operations",
        href: "/admin/inventory/operations",
        icon: ClipboardCheck,
      },
      {
        label: "Transfers",
        href: "/admin/inventory/transfers",
        icon: ArrowLeftRight,
      },
    ],
  },

  {
    label: "Accounts & Reports",
    items: [
      {
        label: "Cash & Bank",
        href: "/admin/accounts/cash-bank",
        icon: Landmark,
      },
      {
        label: "Expenses",
        href: "/admin/accounts/expenses",
        icon: ReceiptText,
      },
      {
        label: "Profitability",
        href: "/admin/accounts/profitability",
        icon: TrendingUp,
      },
      {
        label: "Customer Statement",
        href: "/admin/sales/customer-statement",
        icon: BookOpenText,
      },
      {
        label: "Supplier Statement",
        href: "/admin/purchasing/supplier-statement",
        icon: BookOpenText,
      },
    ],
  },

  {
    label: "Products",
    items: [
      {
        label: "Products",
        href: "/admin/products",
        icon: PackageSearch,
      },
      {
        label: "Categories",
        href: "/admin/categories",
        icon: Boxes,
      },
      {
        label: "Brands",
        href: "/admin/brands",
        icon: Tags,
      },
    ],
  },

  {
    label: "Advanced",
    items: [
      {
        label: "RFQs",
        href: "/admin/rfqs",
        icon: FileQuestion,
      },
      {
        label: "Reorder Intelligence",
        href: "/admin/purchasing/reorder",
        icon: TrendingUp,
      },
      {
        label: "Supplier Comparison",
        href: "/admin/purchasing/supplier-comparison",
        icon: Scale,
      },
      {
        label: "Product Mapping",
        href: "/admin/product-suppliers",
        icon: Layers3,
      },
      {
        label: "Inventory Transactions",
        href: "/admin/inventory/transactions",
        icon: ClipboardList,
      },
      {
        label: "Units",
        href: "/admin/units",
        icon: Ruler,
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname.startsWith(href);
}

function isGroupActive(
  pathname: string,
  group: (typeof navigationGroups)[number],
) {
  return group.items.some((item) => isActiveRoute(pathname, item.href));
}

export default function AdminSidebar({
  mobileOpen,
  desktopOpen,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  function isGroupOpen(group: (typeof navigationGroups)[number]) {
    if (group.label === "Overview") {
      return true;
    }

    if (isGroupActive(pathname, group)) {
      return true;
    }

    return openGroups[group.label] ?? group.label === "Sales";
  }

  function toggleGroup(label: string) {
    setOpenGroups((current) => ({
      ...current,
      [label]: !(current[label] ?? label === "Sales"),
    }));
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          desktopOpen ? "lg:translate-x-0" : "lg:-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <Link href="/admin" onClick={onClose}>
            <span className="block text-lg font-bold tracking-wide">
              DubaiWholesaleHub
            </span>

            <span className="mt-1 block text-[10px] uppercase tracking-[0.22em] text-amber-400">
              Admin Platform
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <div className="space-y-7">
            {navigationGroups.map((group) => (
              <div key={group.label}>
                {group.label === "Overview" ? (
                  <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {group.label}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className="mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:bg-slate-900 hover:text-slate-300"
                    aria-expanded={isGroupOpen(group)}
                  >
                    <span>{group.label}</span>

                    <ChevronDown
                      className={[
                        "h-4 w-4 transition-transform duration-200",
                        isGroupOpen(group) ? "rotate-180" : "",
                      ].join(" ")}
                    />
                  </button>
                )}

                {isGroupOpen(group) && (
                  <div className="space-y-1">
                    {(group.items ?? []).map((item) => {
                      const Icon = item.icon;
                      const active = isActiveRoute(pathname, item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={[
                            "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                            active
                              ? "bg-amber-500 text-slate-950"
                              : "text-slate-300 hover:bg-slate-900 hover:text-white",
                          ].join(" ")}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-slate-800 p-5">
          <div className="rounded-2xl bg-slate-900 p-4">
            <p className="text-sm font-semibold text-white">SANWAN ALSHAMS</p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Wholesale, export and sourcing management.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
