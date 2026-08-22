"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  Plus,
  Trash2,
} from "lucide-react";

import type {
  ManualJournalAccount,
} from "@/lib/repositories/manual-journal.repository";

type JournalLine = {
  id: string;
  glAccountId: string;
  description: string;
  debit: string;
  credit: string;
};

function newLine(): JournalLine {
  return {
    id:
      crypto.randomUUID(),
    glAccountId:
      "",
    description:
      "",
    debit:
      "",
    credit:
      "",
  };
}

function amount(
  value: string,
) {
  const parsed =
    Number(value || 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-AE",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

export function ManualJournalForm({
  accounts,
  action,
}: {
  accounts: ManualJournalAccount[];
  action: (
    formData: FormData,
  ) => void | Promise<void>;
}) {
  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10,
      );

  const [
    lines,
    setLines,
  ] = useState<
    JournalLine[]
  >([
    newLine(),
    newLine(),
  ]);

  const totalDebit =
    useMemo(
      () =>
        lines.reduce(
          (total, line) =>
            total +
            amount(
              line.debit,
            ),
          0,
        ),
      [lines],
    );

  const totalCredit =
    useMemo(
      () =>
        lines.reduce(
          (total, line) =>
            total +
            amount(
              line.credit,
            ),
          0,
        ),
      [lines],
    );

  const difference =
    totalDebit -
    totalCredit;

  const isBalanced =
    totalDebit > 0 &&
    totalCredit > 0 &&
    Math.abs(
      difference,
    ) <
      0.005;

  const hasInvalidLine =
    lines.some(
      (line) => {
        const debit =
          amount(
            line.debit,
          );

        const credit =
          amount(
            line.credit,
          );

        return (
          !line.glAccountId ||
          debit < 0 ||
          credit < 0 ||
          (debit > 0 &&
            credit > 0) ||
          (debit === 0 &&
            credit === 0)
        );
      },
    );

  const canSubmit =
    lines.length >= 2 &&
    isBalanced &&
    !hasInvalidLine;

  function updateLine(
    id: string,
    patch: Partial<JournalLine>,
  ) {
    setLines(
      (current) =>
        current.map(
          (line) =>
            line.id === id
              ? {
                  ...line,
                  ...patch,
                }
              : line,
        ),
    );
  }

  function removeLine(
    id: string,
  ) {
    setLines(
      (current) =>
        current.length <= 2
          ? current
          : current.filter(
              (line) =>
                line.id !== id,
            ),
    );
  }

  const serializedLines =
    JSON.stringify(
      lines.map(
        (line) => ({
          glAccountId:
            line.glAccountId,
          description:
            line.description,
          debit:
            amount(
              line.debit,
            ),
          credit:
            amount(
              line.credit,
            ),
        }),
      ),
    );

  return (
    <form
      action={action}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="lines"
        value={
          serializedLines
        }
      />

      <section className="rounded-2xl border bg-card p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">
              Journal Date
            </span>

            <input
              name="journalDate"
              type="date"
              required
              defaultValue={
                today
              }
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">
              Posting Date
            </span>

            <input
              name="postingDate"
              type="date"
              required
              defaultValue={
                today
              }
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold">
              Reference
            </span>

            <input
              name="reference"
              type="text"
              placeholder="Optional internal reference"
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold">
              Journal Description
            </span>

            <textarea
              name="description"
              required
              rows={3}
              placeholder="Describe the accounting adjustment and its purpose."
              className="w-full rounded-lg border bg-background px-3 py-3 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">
              Journal Lines
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              AED manual journal. Each line must contain either a debit or credit.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setLines(
                (current) => [
                  ...current,
                  newLine(),
                ],
              )
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition hover:bg-muted"
          >
            <Plus className="size-4" />
            Add Line
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">
                  Account
                </th>

                <th className="px-4 py-3">
                  Description
                </th>

                <th className="px-4 py-3 text-right">
                  Debit
                </th>

                <th className="px-4 py-3 text-right">
                  Credit
                </th>

                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y">
              {lines.map(
                (
                  line,
                  index,
                ) => (
                  <tr
                    key={
                      line.id
                    }
                  >
                    <td className="min-w-[280px] px-4 py-3">
                      <select
                        value={
                          line.glAccountId
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLine(
                            line.id,
                            {
                              glAccountId:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                        className="h-10 w-full rounded-lg border bg-background px-2 text-sm"
                      >
                        <option value="">
                          Select GL account
                        </option>

                        {accounts.map(
                          (
                            account,
                          ) => (
                            <option
                              key={
                                account.id
                              }
                              value={
                                account.id
                              }
                            >
                              {
                                account.accountCode
                              }{" "}
                              —{" "}
                              {
                                account.accountName
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </td>

                    <td className="min-w-[260px] px-4 py-3">
                      <input
                        value={
                          line.description
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLine(
                            line.id,
                            {
                              description:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                        placeholder={`Line ${
                          index + 1
                        } description`}
                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        value={
                          line.debit
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLine(
                            line.id,
                            {
                              debit:
                                event
                                  .target
                                  .value,
                              credit:
                                Number(
                                  event
                                    .target
                                    .value ||
                                    0,
                                ) >
                                0
                                  ? ""
                                  : line.credit,
                            },
                          )
                        }
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10 w-32 rounded-lg border bg-background px-3 text-right tabular-nums"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        value={
                          line.credit
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLine(
                            line.id,
                            {
                              credit:
                                event
                                  .target
                                  .value,
                              debit:
                                Number(
                                  event
                                    .target
                                    .value ||
                                    0,
                                ) >
                                0
                                  ? ""
                                  : line.debit,
                            },
                          )
                        }
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10 w-32 rounded-lg border bg-background px-3 text-right tabular-nums"
                      />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={
                          lines.length <=
                          2
                        }
                        onClick={() =>
                          removeLine(
                            line.id,
                          )
                        }
                        className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>

            <tfoot>
              <tr className="border-t-2 bg-muted/30 font-semibold">
                <td
                  colSpan={2}
                  className="px-4 py-4 text-right"
                >
                  Total
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  AED{" "}
                  {money(
                    totalDebit,
                  )}
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  AED{" "}
                  {money(
                    totalCredit,
                  )}
                </td>

                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section
        className={`rounded-2xl border p-5 ${
          isBalanced
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">
              Journal Control
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Difference: AED{" "}
              {money(
                difference,
              )}
            </p>
          </div>

          <div
            className={
              isBalanced
                ? "font-semibold text-emerald-700"
                : "font-semibold text-amber-700"
            }
          >
            {isBalanced
              ? "Balanced"
              : "Not Balanced"}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={
            !canSubmit
          }
          className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Post Manual Journal
        </button>
      </div>
    </form>
  );
}