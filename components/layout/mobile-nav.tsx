"use client";

import Link from "next/link";

import {
  Menu,
  MessageCircle,
  X,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  getWhatsAppUrl,
} from "@/lib/config/site";

const links = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Products",
    href: "/products",
  },
  {
    label: "Categories",
    href: "/categories",
  },
  {
    label: "Sourcing",
    href: "/sourcing",
  },
  {
    label: "Export",
    href: "/export",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

export default function MobileNav() {
  const [
    open,
    setOpen,
  ] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() =>
          setOpen(true)
        }
        className="rounded-xl border border-slate-200 p-2.5 text-slate-900"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close navigation backdrop"
            onClick={() =>
              setOpen(false)
            }
            className="fixed inset-0 z-40 bg-slate-950/60"
          />

          <div className="fixed inset-y-0 right-0 z-50 flex w-[85%] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex h-20 items-center justify-between border-b px-5">
              <p className="font-bold text-slate-950">
                Dubai Wholesale Hub
              </p>

              <button
                type="button"
                aria-label="Close navigation"
                onClick={() =>
                  setOpen(false)
                }
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-5">
              {links.map(
                (item) => (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    onClick={() =>
                      setOpen(
                        false,
                      )
                    }
                    className="block rounded-xl px-4 py-3 font-medium text-slate-700 transition hover:bg-amber-50 hover:text-amber-700"
                  >
                    {
                      item.label
                    }
                  </Link>
                ),
              )}
            </nav>

            <div className="border-t p-5">
              <Link
                href="/contact"
                onClick={() =>
                  setOpen(false)
                }
                className="flex w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
              >
                Request Quote
              </Link>

              <a
                href={
                  getWhatsAppUrl()
                }
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3 font-semibold text-emerald-700"
              >
                <MessageCircle className="h-5 w-5" />
                WhatsApp Us
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}