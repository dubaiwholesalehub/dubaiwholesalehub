import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  ArrowLeft,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  getChartOfAccountsAccount,
} from "@/lib/repositories/chart-of-accounts.repository";

import {
  setCustomGlAccountActiveAction,
  updateCustomGlAccountAction,
} from "./actions";


interface EditGlAccountPageProps {
  params: Promise<{
    accountId: string;
  }>;
}


function displayLabel(
  value: string,
) {
  return value
    .replaceAll(
      "_",
      " ",
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}


export default async function EditGlAccountPage({
  params,
}: EditGlAccountPageProps) {
  await requireAdmin();

  const {
    accountId,
  } = await params;

  const account =
    await getChartOfAccountsAccount(
      accountId,
    );

  if (!account) {
    notFound();
  }

  const isProtected =
    account.isSystemAccount ||
    account.isControlAccount;

  const canManage =
    !isProtected &&
    account.isPostingAccount;

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
          {account.accountCode} —{" "}
          {account.accountName}
        </h1>

        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          Review GL account structure and safely manage permitted
          custom-account properties.
        </p>
      </div>

      {isProtected ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 text-amber-700" />

            <div>
              <p className="font-semibold text-amber-900">
                Protected GL account
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                This account is marked as a system or control
                account. Structural and management changes are
                intentionally blocked.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 size-5 text-blue-700" />

            <div>
              <p className="font-semibold text-blue-900">
                Accounting identity is locked
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Account code, hierarchy, class, statement type,
                normal balance, posting type and control/system
                status cannot be changed.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">
          Accounting Identity
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ReadOnlyField
            label="Account Code"
            value={account.accountCode}
          />

          <ReadOnlyField
            label="Account Class"
            value={displayLabel(
              account.accountClass,
            )}
          />

          <ReadOnlyField
            label="Statement"
            value={displayLabel(
              account.statementType,
            )}
          />

          <ReadOnlyField
            label="Normal Balance"
            value={displayLabel(
              account.normalBalance,
            )}
          />

          <ReadOnlyField
            label="Posting Type"
            value={
              account.isPostingAccount
                ? "Posting Account"
                : "Heading Account"
            }
          />

          <ReadOnlyField
            label="Status"
            value={
              account.isActive
                ? "Active"
                : "Inactive"
            }
          />
        </div>
      </section>

      {canManage ? (
        <>
          <form
            action={updateCustomGlAccountAction.bind(
              null,
              account.id,
            )}
            className="space-y-6 rounded-2xl border bg-card p-6"
          >
            <div>
              <h2 className="font-semibold">
                Editable Properties
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                These fields do not change the accounting identity
                of the GL account.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold">
                  Account Name
                </span>

                <input
                  type="text"
                  name="accountName"
                  required
                  defaultValue={
                    account.accountName
                  }
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
                  defaultValue={
                    account.description ??
                    ""
                  }
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
                  defaultValue={
                    account.displayOrder
                  }
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-amber-400"
                />
              </label>

              <div className="space-y-2">
                <span className="text-sm font-semibold">
                  Manual Posting
                </span>

                <label className="flex min-h-11 items-center gap-3 rounded-lg border bg-background px-3">
                  <input
                    type="checkbox"
                    name="allowManualPosting"
                    defaultChecked={
                      account.allowManualPosting
                    }
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
                Save Changes
              </button>
            </div>
          </form>

          <section className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">
              Account Status
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Inactive accounts remain visible in historical
              accounting reports but cannot be used for new
              postings.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <p className="font-semibold">
                  {account.isActive
                    ? "Account is active"
                    : "Account is inactive"}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {account.isActive
                    ? "Deactivate this account when it should no longer be used for new transactions."
                    : "Reactivate this account to make it available for future postings."}
                </p>
              </div>

              <form
                action={setCustomGlAccountActiveAction.bind(
                  null,
                  account.id,
                  !account.isActive,
                )}
              >
                <button
                  type="submit"
                  className={
                    account.isActive
                      ? "inline-flex h-10 items-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      : "inline-flex h-10 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  }
                >
                  {account.isActive
                    ? "Deactivate Account"
                    : "Reactivate Account"}
                </button>
              </form>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border bg-card p-6">
          <p className="text-sm leading-6 text-muted-foreground">
            This GL account is protected and cannot be edited
            through the Chart of Accounts management workflow.
          </p>
        </section>
      )}
    </div>
  );
}


function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  );
}