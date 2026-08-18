"use client";

import {
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  createFinancialTransferAction,
} from "@/app/admin/(protected)/accounts/transfers/actions";


interface FinancialAccountOption {
  id: string;

  accountName: string;

  currencyCode: string;

  currentBalance: number;
}


interface FinancialTransferFormProps {
  accounts:
    FinancialAccountOption[];
}


export default function FinancialTransferForm({
  accounts,
}: FinancialTransferFormProps) {
  const [
    fromAccountId,
    setFromAccountId,
  ] =
    useState("");

  const [
    toAccountId,
    setToAccountId,
  ] =
    useState("");

  const [
    fromAmount,
    setFromAmount,
  ] =
    useState("");

  const [
    exchangeRate,
    setExchangeRate,
  ] =
    useState("1");


  const fromAccount =
    useMemo(
      () =>
        accounts.find(
          (account) =>
            account.id ===
            fromAccountId,
        ),
      [
        accounts,
        fromAccountId,
      ],
    );


  const toAccount =
    useMemo(
      () =>
        accounts.find(
          (account) =>
            account.id ===
            toAccountId,
        ),
      [
        accounts,
        toAccountId,
      ],
    );


  const sameCurrency =
    Boolean(
      fromAccount &&
      toAccount &&
      fromAccount.currencyCode ===
        toAccount.currencyCode,
    );


  const calculatedToAmount =
    useMemo(
      () => {
        const amount =
          Number(
            fromAmount,
          );

        const rate =
          Number(
            exchangeRate,
          );


        if (
          !Number.isFinite(
            amount,
          ) ||
          amount <= 0
        ) {
          return "";
        }


        if (sameCurrency) {
          return amount.toFixed(
            2,
          );
        }


        if (
          !Number.isFinite(
            rate,
          ) ||
          rate <= 0
        ) {
          return "";
        }


        return (
          amount *
          rate
        ).toFixed(2);
      },
      [
        fromAmount,
        exchangeRate,
        sameCurrency,
      ],
    );


  function handleFromAccountChange(
    accountId: string,
  ) {
    setFromAccountId(
      accountId,
    );

    const source =
      accounts.find(
        (account) =>
          account.id ===
          accountId,
      );

    const destination =
      accounts.find(
        (account) =>
          account.id ===
          toAccountId,
      );


    if (
      source &&
      destination &&
      source.currencyCode ===
        destination.currencyCode
    ) {
      setExchangeRate(
        "1",
      );
    }
  }


  function handleToAccountChange(
    accountId: string,
  ) {
    setToAccountId(
      accountId,
    );

    const source =
      accounts.find(
        (account) =>
          account.id ===
          fromAccountId,
      );

    const destination =
      accounts.find(
        (account) =>
          account.id ===
          accountId,
      );


    if (
      source &&
      destination &&
      source.currencyCode ===
        destination.currencyCode
    ) {
      setExchangeRate(
        "1",
      );
    }
  }


  return (
    <form
      action={
        createFinancialTransferAction
      }
      className="space-y-6"
    >
      <section className="rounded-2xl border bg-card p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Transfer Date"
            required
          >
            <input
              type="date"
              name="transferDate"
              required
              defaultValue={
                new Date()
                  .toISOString()
                  .slice(
                    0,
                    10,
                  )
              }
              className={
                inputClass
              }
            />
          </Field>


          <Field label="Reference">
            <input
              name="referenceNumber"
              placeholder="Optional bank / internal reference"
              className={
                inputClass
              }
            />
          </Field>


          <Field
            label="From Account"
            required
          >
            <select
              name="fromAccountId"
              required
              value={
                fromAccountId
              }
              onChange={(
                event,
              ) =>
                handleFromAccountChange(
                  event.target
                    .value,
                )
              }
              className={
                inputClass
              }
            >
              <option value="">
                Select source account
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
                      account.accountName
                    }
                    {" — "}
                    {
                      account.currencyCode
                    }{" "}
                    {account.currentBalance.toFixed(
                      2,
                    )}
                  </option>
                ),
              )}
            </select>
          </Field>


          <Field
            label="To Account"
            required
          >
            <select
              name="toAccountId"
              required
              value={
                toAccountId
              }
              onChange={(
                event,
              ) =>
                handleToAccountChange(
                  event.target
                    .value,
                )
              }
              className={
                inputClass
              }
            >
              <option value="">
                Select destination account
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
                    disabled={
                      account.id ===
                      fromAccountId
                    }
                  >
                    {
                      account.accountName
                    }
                    {" — "}
                    {
                      account.currencyCode
                    }{" "}
                    {account.currentBalance.toFixed(
                      2,
                    )}
                  </option>
                ),
              )}
            </select>
          </Field>


          <Field
            label={`Amount From${
              fromAccount
                ? ` (${fromAccount.currencyCode})`
                : ""
            }`}
            required
          >
            <input
              type="number"
              name="fromAmount"
              min="0.01"
              step="0.01"
              required
              value={
                fromAmount
              }
              onChange={(
                event,
              ) =>
                setFromAmount(
                  event.target
                    .value,
                )
              }
              placeholder="1000.00"
              className={
                inputClass
              }
            />
          </Field>


          <Field
            label={`Amount To${
              toAccount
                ? ` (${toAccount.currencyCode})`
                : ""
            }`}
            required
          >
            <input
              type="number"
              name="toAmount"
              step="0.01"
              required
              value={
                calculatedToAmount
              }
              readOnly
              placeholder="0.00"
              className={`${inputClass} bg-muted/40`}
            />

            <p className="text-xs text-muted-foreground">
              Automatically calculated from the transfer amount and exchange rate.
            </p>
          </Field>


          <Field label="Exchange Rate">
            <input
              type="number"
              name="exchangeRate"
              min="0.000001"
              step="0.000001"
              value={
                exchangeRate
              }
              onChange={(
                event,
              ) =>
                setExchangeRate(
                  event.target
                    .value,
                )
              }
              readOnly={
                sameCurrency
              }
              className={`${inputClass} ${
                sameCurrency
                  ? "bg-muted/40"
                  : ""
              }`}
            />

            {sameCurrency ? (
              <p className="text-xs text-muted-foreground">
                Same currency — exchange rate fixed at 1.
              </p>
            ) : null}
          </Field>
        </div>


        <div className="mt-5">
          <Field label="Notes">
            <textarea
              name="notes"
              rows={4}
              placeholder="Optional internal notes"
              className={
                textareaClass
              }
            />
          </Field>
        </div>
      </section>


      {fromAccount &&
      toAccount ? (
        <section className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm font-semibold">
            Transfer Preview
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">
              {
                fromAccount.accountName
              }
            </span>

            <span>
              →
            </span>

            <span className="font-medium">
              {
                toAccount.accountName
              }
            </span>

            {fromAmount &&
            calculatedToAmount ? (
              <span className="text-muted-foreground">
                •{" "}
                {
                  fromAccount.currencyCode
                }{" "}
                {Number(
                  fromAmount,
                ).toFixed(2)}
                {" → "}
                {
                  toAccount.currencyCode
                }{" "}
                {
                  calculatedToAmount
                }
              </span>
            ) : null}
          </div>
        </section>
      ) : null}


      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-medium text-blue-900">
          Accounting treatment
        </p>

        <p className="mt-1 text-sm text-blue-800/80">
          The source account records Transfer Out and the destination account records Transfer In. Internal transfers do not affect business profit or expenses.
        </p>
      </section>


      <div className="flex justify-end gap-3">
        <Link
          href="/admin/accounts/transfers"
          className="inline-flex h-11 items-center rounded-lg border px-5 text-sm font-semibold"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={
            !fromAccount ||
            !toAccount ||
            !fromAmount ||
            !calculatedToAmount
          }
          className="inline-flex h-11 items-center rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Post Transfer
        </button>
      </div>
    </form>
  );
}


function Field({
  label,
  required,
  children,
}: {
  label: string;

  required?: boolean;

  children:
    React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium">
        {label}

        {required ? (
          <span className="ml-1 text-red-600">
            *
          </span>
        ) : null}
      </span>

      {children}
    </label>
  );
}


const inputClass =
  "h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const textareaClass =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";