"use client";

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
} from "lucide-react";

interface AdminSidebarProps {
  mobileOpen: boolean;
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
    label: "Catalog",
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
    label: "Sourcing",
    items: [
      {
        label: "Suppliers",
        href: "/admin/suppliers",
        icon: Building2,
      },
      {
        label: "Product Mapping",
        href: "/admin/product-suppliers",
        icon: Layers3,
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        label: "RFQs",
        href: "/admin/rfqs",
        icon: FileQuestion,
      },
      {
        label: "Customers",
        href: "/admin/customers",
        icon: Users,
      },
    ],
  },
  {
    label: "System",
    items: [
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

export default function AdminSidebar({
  mobileOpen,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();

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
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
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
                <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {group.label}
                </p>

                <div className="space-y-1">
                  {group.items.map((item) => {
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
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-slate-800 p-5">
          <div className="rounded-2xl bg-slate-900 p-4">
            <p className="text-sm font-semibold text-white">
              SANWAN ALSHAMS
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Wholesale, export and sourcing management.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}