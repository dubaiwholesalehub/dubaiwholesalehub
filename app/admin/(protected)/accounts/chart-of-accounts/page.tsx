import Link from "next/link";

import {
  ArrowRight,
  BookOpen,
  CircleDollarSign,
  Landmark,
  Layers3,
  ReceiptText,
  Scale,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import {
  getChartOfAccounts,
  type ChartOfAccountsAccount,
  type ChartOfAccountsAccountClass,
} from "@/lib/repositories/chart-of-accounts.repository";

const CLASS_ORDER: ChartOfAccountsAccountClass[] = [
  "asset",
  "liability",
  "equity",
  "revenue",
  "cogs",
  "expense",
  "other_income",
  "other_expense",
];

const CLASS_LABELS: Record<ChartOfAccountsAccountClass, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  cogs: "Cost of Sales",
  expense: "Operating Expenses",
  other_income: "Other Income",
  other_expense: "Other Expenses",
};

function classIcon(accountClass: ChartOfAccountsAccountClass) {
  switch (accountClass) {
    case "asset":
      return WalletCards;

    case "liability":
      return ReceiptText;

    case "equity":
      return Landmark;

    case "revenue":
      return CircleDollarSign;

    case "cogs":
      return Layers3;

    case "expense":
      return ReceiptText;

    case "other_income":
      return CircleDollarSign;

    case "other_expense":
      return ReceiptText;
  }
}

function badgeClass(
  value: "posting" | "heading" | "control" | "system" | "inactive",
) {
  switch (value) {
    case "posting":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";

    case "heading":
      return "bg-slate-100 text-slate-700 ring-slate-500/20";

    case "control":
      return "bg-blue-50 text-blue-700 ring-blue-600/20";

    case "system":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";

    case "inactive":
      return "bg-red-50 text-red-700 ring-red-600/20";
  }
}

