import Link from "next/link";

import {
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getChartOfAccountsParentOptions } from "@/lib/repositories/chart-of-accounts.repository";

import { createCustomGlAccountAction } from "./actions";

export default async function NewGlAccountPage() {
  await requireAdmin();

  const parents =
    await getChartOfAccountsParentOptions();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/admin/accounts/chart-of-accounts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Chart of Accounts
        </Link>

        <p className="mt-6 text-sm font-medium text-amber-600">
          Finance &amp; Accounting
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Add Custom GL Account
        </h1>

        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          Create a custom posting account beneath an existing
          Chart of Accounts heading.
        </p>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 text-blue-700" />

          <div>
            <p className="font-semibold text-blue-900">
              Accounting structure is protected
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              Account class, financial statement type and normal
              balance are inherited automatically from the selected
              parent account. System and control flags cannot be
              changed from this form.
            </p>
          </div>
        </div>
      </div>

      <form
        action={createCustomGlAccountAction}
        className="space-y-6 rounded-2xl border bg-card p-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold">
              Parent Heading
            </span>

            <select
              name="parentId"
              required
              defaultValue=""
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-amber-400"
            >
              <option
                value=""
                disabled
              >
                Select parent heading
              </option>

              {parents.map(
                (parent) => (
                  <option
                    key={parent.id}
                    value={parent.id}
                  >
                    {parent.accountCode} —{" "}
                    {parent.accountName} ·{" "}
                    {parent.accountClass.replaceAll(
                      "_",
                      " ",
                    )} ·{" "}
                    {parent.normalBalance}
                  </option>
                ),
              )}
            </select>

            <p className="text-xs text-muted-foreground">
              Only active non-posting heading accounts are available.
            </p>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">
              Account Code
            </span>

            <input
              type="text"
              name="accountCode"
              required
              maxLength={50}
              placeholder="Example: EXP-WAREHOUSE"
              className="h-11 w-full rounded-lg border bg-background px-3 font-mono text-sm outline-none transition focus:border-amber-400"
            />

            <p className="text-xs text-muted-foreground">
              Must be unique. Treat the code as permanent.
            </p>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">
              Account Name
            </span>

            <input
              type="text"
              name="accountName"
              required
              maxLength={150}
              placeholder="Example: Warehouse Expenses"
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-amber-400"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold">
              Description
            </span>

            <textarea
              name="description"
              rows={4}
              placeholder="Optional description of what should be posted to this account."
              className="w-full rounded-lg border bg-background px-3 py-3 text-sm outline-none transition focus:border-amber-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">
              Display Order
            </span>

            <input
              type="number"
              name="displayOrder"
              min={0}
              step={1}
              defaultValue={0}
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-amber-400"
            />

            <p className="text-xs text-muted-foreground">
              Controls the ordering within the Chart of Accounts.
            </p>
          </label>

          <div className="space-y-2">
            <span className="text-sm font-semibold">
              Manual Posting
            </span>

            <label className="flex min-h-11 items-center gap-3 rounded-lg border bg-background px-3">
              <input
                type="checkbox"
                name="allowManualPosting"
                defaultChecked
                className="size-4"
              />

              <span className="text-sm">
                Allow manual journal posting
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
          <Link
            href="/admin/accounts/chart-of-accounts"
            className="inline-flex h-11 items-center justify-center rounded-lg border bg-background px-5 text-sm font-semibold transition hover:bg-muted"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Create GL Account
          </button>
        </div>
      </form>
    </div>
  );
}