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
import { testQuickPurchaseGlPostingAction } from "./quick-purchase-action";
import { testSupplierPaymentGlPostingAction } from "./supplier-payment-action";
import { testSupplierAdvanceGlPostingAction } from "./supplier-advance-action";
import { testInventoryCogsGlPostingAction } from "./inventory-cogs-action";
import { testExpenseGlPostingAction } from "./expense-action";
import { testManualInventoryGlPostingAction } from "./manual-inventory-action";
import { testFinancialAccountTransferGlPostingAction } from "./financial-account-transfer-action";
import { testFinancialAccountOpeningBalanceGlPostingAction } from "./financial-account-opening-balance-action";
interface GlValidationPageProps {
  searchParams: Promise<{
    run?: string;

    salesOrderId?: string;
    testSalesOrder?: string;

    customerReceiptId?: string;
    testCustomerReceipt?: string;

    quickPurchaseId?: string;
    testQuickPurchase?: string;

    supplierPaymentId?: string;
    testSupplierPayment?: string;

    supplierAdvanceAllocationId?: string;
    testSupplierAdvance?: string;

    inventoryTransactionId?: string;
    testInventoryCogs?: string;

    expenseId?: string;
    testExpense?: string;

    manualInventoryTransactionId?: string;
    testManualInventory?: string;

    financialAccountTransferId?: string;
    testFinancialAccountTransfer?: string;

    financialAccountOpeningBalanceId?: string;
    testFinancialAccountOpeningBalance?: string;
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

  const quickPurchaseId = params.quickPurchaseId?.trim() ?? "";

  let quickPurchaseTest: Awaited<
    ReturnType<typeof testQuickPurchaseGlPostingAction>
  > | null = null;

  let quickPurchaseTestError: string | null = null;

  if (params.testQuickPurchase === "1" && quickPurchaseId) {
    try {
      quickPurchaseTest =
        await testQuickPurchaseGlPostingAction(quickPurchaseId);
    } catch (error) {
      quickPurchaseTestError =
        error instanceof Error
          ? error.message
          : "Unable to test Quick Purchase GL posting.";
    }
  }

  const supplierPaymentId = params.supplierPaymentId?.trim() ?? "";

  let supplierPaymentTest: Awaited<
    ReturnType<typeof testSupplierPaymentGlPostingAction>
  > | null = null;

  let supplierPaymentTestError: string | null = null;

  if (params.testSupplierPayment === "1" && supplierPaymentId) {
    try {
      supplierPaymentTest =
        await testSupplierPaymentGlPostingAction(supplierPaymentId);
    } catch (error) {
      supplierPaymentTestError =
        error instanceof Error
          ? error.message
          : "Unable to test Supplier Payment GL posting.";
    }
  }

  const supplierAdvanceAllocationId =
    params.supplierAdvanceAllocationId?.trim() ?? "";

  let supplierAdvanceTest: Awaited<
    ReturnType<typeof testSupplierAdvanceGlPostingAction>
  > | null = null;

  let supplierAdvanceTestError: string | null = null;

  if (params.testSupplierAdvance === "1" && supplierAdvanceAllocationId) {
    try {
      supplierAdvanceTest = await testSupplierAdvanceGlPostingAction(
        supplierAdvanceAllocationId,
      );
    } catch (error) {
      supplierAdvanceTestError =
        error instanceof Error
          ? error.message
          : "Unable to test Supplier Advance GL posting.";
    }
  }

  const inventoryTransactionId = params.inventoryTransactionId?.trim() ?? "";

  let inventoryCogsTest: Awaited<
    ReturnType<typeof testInventoryCogsGlPostingAction>
  > | null = null;

  let inventoryCogsTestError: string | null = null;

  if (params.testInventoryCogs === "1" && inventoryTransactionId) {
    try {
      inventoryCogsTest = await testInventoryCogsGlPostingAction(
        inventoryTransactionId,
      );
    } catch (error) {
      inventoryCogsTestError =
        error instanceof Error
          ? error.message
          : "Unable to test Inventory COGS GL posting.";
    }
  }

  const expenseId = params.expenseId?.trim() ?? "";

  let expenseTest: Awaited<
    ReturnType<typeof testExpenseGlPostingAction>
  > | null = null;

  let expenseTestError: string | null = null;

  if (params.testExpense === "1" && expenseId) {
    try {
      expenseTest = await testExpenseGlPostingAction(expenseId);
    } catch (error) {
      expenseTestError =
        error instanceof Error
          ? error.message
          : "Unable to test Expense GL posting.";
    }
  }

  const manualInventoryTransactionId =
    params.manualInventoryTransactionId?.trim() ?? "";

  let manualInventoryTest: Awaited<
    ReturnType<typeof testManualInventoryGlPostingAction>
  > | null = null;

  let manualInventoryTestError: string | null = null;

  if (params.testManualInventory === "1" && manualInventoryTransactionId) {
    try {
      manualInventoryTest = await testManualInventoryGlPostingAction(
        manualInventoryTransactionId,
      );
    } catch (error) {
      manualInventoryTestError =
        error instanceof Error
          ? error.message
          : "Unable to test Manual Inventory GL posting.";
    }
  }

  const financialAccountTransferId =
    params.financialAccountTransferId?.trim() ?? "";

  let financialAccountTransferTest: Awaited<
    ReturnType<typeof testFinancialAccountTransferGlPostingAction>
  > | null = null;

  let financialAccountTransferTestError: string | null = null;

  if (
    params.testFinancialAccountTransfer === "1" &&
    financialAccountTransferId
  ) {
    try {
      financialAccountTransferTest =
        await testFinancialAccountTransferGlPostingAction(
          financialAccountTransferId,
        );
    } catch (error) {
      financialAccountTransferTestError =
        error instanceof Error
          ? error.message
          : "Unable to test Financial Account Transfer GL posting.";
    }
  }

  const financialAccountOpeningBalanceId =
    params.financialAccountOpeningBalanceId?.trim() ?? "";

  let financialAccountOpeningBalanceTest: Awaited<
    ReturnType<typeof testFinancialAccountOpeningBalanceGlPostingAction>
  > | null = null;

  let financialAccountOpeningBalanceTestError: string | null = null;

  if (
    params.testFinancialAccountOpeningBalance === "1" &&
    financialAccountOpeningBalanceId
  ) {
    try {
      financialAccountOpeningBalanceTest =
        await testFinancialAccountOpeningBalanceGlPostingAction(
          financialAccountOpeningBalanceId,
        );
    } catch (error) {
      financialAccountOpeningBalanceTestError =
        error instanceof Error
          ? error.message
          : "Unable to test Financial Account Opening Balance GL posting.";
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
              Financial Account Opening Balance → GL Test
            </h2>

            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700">
              Migration 098
            </span>
          </div>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Enter a Financial Account ID with a posted opening balance. This
            test validates the linked opening-balance account transaction,
            financial-account GL mapping, Opening Balance Equity offset, source
            linkage, dimensions and idempotency.
          </p>
        </div>

        <form method="get" className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            type="hidden"
            name="testFinancialAccountOpeningBalance"
            value="1"
          />

          <input
            type="text"
            name="financialAccountOpeningBalanceId"
            defaultValue={financialAccountOpeningBalanceId}
            placeholder="Financial Account UUID"
            className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Test Opening Balance GL
          </button>
        </form>

        {financialAccountOpeningBalanceTestError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {financialAccountOpeningBalanceTestError}
          </div>
        )}

        {financialAccountOpeningBalanceTest && (
          <div className="mt-5 space-y-5">
            <div
              className={`rounded-xl border p-4 ${
                financialAccountOpeningBalanceTest.checks.allPassed
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div
                className={`font-semibold ${
                  financialAccountOpeningBalanceTest.checks.allPassed
                    ? "text-green-900"
                    : "text-red-900"
                }`}
              >
                {financialAccountOpeningBalanceTest.checks.allPassed
                  ? "Financial Account Opening Balance GL posting passed"
                  : "Financial Account Opening Balance GL posting requires attention"}
              </div>

              <div className="mt-2 text-sm text-slate-700">
                Account:{" "}
                {financialAccountOpeningBalanceTest.account.account_code}
                {" · "}
                Journal:{" "}
                {financialAccountOpeningBalanceTest.journal.journal_number}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReceiptMetric
                label="Opening Balance"
                value={
                  financialAccountOpeningBalanceTest.account.opening_balance
                }
                currency={
                  financialAccountOpeningBalanceTest.account.currency_code
                }
              />

              <ReceiptMetric
                label="Audit Transaction"
                value={
                  financialAccountOpeningBalanceTest.transaction.base_amount
                }
                currency="AED"
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Direction
                </div>

                <div className="mt-2 text-xl font-bold capitalize text-slate-950">
                  {financialAccountOpeningBalanceTest.transaction.direction}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Journal Lines
                </div>

                <div className="mt-2 text-xl font-bold text-slate-950">
                  {financialAccountOpeningBalanceTest.balance.line_count}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <CheckCard
                label="Opening Balance Present"
                passed={
                  financialAccountOpeningBalanceTest.checks
                    .openingBalancePresent
                }
              />

              <CheckCard
                label="Posted Transaction"
                passed={
                  financialAccountOpeningBalanceTest.checks.postedTransaction
                }
              />

              <CheckCard
                label="Source Link"
                passed={financialAccountOpeningBalanceTest.checks.sourceLinkage}
              />

              <CheckCard
                label="Balanced"
                passed={financialAccountOpeningBalanceTest.checks.balanced}
              />

              <CheckCard
                label="Correct Lines"
                passed={
                  financialAccountOpeningBalanceTest.checks.correctLineCount
                }
              />

              <CheckCard
                label="Financial Account Side"
                passed={
                  financialAccountOpeningBalanceTest.checks
                    .financialAccountSideCorrect
                }
              />

              <CheckCard
                label="Opening Equity Side"
                passed={
                  financialAccountOpeningBalanceTest.checks
                    .openingEquitySideCorrect
                }
              />

              <CheckCard
                label="Financial Account Link"
                passed={
                  financialAccountOpeningBalanceTest.checks
                    .financialAccountLinkage
                }
              />

              <CheckCard
                label="Account Transaction Link"
                passed={
                  financialAccountOpeningBalanceTest.checks
                    .accountTransactionLinkage
                }
              />

              <CheckCard
                label="Expected Accounts Only"
                passed={
                  financialAccountOpeningBalanceTest.checks.expectedAccountsOnly
                }
              />

              <CheckCard
                label="Idempotent"
                passed={financialAccountOpeningBalanceTest.checks.idempotent}
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Financial Account</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {financialAccountOpeningBalanceTest.lines.map((line) => (
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

                      <td className="px-4 py-3 font-mono text-xs">
                        {line.financial_account_id ?? "—"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {line.debit.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {line.credit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-950">
              Financial Account Transfer → GL Test
            </h2>

            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700">
              Migration 097
            </span>
          </div>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Enter a posted Financial Account Transfer ID. This test validates
            both operational transfer legs, AED base-value equality, destination
            debit, source credit, transfer-group linkage, financial-account
            dimensions, GL source linkage and idempotency.
          </p>
        </div>

        <form method="get" className="mt-5 flex flex-col gap-3 md:flex-row">
          <input type="hidden" name="testFinancialAccountTransfer" value="1" />

          <input
            type="text"
            name="financialAccountTransferId"
            defaultValue={financialAccountTransferId}
            placeholder="Financial Account Transfer UUID"
            className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Test Transfer GL
          </button>
        </form>

        {financialAccountTransferTestError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {financialAccountTransferTestError}
          </div>
        )}

        {financialAccountTransferTest && (
          <div className="mt-5 space-y-5">
            <div
              className={`rounded-xl border p-4 ${
                financialAccountTransferTest.checks.allPassed
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div
                className={`font-semibold ${
                  financialAccountTransferTest.checks.allPassed
                    ? "text-green-900"
                    : "text-red-900"
                }`}
              >
                {financialAccountTransferTest.checks.allPassed
                  ? "Financial Account Transfer GL posting passed"
                  : "Financial Account Transfer GL posting requires attention"}
              </div>

              <div className="mt-2 text-sm text-slate-700">
                Transfer:{" "}
                {financialAccountTransferTest.transfer.transfer_number}
                {" · "}
                Journal: {financialAccountTransferTest.journal.journal_number}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReceiptMetric
                label="Source Amount"
                value={financialAccountTransferTest.transfer.from_amount}
                currency={
                  financialAccountTransferTest.transfer.from_currency_code
                }
              />

              <ReceiptMetric
                label="Destination Amount"
                value={financialAccountTransferTest.transfer.to_amount}
                currency={
                  financialAccountTransferTest.transfer.to_currency_code
                }
              />

              <ReceiptMetric
                label="AED Base Amount"
                value={
                  financialAccountTransferTest.transactions.out.base_amount
                }
                currency="AED"
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Journal Lines
                </div>

                <div className="mt-2 text-xl font-bold text-slate-950">
                  {financialAccountTransferTest.balance.line_count}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <CheckCard
                label="Balanced"
                passed={financialAccountTransferTest.checks.balanced}
              />

              <CheckCard
                label="Posted Transfer"
                passed={financialAccountTransferTest.checks.postedTransfer}
              />

              <CheckCard
                label="Operational Transactions"
                passed={
                  financialAccountTransferTest.checks
                    .operationalTransactionsPosted
                }
              />

              <CheckCard
                label="Transfer Group"
                passed={
                  financialAccountTransferTest.checks.transferGroupLinkage
                }
              />

              <CheckCard
                label="Base Amounts Equal"
                passed={financialAccountTransferTest.checks.baseAmountsEqual}
              />

              <CheckCard
                label="Source Link"
                passed={financialAccountTransferTest.checks.sourceLinkage}
              />

              <CheckCard
                label="Correct Lines"
                passed={financialAccountTransferTest.checks.correctLineCount}
              />

              <CheckCard
                label="Destination Debit"
                passed={financialAccountTransferTest.checks.destinationDebit}
              />

              <CheckCard
                label="Source Credit"
                passed={financialAccountTransferTest.checks.sourceCredit}
              />

              <CheckCard
                label="Financial Account Link"
                passed={
                  financialAccountTransferTest.checks.financialAccountLinkage
                }
              />

              <CheckCard
                label="Account Transaction Link"
                passed={
                  financialAccountTransferTest.checks.accountTransactionLinkage
                }
              />

              <CheckCard
                label="Expected Accounts Only"
                passed={
                  financialAccountTransferTest.checks.expectedAccountsOnly
                }
              />

              <CheckCard
                label="Idempotent"
                passed={financialAccountTransferTest.checks.idempotent}
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Financial Account</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {financialAccountTransferTest.lines.map((line) => (
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

                      <td className="px-4 py-3 font-mono text-xs">
                        {line.financial_account_id ?? "—"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {line.debit.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {line.credit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-950">
              Manual Inventory → GL Test
            </h2>

            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700">
              Migration 096
            </span>
          </div>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Enter a posted manual Inventory Transaction ID. This test validates
            Opening Balance, Adjustment In, Adjustment Out and Stock Count
            accounting, including inventory valuation, offset accounts,
            product/warehouse dimensions, source-line linkage and idempotency.
          </p>
        </div>

        <form method="get" className="mt-5 flex flex-col gap-3 md:flex-row">
          <input type="hidden" name="testManualInventory" value="1" />

          <input
            type="text"
            name="manualInventoryTransactionId"
            defaultValue={manualInventoryTransactionId}
            placeholder="Inventory Transaction UUID"
            className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Test Manual Inventory GL
          </button>
        </form>

        {manualInventoryTestError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {manualInventoryTestError}
          </div>
        )}

        {manualInventoryTest && (
          <div className="mt-5 space-y-5">
            <div
              className={`rounded-xl border p-4 ${
                manualInventoryTest.checks.allPassed
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div
                className={`font-semibold ${
                  manualInventoryTest.checks.allPassed
                    ? "text-green-900"
                    : "text-red-900"
                }`}
              >
                {manualInventoryTest.checks.allPassed
                  ? "Manual Inventory GL posting passed"
                  : "Manual Inventory GL posting requires attention"}
              </div>

              <div className="mt-2 text-sm text-slate-700">
                Transaction:{" "}
                {manualInventoryTest.transaction.transaction_number}
                {" · "}
                Journal: {manualInventoryTest.journal.journal_number}
                {" · "}
                Case:{" "}
                {manualInventoryTest.expected.caseType.replaceAll("_", " ")}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReceiptMetric
                label="Accounting Value"
                value={manualInventoryTest.expected.totalValue}
                currency="AED"
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Accounting Items
                </div>

                <div className="mt-2 text-xl font-bold text-slate-950">
                  {manualInventoryTest.expected.accountingItemCount}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Expected Lines
                </div>

                <div className="mt-2 text-xl font-bold text-slate-950">
                  {manualInventoryTest.expected.expectedLineCount}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Journal Lines
                </div>

                <div className="mt-2 text-xl font-bold text-slate-950">
                  {manualInventoryTest.balance.line_count}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <CheckCard
                label="Balanced"
                passed={manualInventoryTest.checks.balanced}
              />

              <CheckCard
                label="Posted Transaction"
                passed={manualInventoryTest.checks.postedTransaction}
              />

              <CheckCard
                label="Supported Type"
                passed={manualInventoryTest.checks.supportedType}
              />

              <CheckCard
                label="Source Link"
                passed={manualInventoryTest.checks.sourceLinkage}
              />

              <CheckCard
                label="Correct Lines"
                passed={manualInventoryTest.checks.correctLineCount}
              />

              <CheckCard
                label="Inventory Side"
                passed={manualInventoryTest.checks.inventorySideCorrect}
              />

              <CheckCard
                label="Offset Side"
                passed={manualInventoryTest.checks.offsetSideCorrect}
              />

              <CheckCard
                label="Product Link"
                passed={manualInventoryTest.checks.productLinkage}
              />

              <CheckCard
                label="Warehouse Link"
                passed={manualInventoryTest.checks.warehouseLinkage}
              />

              <CheckCard
                label="Source Line Link"
                passed={manualInventoryTest.checks.sourceLineLinkage}
              />

              <CheckCard
                label="Expected Accounts Only"
                passed={manualInventoryTest.checks.onlyExpectedAccounts}
              />

              <CheckCard
                label="Idempotent"
                passed={manualInventoryTest.checks.idempotent}
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">#</th>

                    <th className="px-4 py-3">Account</th>

                    <th className="px-4 py-3">Description</th>

                    <th className="px-4 py-3">Product</th>

                    <th className="px-4 py-3">Warehouse</th>

                    <th className="px-4 py-3 text-right">Debit</th>

                    <th className="px-4 py-3 text-right">Credit</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {manualInventoryTest.lines.map((line) => (
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

                      <td className="px-4 py-3 font-mono text-xs">
                        {line.product_id ?? "—"}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs">
                        {line.warehouse_id ?? "—"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {line.debit.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {line.credit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-950">
              Expense → GL Test
            </h2>

            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700">
              Migration 095
            </span>
          </div>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Enter a real posted Expense ID. The test validates the mapped
            expense account, VAT treatment, selected financial account,
            dimensions, journal balance and idempotency.
          </p>
        </div>

        <form method="get" className="mt-5 flex flex-col gap-3 md:flex-row">
          <input type="hidden" name="testExpense" value="1" />

          <input
            type="text"
            name="expenseId"
            defaultValue={expenseId}
            placeholder="Expense UUID"
            className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Test Expense GL
          </button>
        </form>

        {expenseTestError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {expenseTestError}
          </div>
        )}

        {expenseTest && (
          <div className="mt-5 space-y-5">
            <div
              className={`rounded-xl border p-4 ${
                expenseTest.checks.allPassed
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div
                className={`font-semibold ${
                  expenseTest.checks.allPassed
                    ? "text-green-900"
                    : "text-red-900"
                }`}
              >
                {expenseTest.checks.allPassed
                  ? "Expense GL posting passed"
                  : "Expense GL posting requires attention"}
              </div>

              <div className="mt-2 text-sm text-slate-700">
                Expense: {expenseTest.expense.expense_number}
                {" · "}
                Journal: {expenseTest.journal.journal_number}
                {" · "}
                Case: {expenseTest.caseType.replaceAll("_", " ")}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReceiptMetric
                label="Net Expense"
                value={expenseTest.expense.net_amount}
                currency={expenseTest.expense.currency_code}
              />

              <ReceiptMetric
                label="VAT"
                value={expenseTest.expense.tax_amount}
                currency={expenseTest.expense.currency_code}
              />

              <ReceiptMetric
                label="Gross Paid"
                value={expenseTest.expense.gross_amount}
                currency={expenseTest.expense.currency_code}
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Journal Lines
                </div>

                <div className="mt-2 text-xl font-bold text-slate-950">
                  {expenseTest.balance.line_count}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <CheckCard
                label="Balanced"
                passed={expenseTest.checks.balanced}
              />

              <CheckCard
                label="Posted Expense"
                passed={expenseTest.checks.postedExpense}
              />

              <CheckCard
                label="Source Link"
                passed={expenseTest.checks.sourceLinkage}
              />

              <CheckCard
                label="Correct Lines"
                passed={expenseTest.checks.correctLineCount}
              />

              <CheckCard
                label="Expense Debit"
                passed={expenseTest.checks.expenseDebit}
              />

              <CheckCard
                label="VAT Recoverable Dr"
                passed={expenseTest.checks.vatRecoverableDebit}
              />

              <CheckCard
                label="VAT Pending Dr"
                passed={expenseTest.checks.vatPendingDebit}
              />

              <CheckCard
                label="Financial Account Cr"
                passed={expenseTest.checks.financialAccountCredit}
              />

              <CheckCard
                label="Expense Category Link"
                passed={expenseTest.checks.expenseCategoryLinkage}
              />

              <CheckCard
                label="Dimensions"
                passed={expenseTest.checks.dimensionsValid}
              />

              <CheckCard
                label="Idempotent"
                passed={expenseTest.checks.idempotent}
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1000px] text-left text-sm">
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
                  {expenseTest.lines.map((line) => (
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
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-950">
              Inventory COGS → GL Test
            </h2>

            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700">
              Migration 094
            </span>
          </div>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Enter a posted sales_issue Inventory Transaction ID linked to a
            Delivery Order. The test validates actual dispatch COGS, Inventory
            credit, product and warehouse dimensions, source-line traceability,
            journal balance and idempotency.
          </p>
        </div>

        <form method="get" className="mt-5 flex flex-col gap-3 md:flex-row">
          <input type="hidden" name="testInventoryCogs" value="1" />

          <input
            type="text"
            name="inventoryTransactionId"
            defaultValue={inventoryTransactionId}
            placeholder="Inventory Transaction UUID"
            className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Test Inventory COGS GL
          </button>
        </form>

        {inventoryCogsTestError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {inventoryCogsTestError}
          </div>
        )}

        {inventoryCogsTest && (
          <div className="mt-5 space-y-5">
            <div
              className={`rounded-xl border p-4 ${
                inventoryCogsTest.checks.allPassed
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div
                className={`font-semibold ${
                  inventoryCogsTest.checks.allPassed
                    ? "text-green-900"
                    : "text-red-900"
                }`}
              >
                {inventoryCogsTest.checks.allPassed
                  ? "Inventory COGS GL posting passed"
                  : "Inventory COGS GL posting requires attention"}
              </div>

              <div className="mt-2 text-sm text-slate-700">
                Transaction: {inventoryCogsTest.transaction.transaction_number}
                {" · "}
                Journal: {inventoryCogsTest.journal.journal_number}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReceiptMetric
                label="Actual COGS"
                value={inventoryCogsTest.expected.totalCost}
                currency="AED"
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Inventory Items
                </div>

                <div className="mt-2 text-xl font-bold text-slate-950">
                  {inventoryCogsTest.expected.itemCount}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Accounting Items
                </div>

                <div className="mt-2 text-xl font-bold text-slate-950">
                  {inventoryCogsTest.expected.accountingItemCount}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Journal Lines
                </div>

                <div className="mt-2 text-xl font-bold text-slate-950">
                  {inventoryCogsTest.balance.line_count}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <CheckCard
                label="Balanced"
                passed={inventoryCogsTest.checks.balanced}
              />

              <CheckCard
                label="Sales Issue"
                passed={inventoryCogsTest.checks.postedSalesIssue}
              />

              <CheckCard
                label="Delivery Source"
                passed={inventoryCogsTest.checks.deliveryOrderSource}
              />

              <CheckCard
                label="Source Link"
                passed={inventoryCogsTest.checks.sourceLinkage}
              />

              <CheckCard
                label="Correct Lines"
                passed={inventoryCogsTest.checks.correctLineCount}
              />

              <CheckCard
                label="COGS Debit"
                passed={inventoryCogsTest.checks.correctTotalCogs}
              />

              <CheckCard
                label="Inventory Credit"
                passed={inventoryCogsTest.checks.correctInventoryCredit}
              />

              <CheckCard
                label="Product Link"
                passed={inventoryCogsTest.checks.productLinkage}
              />

              <CheckCard
                label="Warehouse Link"
                passed={inventoryCogsTest.checks.warehouseLinkage}
              />

              <CheckCard
                label="Source Line Link"
                passed={inventoryCogsTest.checks.sourceLineLinkage}
              />

              <CheckCard
                label="No Unrelated Accounts"
                passed={inventoryCogsTest.checks.noUnrelatedAccounts}
              />

              <CheckCard
                label="Idempotent"
                passed={inventoryCogsTest.checks.idempotent}
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {inventoryCogsTest.lines.map((line) => (
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

                      <td className="px-4 py-3 font-mono text-xs">
                        {line.product_id ?? "—"}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs">
                        {line.warehouse_id ?? "—"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {line.debit.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {line.credit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-950">
              Supplier Advance Application → GL Test
            </h2>

            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700">
              Migration 093
            </span>
          </div>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Enter a Supplier Payment Allocation ID classified as a later
            supplier advance application. This test validates Accounts Payable
            reclassification, Supplier Advances, source linkage, balance,
            idempotency and confirms no Cash/Bank account is posted again.
          </p>
        </div>

        <form method="get" className="mt-5 flex flex-col gap-3 md:flex-row">
          <input type="hidden" name="testSupplierAdvance" value="1" />

          <input
            type="text"
            name="supplierAdvanceAllocationId"
            defaultValue={supplierAdvanceAllocationId}
            placeholder="Supplier Payment Allocation UUID"
            className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Test Supplier Advance GL
          </button>
        </form>

        {supplierAdvanceTestError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {supplierAdvanceTestError}
          </div>
        )}

        {supplierAdvanceTest && (
          <div className="mt-5 space-y-5">
            <div
              className={`rounded-xl border p-4 ${
                supplierAdvanceTest.checks.allPassed
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div
                className={`font-semibold ${
                  supplierAdvanceTest.checks.allPassed
                    ? "text-green-900"
                    : "text-red-900"
                }`}
              >
                {supplierAdvanceTest.checks.allPassed
                  ? "Supplier Advance GL reclassification passed"
                  : "Supplier Advance GL reclassification requires attention"}
              </div>

              <div className="mt-2 text-sm text-slate-700">
                Payment: {supplierAdvanceTest.payment.payment_number}
                {" · "}
                Purchase: {supplierAdvanceTest.purchase.purchase_number}
                {" · "}
                Journal: {supplierAdvanceTest.journal.journal_number}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ReceiptMetric
                label="Applied Advance"
                value={supplierAdvanceTest.allocation.amount}
                currency={supplierAdvanceTest.payment.currency_code}
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Journal Lines
                </div>

                <div className="mt-2 text-xl font-bold text-slate-950">
                  {supplierAdvanceTest.balance.line_count}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Allocation Source
                </div>

                <div className="mt-2 text-sm font-bold text-slate-950">
                  {supplierAdvanceTest.allocation.allocation_source}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <CheckCard
                label="Balanced"
                passed={supplierAdvanceTest.checks.balanced}
              />

              <CheckCard
                label="Source Type"
                passed={supplierAdvanceTest.checks.correctSourceType}
              />

              <CheckCard
                label="Source Link"
                passed={supplierAdvanceTest.checks.sourceLinkage}
              />

              <CheckCard
                label="Correct Lines"
                passed={supplierAdvanceTest.checks.correctLineCount}
              />

              <CheckCard
                label="Accounts Payable Dr"
                passed={supplierAdvanceTest.checks.accountsPayableDebit}
              />

              <CheckCard
                label="Supplier Advance Cr"
                passed={supplierAdvanceTest.checks.supplierAdvanceCredit}
              />

              <CheckCard
                label="No Treasury Line"
                passed={supplierAdvanceTest.checks.noTreasuryLine}
              />

              <CheckCard
                label="Supplier Link"
                passed={supplierAdvanceTest.checks.supplierLinkage}
              />

              <CheckCard
                label="Idempotent"
                passed={supplierAdvanceTest.checks.idempotent}
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
                  {supplierAdvanceTest.lines.map((line) => (
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
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-950">
              Supplier Payment → GL Test
            </h2>

            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700">
              Migration 092
            </span>
          </div>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Enter a real posted Supplier Payment ID. The test validates Accounts
            Payable, Supplier Advances, the selected Financial Account, journal
            balance, supplier linkage and idempotency.
          </p>
        </div>

        <form method="get" className="mt-5 flex flex-col gap-3 md:flex-row">
          <input type="hidden" name="testSupplierPayment" value="1" />

          <input
            type="text"
            name="supplierPaymentId"
            defaultValue={supplierPaymentId}
            placeholder="Supplier Payment UUID"
            className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Test Supplier Payment GL
          </button>
        </form>

        {supplierPaymentTestError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {supplierPaymentTestError}
          </div>
        )}

        {supplierPaymentTest && (
          <div className="mt-5 space-y-5">
            <div
              className={`rounded-xl border p-4 ${
                supplierPaymentTest.checks.allPassed
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div
                className={`font-semibold ${
                  supplierPaymentTest.checks.allPassed
                    ? "text-green-900"
                    : "text-red-900"
                }`}
              >
                {supplierPaymentTest.checks.allPassed
                  ? "Supplier Payment GL posting passed"
                  : "Supplier Payment GL posting requires attention"}
              </div>

              <div className="mt-2 text-sm text-slate-700">
                Payment: {supplierPaymentTest.payment.payment_number}
                {" · "}
                Journal: {supplierPaymentTest.journal.journal_number}
                {" · "}
                Case: {supplierPaymentTest.caseType.replaceAll("_", " ")}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReceiptMetric
                label="Payment"
                value={supplierPaymentTest.payment.amount}
                currency={supplierPaymentTest.payment.currency_code}
              />

              <ReceiptMetric
                label="Allocated"
                value={supplierPaymentTest.payment.allocated_amount}
                currency={supplierPaymentTest.payment.currency_code}
              />

              <ReceiptMetric
                label="Supplier Advance"
                value={supplierPaymentTest.payment.unallocated_amount}
                currency={supplierPaymentTest.payment.currency_code}
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Journal Lines
                </div>

                <div className="mt-2 text-xl font-bold text-slate-950">
                  {supplierPaymentTest.balance.line_count}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <CheckCard
                label="Balanced"
                passed={supplierPaymentTest.checks.balanced}
              />

              <CheckCard
                label="Source Link"
                passed={supplierPaymentTest.checks.sourceLinkage}
              />

              <CheckCard
                label="Correct Lines"
                passed={supplierPaymentTest.checks.correctLineCount}
              />

              <CheckCard
                label="Financial Account Cr"
                passed={supplierPaymentTest.checks.financialAccountCredit}
              />

              <CheckCard
                label="Accounts Payable Dr"
                passed={supplierPaymentTest.checks.accountsPayableDebit}
              />

              <CheckCard
                label="Supplier Advance Dr"
                passed={supplierPaymentTest.checks.supplierAdvanceDebit}
              />

              <CheckCard
                label="Supplier Link"
                passed={supplierPaymentTest.checks.supplierLinkage}
              />

              <CheckCard
                label="Idempotent"
                passed={supplierPaymentTest.checks.idempotent}
              />

              <CheckCard
                label="Posted Payment"
                passed={supplierPaymentTest.checks.postedPayment}
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
                  {supplierPaymentTest.lines.map((line) => (
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
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-950">
              Quick Purchase → GL Test
            </h2>

            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700">
              Migration 091
            </span>
          </div>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Enter a real posted Quick Purchase ID with a registered supplier.
            The test validates Inventory, VAT, Accounts Payable, supplier
            linkage, journal balance and idempotency.
          </p>
        </div>

        <form method="get" className="mt-5 flex flex-col gap-3 md:flex-row">
          <input type="hidden" name="testQuickPurchase" value="1" />

          <input
            type="text"
            name="quickPurchaseId"
            defaultValue={quickPurchaseId}
            placeholder="Quick Purchase UUID"
            className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Test Quick Purchase GL
          </button>
        </form>

        {quickPurchaseTestError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {quickPurchaseTestError}
          </div>
        )}

        {quickPurchaseTest && (
          <div className="mt-5 space-y-5">
            <div
              className={`rounded-xl border p-4 ${
                quickPurchaseTest.checks.allPassed
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div
                className={`font-semibold ${
                  quickPurchaseTest.checks.allPassed
                    ? "text-green-900"
                    : "text-red-900"
                }`}
              >
                {quickPurchaseTest.checks.allPassed
                  ? "Quick Purchase GL posting passed"
                  : "Quick Purchase GL posting requires attention"}
              </div>

              <div className="mt-2 text-sm text-slate-700">
                Purchase: {quickPurchaseTest.purchase.purchase_number}
                {" · "}
                Journal: {quickPurchaseTest.journal.journal_number}
                {" · "}
                Case: {quickPurchaseTest.caseType.replaceAll("_", " ")}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReceiptMetric
                label="Grand Total"
                value={quickPurchaseTest.purchase.grand_total}
                currency={quickPurchaseTest.purchase.currency_code}
              />

              <ReceiptMetric
                label="Recoverable VAT"
                value={quickPurchaseTest.purchase.recoverable_tax_amount}
                currency={quickPurchaseTest.purchase.currency_code}
              />

              <ReceiptMetric
                label="Pending VAT"
                value={quickPurchaseTest.purchase.pending_tax_amount}
                currency={quickPurchaseTest.purchase.currency_code}
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Journal Lines
                </div>

                <div className="mt-2 text-xl font-bold text-slate-950">
                  {quickPurchaseTest.balance.line_count}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <CheckCard
                label="Balanced"
                passed={quickPurchaseTest.checks.balanced}
              />

              <CheckCard
                label="Source Link"
                passed={quickPurchaseTest.checks.sourceLinkage}
              />

              <CheckCard
                label="Correct Lines"
                passed={quickPurchaseTest.checks.correctLineCount}
              />

              <CheckCard
                label="Inventory Dr"
                passed={quickPurchaseTest.checks.inventoryDebit}
              />

              <CheckCard
                label="AP Cr"
                passed={quickPurchaseTest.checks.accountsPayableCredit}
              />

              <CheckCard
                label="VAT Recoverable Dr"
                passed={quickPurchaseTest.checks.recoverableVatDebit}
              />

              <CheckCard
                label="VAT Pending Dr"
                passed={quickPurchaseTest.checks.pendingVatDebit}
              />

              <CheckCard
                label="Supplier Link"
                passed={quickPurchaseTest.checks.supplierLinkage}
              />

              <CheckCard
                label="Idempotent"
                passed={quickPurchaseTest.checks.idempotent}
              />

              <CheckCard
                label="Posted Purchase"
                passed={quickPurchaseTest.checks.postedPurchase}
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
                  {quickPurchaseTest.lines.map((line) => (
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
          </div>
        )}
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