function AccountBadge({
  children,
  type,
}: {
  children: React.ReactNode;
  type: "posting" | "heading" | "control" | "system" | "inactive";
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ring-inset ${badgeClass(
        type,
      )}`}
    >
      {children}
    </span>
  );
}

function AccountRow({
  account,
  depth,
}: {
  account: ChartOfAccountsAccount;
  depth: number;
}) {
  return (
    <tr
      className={
        account.isActive
          ? "transition hover:bg-muted/30"
          : "bg-red-50/20 text-muted-foreground"
      }
    >
      <td className="whitespace-nowrap px-4 py-4 align-top">
        <span className="font-mono text-sm font-semibold">
          {account.accountCode}
        </span>
      </td>

      <td className="px-4 py-4 align-top">
        <div
          className="flex items-start gap-2"
          style={{
            paddingLeft: `${depth * 20}px`,
          }}
        >
          {depth > 0 ? (
            <span className="mt-1 text-muted-foreground">↳</span>
          ) : null}

          <div>
            <p
              className={
                account.isPostingAccount
                  ? "font-semibold"
                  : "font-semibold text-slate-700"
              }
            >
              {account.accountName}
            </p>

            {account.description ? (
              <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                {account.description}
              </p>
            ) : null}
          </div>
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-4 align-top text-sm capitalize">
        {account.statementType.replaceAll("_", " ")}
      </td>

      <td className="whitespace-nowrap px-4 py-4 align-top text-sm capitalize">
        {account.normalBalance}
      </td>

      <td className="px-4 py-4 align-top">
        <div className="flex max-w-sm flex-wrap gap-1.5">
          {account.isPostingAccount ? (
            <AccountBadge type="posting">Posting</AccountBadge>
          ) : (
            <AccountBadge type="heading">Heading</AccountBadge>
          )}

          {account.isControlAccount ? (
            <AccountBadge type="control">Control</AccountBadge>
          ) : null}

          {account.isSystemAccount ? (
            <AccountBadge type="system">System</AccountBadge>
          ) : null}

          {!account.isActive ? (
            <AccountBadge type="inactive">Inactive</AccountBadge>
          ) : null}
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right align-top">
        <div className="flex items-center justify-end gap-3">
          {!account.isSystemAccount &&
          !account.isControlAccount &&
          account.isPostingAccount ? (
            <Link
              href={`/admin/accounts/chart-of-accounts/${account.id}`}
              className="text-sm font-semibold text-slate-700 transition hover:text-amber-700 hover:underline"
            >
              Edit
            </Link>
          ) : null}

          {account.isPostingAccount ? (
            <Link
              href={`/admin/accounts/reports/general-ledger/${account.id}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 transition hover:text-amber-800 hover:underline"
            >
              Ledger
              <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}

function flattenAccountTree(accounts: ChartOfAccountsAccount[]) {
  const children = new Map<string | null, ChartOfAccountsAccount[]>();

  for (const account of accounts) {
    const key = account.parentId;

    const group = children.get(key) ?? [];

    group.push(account);

    children.set(key, group);
  }

  const sortAccounts = (values: ChartOfAccountsAccount[]) =>
    [...values].sort(
      (a, b) =>
        a.displayOrder - b.displayOrder ||
        a.accountCode.localeCompare(b.accountCode, undefined, {
          numeric: true,
        }),
    );

  const result: Array<{
    account: ChartOfAccountsAccount;
    depth: number;
  }> = [];

  const visited = new Set<string>();

  const visit = (account: ChartOfAccountsAccount, depth: number) => {
    if (visited.has(account.id)) {
      return;
    }

    visited.add(account.id);

    result.push({
      account,
      depth,
    });

    const descendants = sortAccounts(children.get(account.id) ?? []);

    for (const child of descendants) {
      visit(child, depth + 1);
    }
  };

  const roots = sortAccounts(
    accounts.filter(
      (account) =>
        !account.parentId ||
        !accounts.some((candidate) => candidate.id === account.parentId),
    ),
  );

  for (const root of roots) {
    visit(root, 0);
  }

  return result;
}

export default async function ChartOfAccountsPage() {
  const accounts = await getChartOfAccounts();

  const postingAccounts = accounts.filter(
    (account) => account.isPostingAccount,
  ).length;

  const controlAccounts = accounts.filter(
    (account) => account.isControlAccount,
  ).length;

  const systemAccounts = accounts.filter(
    (account) => account.isSystemAccount,
  ).length;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-amber-600">
          Finance &amp; Accounting
        </p>

        <div className="mt-1 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Chart of Accounts
            </h1>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Review the General Ledger account structure, financial statement
              classification and posting controls.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/accounts/chart-of-accounts/new"
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
            >
              Add Account
            </Link>

            <Link
              href="/admin/accounts/reports/trial-balance"
              className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-semibold transition hover:bg-muted"
            >
              <Scale className="size-4" />
              Trial Balance
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Accounts"
          value={accounts.length}
          icon={BookOpen}
        />

        <SummaryCard
          label="Posting Accounts"
          value={postingAccounts}
          icon={Layers3}
        />

        <SummaryCard
          label="Control Accounts"
          value={controlAccounts}
          icon={ShieldCheck}
        />

        <SummaryCard
          label="System Accounts"
          value={systemAccounts}
          icon={Landmark}
        />
      </section>

      <section className="space-y-6">
        {CLASS_ORDER.map((accountClass) => {
          const classAccounts = accounts.filter(
            (account) => account.accountClass === accountClass,
          );

          if (classAccounts.length === 0) {
            return null;
          }

          const flattened = flattenAccountTree(classAccounts);

          const Icon = classIcon(accountClass);

          return (
            <div
              key={accountClass}
              className="overflow-hidden rounded-2xl border bg-card"
            >
              <div className="flex items-center gap-3 border-b px-5 py-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                  <Icon className="size-5" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    {CLASS_LABELS[accountClass]}
                  </h2>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {classAccounts.length} account
                    {classAccounts.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Code</th>

                      <th className="px-4 py-3">Account</th>

                      <th className="px-4 py-3">Statement</th>

                      <th className="px-4 py-3">Normal</th>

                      <th className="px-4 py-3">Controls</th>

                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {flattened.map(({ account, depth }) => (
                      <AccountRow
                        key={account.id}
                        account={account}
                        depth={depth}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>

          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>

        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
