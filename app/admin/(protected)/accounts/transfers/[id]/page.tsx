import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
} from "lucide-react";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  getFinancialTransferById,
} from "@/lib/repositories/financial-transfer.repository";

import {
  cancelFinancialTransferAction,
} from "../actions";


interface FinancialTransferPageProps {
  params: Promise<{
    id: string;
  }>;
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


export default async function FinancialTransferPage({
  params,
}: FinancialTransferPageProps) {
  const {
    id,
  } =
    await params;


  const transfer =
    await getFinancialTransferById(
      id,
    );


  if (!transfer) {
    notFound();
  }


  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/admin/accounts/transfers"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />

        Financial Transfers
      </Link>


      <section className="rounded-2xl border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <ArrowRightLeft className="size-5" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Financial Transfer
              </p>

              <h1 className="mt-1 text-2xl font-semibold">
                {
                  transfer.transferNumber
                }
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                {
                  transfer.transferDate
                }
              </p>
            </div>
          </div>

          <span className="rounded-full border px-3 py-1 text-sm font-semibold capitalize">
            {
              transfer.status
            }
          </span>
        </div>
      </section>


      <section className="rounded-2xl border bg-card p-6">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-xl border p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              From
            </p>

            <p className="mt-2 text-lg font-semibold">
              {
                transfer.fromAccountName
              }
            </p>

            <p className="mt-3 text-2xl font-bold text-red-700">
              -{" "}
              {
                transfer.fromCurrencyCode
              }{" "}
              {money(
                transfer.fromAmount,
              )}
            </p>
          </div>


          <ArrowRight className="mx-auto size-6 text-muted-foreground" />


          <div className="rounded-xl border p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              To
            </p>

            <p className="mt-2 text-lg font-semibold">
              {
                transfer.toAccountName
              }
            </p>

            <p className="mt-3 text-2xl font-bold text-emerald-700">
              +{" "}
              {
                transfer.toCurrencyCode
              }{" "}
              {money(
                transfer.toAmount,
              )}
            </p>
          </div>
        </div>
      </section>


      <section className="rounded-2xl border bg-card p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Info
            label="Exchange Rate"
            value={
              String(
                transfer.exchangeRate,
              )
            }
          />

          <Info
            label="Reference"
            value={
              transfer.referenceNumber ??
              "—"
            }
          />

          <Info
            label="Transfer Group"
            value={
              transfer.transferGroupId
            }
          />

          <Info
            label="Out Transaction"
            value={
              transfer.outTransactionId ??
              "—"
            }
          />

          <Info
            label="In Transaction"
            value={
              transfer.inTransactionId ??
              "—"
            }
          />

          <Info
            label="Notes"
            value={
              transfer.notes ??
              "—"
            }
          />
        </div>
      </section>


      {transfer.status ===
      "posted" ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-900">
            Cancel Transfer
          </h2>

          <p className="mt-1 text-sm text-red-800/70">
            Cancelling the transfer reverses both the Transfer Out and Transfer In transactions and restores both account balances.
          </p>

          <form
            action={
              cancelFinancialTransferAction
            }
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="hidden"
              name="transferId"
              value={
                transfer.id
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
              Cancel Transfer
            </button>
          </form>
        </section>
      ) : null}


      {transfer.status ===
      "cancelled" ? (
        <section className="rounded-xl border bg-muted/30 p-5">
          <p className="text-sm font-semibold">
            Cancellation Reason
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            {
              transfer.cancellationReason ??
              "—"
            }
          </p>
        </section>
      ) : null}
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

      <p className="mt-1 break-all font-medium">
        {value}
      </p>
    </div>
  );
}