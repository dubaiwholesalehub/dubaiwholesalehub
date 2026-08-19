import Link from "next/link";

import {
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth/require-admin";

import {
  runGlValidationSuiteAction,
  type GlValidationSuiteResult,
} from "./actions";

import { testSalesOrderGlPostingAction } from "./sales-order-action";
import { testCustomerReceiptGlPostingAction } from "./customer-receipt-action";

interface GlValidationPageProps {
  searchParams: Promise<{
    run?: string;

    salesOrderId?: string;
    testSalesOrder?: string;

    customerReceiptId?: string;
    testCustomerReceipt?: string;
  }>;
}

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",

    timeStyle: "medium",
  }).format(new Date(value));
}

export default async function GlValidationPage({
  searchParams,
}: GlValidationPageProps) {
  await requireAdmin();

  const params = await searchParams;

  const salesOrderId = params.salesOrderId?.trim() ?? "";

  let salesOrderTest: Awaited<
    ReturnType<typeof testSalesOrderGlPostingAction>
  > | null = null;

  let salesOrderTestError: string | null = null;

  if (params.testSalesOrder === "1" && salesOrderId) {
    try {
      salesOrderTest = await testSalesOrderGlPostingAction(salesOrderId);
    } catch (error) {
      salesOrderTestError =
        error instanceof Error
          ? error.message
          : "Unable to test Sales Order GL posting.";
    }
  }

  const customerReceiptId = params.customerReceiptId?.trim() ?? "";

  let customerReceiptTest: Awaited<
    ReturnType<typeof testCustomerReceiptGlPostingAction>
  > | null = null;

  let customerReceiptTestError: string | null = null;

  if (params.testCustomerReceipt === "1" && customerReceiptId) {
    try {
      customerReceiptTest =
        await testCustomerReceiptGlPostingAction(customerReceiptId);
    } catch (error) {
      customerReceiptTestError =
        error instanceof Error
          ? error.message
          : "Unable to test Customer Receipt GL posting.";
    }
  }

  let suite: GlValidationSuiteResult | null = null;

  let executionError: string | null = null;

  /*
   * The validation suite only runs when explicitly requested.
   * Simply opening this page never creates GL transactions.
   */
  if (params.run === "1") {
    try {
      suite = await runGlValidationSuiteAction();
    } catch (error) {
      executionError =
        error instanceof Error
          ? error.message
          : "The GL validation suite could not be completed.";
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div>
        <Link
          href="/admin/accounts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-amber-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Accounts
        </Link>

        <div className="mt-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <FlaskConical className="h-6 w-6" />
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">
              Accounting Engine Validation
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              General Ledger Test Suite
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Validate balanced posting, accounting controls, ERP idempotency,
              closed-period protection, immutability and formal journal reversal
              using your authenticated administrator session.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

          <div>
            <h2 className="font-semibold text-amber-950">
              Controlled accounting test
            </h2>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              The suite creates small AED 1.00 validation journals. Successful
              validation journals are formally reversed so the net accounting
              impact remains zero. The suite also temporarily closes one prior
              accounting period and restores its original status afterward.
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-950">
              Customer Receipt → GL Test
            </h2>

            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700">
              Migration 090
            </span>
          </div>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Enter a real posted Customer Receipt ID. The test automatically
            validates the selected Financial Account debit, Accounts Receivable
            credit, Customer Advance credit, journal balance, ERP source linkage
            and duplicate-posting protection.
          </p>
        </div>

        <form method="get" className="mt-5 flex flex-col gap-3 md:flex-row">
          <input type="hidden" name="testCustomerReceipt" value="1" />

          <input
            type="text"
            name="customerReceiptId"
            defaultValue={customerReceiptId}
            placeholder="Customer Receipt UUID"
            className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Test Customer Receipt GL
          </button>
        </form>

        {customerReceiptTestError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {customerReceiptTestError}
          </div>
        )}

        {customerReceiptTest && (
          <div className="mt-5 space-y-5">
            <div
              className={`rounded-xl border p-4 ${
                customerReceiptTest.checks.allPassed
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div
                className={`font-semibold ${
                  customerReceiptTest.checks.allPassed
                    ? "text-green-900"
                    : "text-red-900"
                }`}
              >
                {customerReceiptTest.checks.allPassed
                  ? "Customer Receipt GL posting passed"
                  : "Customer Receipt GL posting requires attention"}
              </div>

              <div
                className={`mt-2 text-sm ${
                  customerReceiptTest.checks.allPassed
                    ? "text-green-800"
                    : "text-red-800"
                }`}
              >
                Receipt: {customerReceiptTest.receipt.receipt_number}
                {" · "}
                Journal: {customerReceiptTest.journal.journal_number}
                {" · "}
                Case: {customerReceiptTest.caseType.replaceAll("_", " ")}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReceiptMetric
                label="Receipt"
                value={customerReceiptTest.receipt.amount}
                currency={customerReceiptTest.receipt.currency_code}
              />

              <ReceiptMetric
                label="Allocated"
                value={customerReceiptTest.receipt.allocated_amount}
                currency={customerReceiptTest.receipt.currency_code}
              />

              <ReceiptMetric
                label="Customer Advance"
                value={customerReceiptTest.receipt.unallocated_amount}
                currency={customerReceiptTest.receipt.currency_code}
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Journal Lines
                </div>

                <div className="mt-2 text-xl font-bold text-slate-950">
                  {customerReceiptTest.balance.line_count}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <CheckCard
                label="Balanced"
                passed={customerReceiptTest.checks.balanced}
              />

              <CheckCard
                label="Source Link"
                passed={customerReceiptTest.checks.sourceLinkage}
              />

              <CheckCard
                label="Correct Lines"
                passed={customerReceiptTest.checks.correctLineCount}
              />

              <CheckCard
                label="Idempotent"
                passed={customerReceiptTest.checks.idempotent}
              />

              <CheckCard
                label="Financial Account Dr"
                passed={customerReceiptTest.checks.financialAccountDebit}
              />

              <CheckCard
                label="Accounts Receivable Cr"
                passed={customerReceiptTest.checks.accountsReceivableCredit}
              />

              <CheckCard
                label="Customer Advance Cr"
                passed={customerReceiptTest.checks.customerAdvanceCredit}
              />

              <CheckCard
                label="Posted Receipt"
                passed={customerReceiptTest.checks.postedReceipt}
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">#</th>

                    <th className="px-4 py-3">Account</th>

                    <th className="px-4 py-3">Description</th>

                    <th className="px-4 py-3 text-right">Debit</th>

                    <th className="px-4 py-3 text-right">Credit</th>

                    <th className="px-4 py-3 text-right">Base Debit</th>

                    <th className="px-4 py-3 text-right">Base Credit</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {customerReceiptTest.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3">{line.line_number}</td>

                      <td className="px-4 py-3 font-medium">
                        {line.gl_account
                          ? `${line.gl_account.account_code} — ${line.gl_account.account_name}`
                          : "Unknown"}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {line.description}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {line.debit.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {line.credit.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {line.base_debit.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {line.base_credit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Source:</span>{" "}
              {customerReceiptTest.journal.source_type}
              {" · "}
              <span className="font-semibold text-slate-900">
                Journal status:
              </span>{" "}
              {customerReceiptTest.journal.status}
              {" · "}
              <span className="font-semibold text-slate-900">
                Base balance:
              </span>{" "}
              AED {customerReceiptTest.balance.total_base_debit.toFixed(2)}
              {" = "}
              AED {customerReceiptTest.balance.total_base_credit.toFixed(2)}
            </div>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Sales Order → GL Test
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Enter a real confirmed Sales Order ID. This will post Accounts
            Receivable, Sales Revenue and Output VAT through the new ERP → GL
            adapter.
          </p>
        </div>

        <form method="get" className="mt-5 flex flex-col gap-3 md:flex-row">
          <input type="hidden" name="testSalesOrder" value="1" />

          <input
            type="text"
            name="salesOrderId"
            defaultValue={salesOrderId}
            placeholder="Sales Order UUID"
            className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Test Sales Order GL Posting
          </button>
        </form>

        {salesOrderTestError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {salesOrderTestError}
          </div>
        )}

        {salesOrderTest && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="font-semibold text-green-900">
                Sales Order GL posting succeeded
              </div>

              <div className="mt-2 text-sm text-green-800">
                Journal: {salesOrderTest.journal.journal_number}
                {" · "}
                Status: {salesOrderTest.journal.status}
                {" · "}
                Balanced: {salesOrderTest.balance.is_balanced ? "Yes" : "No"}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">#</th>

                    <th className="px-4 py-3">Account</th>

                    <th className="px-4 py-3">Description</th>

                    <th className="px-4 py-3 text-right">Debit</th>

                    <th className="px-4 py-3 text-right">Credit</th>

                    <th className="px-4 py-3 text-right">Base Debit</th>

                    <th className="px-4 py-3 text-right">Base Credit</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {salesOrderTest.lines.map((line) => {
                    const account = Array.isArray(line.gl_account)
                      ? line.gl_account[0]
                      : line.gl_account;

                    return (
                      <tr key={line.line_number}>
                        <td className="px-4 py-3">{line.line_number}</td>

                        <td className="px-4 py-3 font-medium">
                          {account
                            ? `${account.account_code} — ${account.account_name}`
                            : "Unknown"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {line.description}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {Number(line.debit).toFixed(2)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {Number(line.credit).toFixed(2)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {Number(line.base_debit).toFixed(2)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {Number(line.base_credit).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Run complete validation
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Run all GL engine safeguards through the same authenticated
              Supabase session used by the ERP.
            </p>
          </div>

          <Link
            href="/admin/accounts/general-ledger/test?run=1"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            <FlaskConical className="h-4 w-4" />
            Run Complete GL Validation
          </Link>
        </div>
      </div>

      {executionError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6"
        >
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />

            <div>
              <h2 className="font-bold text-red-950">
                Validation could not run
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-800">
                {executionError}
              </p>
            </div>
          </div>
        </div>
      )}

      {suite && (
        <>
          <div
            className={`rounded-2xl border p-6 ${
              suite.success
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                {suite.success ? (
                  <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="mt-0.5 h-7 w-7 shrink-0 text-red-600" />
                )}

                <div>
                  <h2
                    className={`text-xl font-bold ${
                      suite.success ? "text-green-950" : "text-red-950"
                    }`}
                  >
                    {suite.success
                      ? "General Ledger engine passed"
                      : "General Ledger engine requires attention"}
                  </h2>

                  <p
                    className={`mt-1 text-sm ${
                      suite.success ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    Completed {dateTimeLabel(suite.completedAt)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="rounded-xl border border-green-200 bg-white px-5 py-3 text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {suite.passed}
                  </div>

                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Passed
                  </div>
                </div>

                <div className="rounded-xl border border-red-200 bg-white px-5 py-3 text-center">
                  <div className="text-2xl font-bold text-red-700">
                    {suite.failed}
                  </div>

                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Failed
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="font-bold text-slate-950">Validation results</h2>

              <p className="mt-1 text-sm text-slate-500">
                Each test is independently reported below.
              </p>
            </div>

            <div className="divide-y divide-slate-200">
              {suite.results.map((result, index) => (
                <div key={result.key} className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        result.status === "passed"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {result.status === "passed" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Test {index + 1}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                            result.status === "passed"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {result.status}
                        </span>
                      </div>

                      <h3 className="mt-2 font-bold text-slate-950">
                        {result.title}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {result.message}
                      </p>

                      {result.details && (
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-200">
                          {result.details}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!suite && !executionError && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <FlaskConical className="mx-auto h-10 w-10 text-slate-400" />

          <h2 className="mt-4 font-bold text-slate-950">
            Ready for validation
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            No GL tests run automatically. Click the button above when you are
            ready to validate the accounting engine.
          </p>
        </div>
      )}
    </div>
  );
}

function CheckCard({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-center gap-2">
        {passed ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}

        <span
          className={`text-sm font-semibold ${
            passed ? "text-green-900" : "text-red-900"
          }`}
        >
          {label}
        </span>
      </div>

      <div
        className={`mt-2 text-xs font-bold uppercase tracking-wide ${
          passed ? "text-green-700" : "text-red-700"
        }`}
      >
        {passed ? "Passed" : "Failed"}
      </div>
    </div>
  );
}

function ReceiptMetric({
  label,
  value,
  currency,
}: {
  label: string;
  value: number;
  currency: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-xl font-bold text-slate-950">
        {currency} {value.toFixed(2)}
      </div>
    </div>
  );
}
