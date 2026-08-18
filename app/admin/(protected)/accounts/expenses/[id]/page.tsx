import {
  ArrowLeft,
} from "lucide-react";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  getExpenseById,
} from "@/lib/repositories/expense.repository";

import {
  cancelExpenseAction,
  postExpenseAction,
} from "../actions";


interface ExpenseDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}


export default async function ExpenseDetailsPage({
  params,
}: ExpenseDetailsPageProps) {
  const {
    id,
  } =
    await params;

  const expense =
    await getExpenseById(
      id,
    );

  if (!expense) {
    notFound();
  }


  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/admin/accounts/expenses"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />

        Expenses
      </Link>


      <section className="rounded-2xl border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Expense
            </p>

            <h1 className="mt-1 text-2xl font-semibold">
              {
                expense.expenseNumber
              }
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {
                expense.expenseDate
              }
              {" · "}
              {
                expense.categoryName
              }
            </p>
          </div>

          <span className="rounded-full border px-3 py-1 text-sm font-semibold capitalize">
            {
              expense.status
            }
          </span>
        </div>
      </section>


      <section className="grid gap-4 md:grid-cols-3">
        <Metric
          label="Net"
          value={
            expense.netAmount
          }
        />

        <Metric
          label="VAT"
          value={
            expense.taxAmount
          }
        />

        <Metric
          label="Gross"
          value={
            expense.grossAmount
          }
        />
      </section>


      <section className="rounded-2xl border bg-card p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Info
            label="Payee"
            value={
              expense.payeeName ||
              expense.supplierName ||
              "—"
            }
          />

          <Info
            label="Paid From"
            value={
              expense.financialAccountName ??
              "—"
            }
          />

          <Info
            label="Payment Method"
            value={
              expense.paymentMethod ??
              "—"
            }
          />

          <Info
            label="Payment Reference"
            value={
              expense.paymentReference ??
              "—"
            }
          />

          <Info
            label="VAT Treatment"
            value={
              expense.taxTreatment
            }
          />

          <Info
            label="Supplier Invoice"
            value={
              expense.supplierInvoiceNumber ??
              "—"
            }
          />
        </div>
      </section>


      {expense.status ===
      "draft" ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold">
            Post Expense
          </h2>

          <p className="mt-1 text-sm text-amber-900/70">
            Posting creates the linked money-out transaction and updates the selected Cash/Bank account balance.
          </p>

          <form
            action={
              postExpenseAction
            }
            className="mt-4"
          >
            <input
              type="hidden"
              name="expenseId"
              value={
                expense.id
              }
            />

            <button
              type="submit"
              className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Post Expense
            </button>
          </form>
        </section>
      ) : null}


      {expense.status ===
      "posted" ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-900">
            Cancel Expense
          </h2>

          <p className="mt-1 text-sm text-red-800/70">
            Cancellation will cancel the linked money-out transaction and restore the financial account balance.
          </p>

          <form
            action={
              cancelExpenseAction
            }
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="hidden"
              name="expenseId"
              value={
                expense.id
              }
            />

            <input
              name="reason"
              required
              placeholder="Cancellation reason"
              className="h-10 flex-1 rounded-lg border bg-white px-3 text-sm"
            />

            <button
              type="submit"
              className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Cancel Expense
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}


function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold">
        AED{" "}
        {money(
          value,
        )}
      </p>
    </div>
  );
}


function Info({
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

      <p className="mt-1 font-medium">
        {value}
      </p>
    </div>
  );
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