"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";

interface AdminShellProps {
  children: ReactNode;
  userName: string;
  userEmail: string;
  logoutAction: () => Promise<void>;
}

export default function AdminShell({
  children,
  userName,
  userEmail,
  logoutAction,
}: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-100 print:min-h-0 print:bg-white">
      <div className="print:hidden">
        <AdminSidebar
          mobileOpen={mobileOpen}
          desktopOpen={desktopSidebarOpen}
          onClose={() => setMobileOpen(false)}
        />
      </div>

      <div
        className={[
          "transition-[padding] duration-300 print:!pl-0 print:transition-none",
          desktopSidebarOpen ? "lg:pl-72" : "lg:pl-0",
        ].join(" ")}
      >
        <div className="print:hidden">
          <AdminHeader
            userName={userName}
            userEmail={userEmail}
            onMenuClick={() => setMobileOpen(true)}
            desktopSidebarOpen={desktopSidebarOpen}
            onDesktopMenuClick={() =>
              setDesktopSidebarOpen((current) => !current)
            }
            logoutAction={logoutAction}
          />
        </div>

        <main className="min-h-[calc(100vh-5rem)] p-5 lg:p-8 print:min-h-0 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
