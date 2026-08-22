import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CirclePause,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  getAccountingPeriods,
  type AccountingPeriod,
  type AccountingPeriodStatus,
} from "@/lib/repositories/accounting-period.repository";

import {
  closeAccountingPeriodAction,
  reopenAccountingPeriodAction,
  softCloseAccountingPeriodAction,
} from "./actions";


const MONTH_NAMES =
  [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];


function statusLabel(
  status: AccountingPeriodStatus,
) {
  switch (status) {
    case "open":
      return "Open";

    case "soft_closed":
      return "Soft Closed";

    case "closed":
      return "Closed";
  }
}


function statusClass(
  status: AccountingPeriodStatus,
) {
  switch (status) {
    case "open":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";

    case "soft_closed":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";

    case "closed":
      return "bg-red-50 text-red-700 ring-red-600/20";
  }
}


function StatusBadge({
  status,
}: {
  status: AccountingPeriodStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(
        status,
      )}`}
    >
      {statusLabel(
        status,
      )}
    </span>
  );
}


function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-AE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(
    new Date(
      `${value}T00:00:00Z`,
    ),
  );
}


function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-AE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(
    new Date(
      value,
    ),
  );
}


export default async function AccountingPeriodsPage() {
  await requireAdmin();

  const periods =
    await getAccountingPeriods();

  const years =
    Array.from(
      new Set(
        periods.map(
          (period) =>
            period.fiscalYear,
        ),
      ),
    );

  const openCount =
    periods.filter(
      (period) =>
        period.status ===
        "open",
    ).length;

  const softClosedCount =
    periods.filter(
      (period) =>
        period.status ===
        "soft_closed",
    ).length;

  const closedCount =
    periods.filter(
      (period) =>
        period.status ===
        "closed",
    ).length;

  return (
    <div className="space-y-8">
      <section>
        <Link
          href="/admin/accounts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Accounts
        </Link>

        <p className="mt-6 text-sm font-medium text-amber-600">
          Finance &amp; Accounting
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Accounting Periods
        </h1>

        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          Control when General Ledger transactions may be posted
          to each accounting month.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Periods"
          value={periods.length}
          icon={CalendarDays}
        />

        <SummaryCard
          label="Open"
          value={openCount}
          icon={CheckCircle2}
        />

        <SummaryCard
          label="Soft Closed"
          value={softClosedCount}
          icon={CirclePause}
        />

        <SummaryCard
          label="Closed"
          value={closedCount}
          icon={LockKeyhole}
        />
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 size-5 text-amber-700" />

          <div>
            <p className="font-semibold text-amber-900">
              Period posting control
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Only an Open accounting period accepts normal General
              Ledger postings. Both Soft Closed and Closed periods
              block posting until the period is reopened.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        {years.map(
          (year) => {
            const yearPeriods =
              periods.filter(
                (period) =>
                  period.fiscalYear ===
                  year,
              );

            return (
              <div
                key={year}
                className="overflow-hidden rounded-2xl border bg-card"
              >
                <div className="border-b px-5 py-4">
                  <h2 className="text-lg font-semibold">
                    Fiscal Year {year}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {
                      yearPeriods.length
                    } accounting periods
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1250px] text-sm">
                    <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">
                          Period
                        </th>

                        <th className="px-4 py-3">
                          Date Range
                        </th>

                        <th className="px-4 py-3">
                          Status
                        </th>

                        <th className="px-4 py-3">
                          Last Control
                        </th>

                        <th className="px-4 py-3">
                          Notes
                        </th>

                        <th className="px-4 py-3">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {yearPeriods.map(
                        (period) => (
                          <PeriodRow
                            key={
                              period.id
                            }
                            period={
                              period
                            }
                          />
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          },
        )}
      </section>
    </div>
  );
}


function PeriodRow({
  period,
}: {
  period: AccountingPeriod;
}) {
  const latestAction =
    period.status ===
    "closed"
      ? period.closedAt
      : period.status ===
          "soft_closed"
        ? period.softClosedAt
        : period.reopenedAt;

  return (
    <tr className="align-top transition hover:bg-muted/20">
      <td className="px-4 py-4">
        <p className="font-mono font-semibold">
          {period.periodCode}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {
            MONTH_NAMES[
              period.periodNumber -
                1
            ]
          }
        </p>
      </td>

      <td className="whitespace-nowrap px-4 py-4">
        {formatDate(
          period.dateFrom,
        )}
        {" → "}
        {formatDate(
          period.dateTo,
        )}
      </td>

      <td className="px-4 py-4">
        <StatusBadge
          status={
            period.status
          }
        />
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
        {formatDateTime(
          latestAction,
        )}
      </td>

      <td className="max-w-sm px-4 py-4">
        <p className="line-clamp-3 text-muted-foreground">
          {period.notes ??
            "—"}
        </p>
      </td>

      <td className="min-w-[340px] px-4 py-4">
        <PeriodActions
          period={
            period
          }
        />
      </td>
    </tr>
  );
}


function PeriodActions({
  period,
}: {
  period: AccountingPeriod;
}) {
  if (
    period.status ===
    "open"
  ) {
    return (
      <form
        action={softCloseAccountingPeriodAction.bind(
          null,
          period.id,
        )}
        className="flex gap-2"
      >
        <input
          type="text"
          name="notes"
          placeholder="Optional review note"
          className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-xs"
        />

        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
        >
          Soft Close
        </button>
      </form>
    );
  }

  if (
    period.status ===
    "soft_closed"
  ) {
    return (
      <div className="space-y-3">
        <form
          action={closeAccountingPeriodAction.bind(
            null,
            period.id,
          )}
          className="flex gap-2"
        >
          <input
            type="text"
            name="notes"
            required
            minLength={3}
            placeholder="Final closing note"
            className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-xs"
          />

          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-lg bg-red-700 px-3 text-xs font-semibold text-white transition hover:bg-red-800"
          >
            Close
          </button>
        </form>

        <ReopenForm
          periodId={
            period.id
          }
        />
      </div>
    );
  }

  return (
    <ReopenForm
      periodId={
        period.id
      }
    />
  );
}


function ReopenForm({
  periodId,
}: {
  periodId: string;
}) {
  return (
    <form
      action={reopenAccountingPeriodAction.bind(
        null,
        periodId,
      )}
      className="flex gap-2"
    >
      <input
        type="text"
        name="reason"
        required
        minLength={3}
        placeholder="Reopen reason"
        className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-xs"
      />

      <button
        type="submit"
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        <RotateCcw className="size-3.5" />
        Reopen
      </button>
    </form>
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
          <p className="text-sm text-muted-foreground">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold">
            {value}
          </p>
        </div>

        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}