import {
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  getManagedUsers,
} from "@/lib/repositories/user-management.repository";

import UserManagementTable from "./UserManagementTable";

export default async function UsersPage() {
  await requireAdmin();

  const users =
    await getManagedUsers();

  const activeUsers =
    users.filter(
      (user) => user.isActive,
    ).length;

  const salespeople =
    users.filter(
      (user) =>
        user.isActive &&
        [
          "super_admin",
          "admin",
          "manager",
          "sales",
        ].includes(user.role),
    ).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Users className="size-5" />
        </div>

        <div>
          <p className="text-sm font-medium text-amber-600">
            Settings
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Users &amp; Salespeople
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Manage employee names, designations, ERP roles
            and account status. Salesperson ownership is
            tracked separately from the user who enters a
            transaction.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Total Users"
          value={users.length}
        />

        <SummaryCard
          label="Active Users"
          value={activeUsers}
        />

        <SummaryCard
          label="Eligible Salespeople"
          value={salespeople}
        />
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">
            ERP Users
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Email is controlled by the authentication
            account and is therefore read-only here.
          </p>
        </div>

        <UserManagementTable
          users={users}
        />
      </section>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />

          <div>
            <strong>
              Account creation:
            </strong>{" "}
            Create the login account in Supabase Auth first.
            The ERP profile is created automatically. Then
            return here to assign the employee&apos;s full
            name, designation, ERP role and active status.
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}