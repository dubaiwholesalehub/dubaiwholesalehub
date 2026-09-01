"use client";

import { Menu, Search } from "lucide-react";

interface AdminHeaderProps {
  userName: string;
  userEmail: string;
  onMenuClick: () => void;
  desktopSidebarOpen: boolean;
  onDesktopMenuClick: () => void;
  logoutAction: () => Promise<void>;
}

export default function AdminHeader({
  userName,
  userEmail,
  onMenuClick,
  desktopSidebarOpen,
  onDesktopMenuClick,
  logoutAction,
}: AdminHeaderProps) {
  const initial =
    userName.trim().charAt(0).toUpperCase() ||
    userEmail.trim().charAt(0).toUpperCase() ||
    "A";

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center border-b bg-white/95 px-5 backdrop-blur lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="mr-4 rounded-xl border border-slate-200 p-2.5 text-slate-700 transition hover:bg-slate-100 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onDesktopMenuClick}
        className="mr-4 hidden rounded-xl border border-slate-200 p-2.5 text-slate-700 transition hover:bg-slate-100 lg:inline-flex"
        aria-label={desktopSidebarOpen ? "Hide navigation" : "Show navigation"}
        title={desktopSidebarOpen ? "Hide menu" : "Show menu"}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden max-w-md flex-1 md:block">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            placeholder="Search products, suppliers or RFQs..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-900">
            {userName || "Administrator"}
          </p>

          <p className="text-xs text-slate-500">{userEmail}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-700">
          {initial}
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
