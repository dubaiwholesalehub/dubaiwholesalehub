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

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="lg:pl-72">
        <AdminHeader
          userName={userName}
          userEmail={userEmail}
          onMenuClick={() => setMobileOpen(true)}
          logoutAction={logoutAction}
        />

        <main className="min-h-[calc(100vh-5rem)] p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}