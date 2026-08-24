"use client";

import { useMemo, useState, useTransition } from "react";

import {
  ArrowDownToLine,
  ArrowRight,
  BadgeDollarSign,
  Loader2,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import {
  applySupplierReturnCreditAction,
  refundSupplierReturnCreditAction,
} from "@/app/admin/(protected)/purchasing/returns/[id]/actions";

import type {
  SupplierReturnCreditApplication,
  SupplierReturnCreditEligiblePurchase,
  SupplierReturnCreditRefund,
  SupplierReturnCreditSummary,
} from "@/lib/repositories/supplier-return.repository";

interface SupplierReturnCreditPanelProps {
  credit: SupplierReturnCreditSummary;

  eligiblePurchases: SupplierReturnCreditEligiblePurchase[];

  applications: SupplierReturnCreditApplication[];

  refunds: SupplierReturnCreditRefund[];

  financialAccounts: SupplierReturnRefundFinancialAccount[];
}

type SupplierReturnRefundFinancialAccount = {
  id: string;
  accountName: string;
  accountCode: string;
  accountType: string;
  currencyCode: string;
  currentBalance: number;
};

function money(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SupplierReturnCreditPanel({
  credit,
  eligiblePurchases,
  applications,
  refunds,
  financialAccounts,
}: SupplierReturnCreditPanelProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [quickPurchaseId, setQuickPurchaseId] = useState("");

  const [amount, setAmount] = useState("");

  const [applicationDate, setApplicationDate] = useState(today());

  const [postingDate, setPostingDate] = useState(today());

  const [notes, setNotes] = useState("");

  const [refundFinancialAccountId, setRefundFinancialAccountId] = useState("");

  const [refundAmount, setRefundAmount] = useState("");

  const [refundDate, setRefundDate] = useState(today());

  const [refundPostingDate, setRefundPostingDate] = useState(today());

  const [refundReferenceNumber, setRefundReferenceNumber] = useState("");

  const [refundNotes, setRefundNotes] = useState("");

  const selectedPurchase = useMemo(
    () =>
      eligiblePurchases.find((purchase) => purchase.id === quickPurchaseId) ??
      null,
    [eligiblePurchases, quickPurchaseId],
  );

  const maximumApplicable = selectedPurchase
    ? Math.min(credit.supplierCreditAvailable, selectedPurchase.balanceDue)
    : credit.supplierCreditAvailable;

  function handleApply() {
    if (!quickPurchaseId) {
      toast.error("Select a Quick Purchase.");

      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a valid credit amount.");

      return;
    }

    if (numericAmount > credit.supplierCreditAvailable) {
      toast.error(
        `Amount cannot exceed available credit of ${credit.currencyCode} ${money(
          credit.supplierCreditAvailable,
        )}.`,
      );

      return;
    }

    if (selectedPurchase && numericAmount > selectedPurchase.balanceDue) {
      toast.error(
        `Amount cannot exceed purchase balance of ${credit.currencyCode} ${money(
          selectedPurchase.balanceDue,
        )}.`,
      );

      return;
    }

    if (!applicationDate || !postingDate) {
      toast.error("Application and posting dates are required.");

      return;
    }

    startTransition(async () => {
      try {
        await applySupplierReturnCreditAction(
          credit.supplierReturnId,
          quickPurchaseId,
          numericAmount,
          applicationDate,
          postingDate,
          notes.trim() || null,
        );

        toast.success("Supplier credit applied successfully.");

        setQuickPurchaseId("");

        setAmount("");

        setNotes("");

        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to apply Supplier Return credit.",
        );
      }
    });
  }

  function handleRefund() {
    if (!refundFinancialAccountId) {
      toast.error("Select a financial account.");

      return;
    }

    const numericAmount = Number(refundAmount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a valid refund amount.");

      return;
    }

    if (numericAmount > credit.supplierCreditAvailable) {
      toast.error(
        `Refund cannot exceed available credit of ${credit.currencyCode} ${money(
          credit.supplierCreditAvailable,
        )}.`,
      );

      return;
    }

    if (!refundDate || !refundPostingDate) {
      toast.error("Refund and posting dates are required.");

      return;
    }

    startTransition(async () => {
      try {
        await refundSupplierReturnCreditAction(
          credit.supplierReturnId,
          refundFinancialAccountId,
          numericAmount,
          refundDate,
          refundPostingDate,
          refundReferenceNumber.trim() || null,
          refundNotes.trim() || null,
        );

        toast.success("Supplier refund received successfully.");

        setRefundFinancialAccountId("");

        setRefundAmount("");

        setRefundReferenceNumber("");

        setRefundNotes("");

        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to receive Supplier Return refund.",
        );
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <BadgeDollarSign className="size-4" />
          </div>

          <div>
            <h2 className="font-semibold">Supplier Credit</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Credit generated by this Supplier Return can be applied against
              later outstanding purchases from the same supplier.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b p-5 md:grid-cols-2 xl:grid-cols-4">
        <CreditValue
          label="Credit Generated"
          value={`${credit.currencyCode} ${money(credit.supplierCreditAmount)}`}
        />

        <CreditValue
          label="Credit Applied"
          value={`${credit.currencyCode} ${money(
            credit.supplierCreditAppliedAmount,
          )}`}
        />

        <CreditValue
          label="Credit Refunded"
          value={`${credit.currencyCode} ${money(
            credit.supplierCreditRefundedAmount,
          )}`}
        />

        <CreditValue
          label="Credit Available"
          value={`${credit.currencyCode} ${money(
            credit.supplierCreditAvailable,
          )}`}
          emphasized
        />
      </div>

      {credit.supplierCreditAvailable > 0 ? (
        <div className="border-b p-5">
          <h3 className="font-semibold">Apply Credit</h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Apply available supplier credit against an outstanding Quick
            Purchase.
          </p>

          {eligiblePurchases.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              No eligible outstanding Quick Purchases are currently available
              for this supplier and currency.
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Quick Purchase</span>

                <select
                  value={quickPurchaseId}
                  onChange={(event) => {
                    const id = event.target.value;

                    setQuickPurchaseId(id);

                    const purchase = eligiblePurchases.find(
                      (item) => item.id === id,
                    );

                    if (purchase) {
                      setAmount(
                        String(
                          Math.min(
                            credit.supplierCreditAvailable,
                            purchase.balanceDue,
                          ),
                        ),
                      );
                    } else {
                      setAmount("");
                    }
                  }}
                  disabled={isPending}
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">
                    Select an outstanding Quick Purchase...
                  </option>

                  {eligiblePurchases.map((purchase) => (
                    <option key={purchase.id} value={purchase.id}>
                      {purchase.purchaseNumber}
                      {" — Balance "}
                      {purchase.currencyCode} {money(purchase.balanceDue)}
                    </option>
                  ))}
                </select>
              </label>

              {selectedPurchase ? (
                <div className="grid gap-3 rounded-lg bg-muted/40 p-4 sm:grid-cols-4">
                  <MiniValue
                    label="Purchase"
                    value={selectedPurchase.purchaseNumber}
                  />

                  <MiniValue
                    label="Purchase Total"
                    value={`${selectedPurchase.currencyCode} ${money(
                      selectedPurchase.grandTotal,
                    )}`}
                  />

                  <MiniValue
                    label="Paid Amount"
                    value={`${selectedPurchase.currencyCode} ${money(
                      selectedPurchase.paidAmount,
                    )}`}
                  />

                  <MiniValue
                    label="Outstanding"
                    value={`${selectedPurchase.currencyCode} ${money(
                      selectedPurchase.balanceDue,
                    )}`}
                  />
                </div>
              ) : null}

              <div className="grid gap-5 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Amount</span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={maximumApplicable}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    disabled={isPending || !quickPurchaseId}
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  />

                  <p className="text-xs text-muted-foreground">
                    Maximum: {credit.currencyCode} {money(maximumApplicable)}
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Application Date</span>

                  <input
                    type="date"
                    value={applicationDate}
                    onChange={(event) => setApplicationDate(event.target.value)}
                    disabled={isPending}
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Posting Date</span>

                  <input
                    type="date"
                    value={postingDate}
                    onChange={(event) => setPostingDate(event.target.value)}
                    disabled={isPending}
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Notes</span>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={isPending}
                  rows={3}
                  placeholder="Optional internal notes"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isPending || !quickPurchaseId || !amount}
                  onClick={handleApply}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                  Apply Supplier Credit
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border-b p-5 text-sm text-muted-foreground">
          This Supplier Return credit has been fully applied.
        </div>
      )}

      {credit.supplierCreditAvailable > 0 ? (
        <div className="border-b p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <ArrowDownToLine className="size-4" />
            </div>

            <div>
              <h3 className="font-semibold">Receive Supplier Refund</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Record money received back from the supplier against this
                Supplier Return credit.
              </p>
            </div>
          </div>

          {financialAccounts.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              No active financial account is available in {credit.currencyCode}.
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Financial Account</span>

                <select
                  value={refundFinancialAccountId}
                  onChange={(event) =>
                    setRefundFinancialAccountId(event.target.value)
                  }
                  disabled={isPending}
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Select Cash / Bank account...</option>

                  {financialAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountName}
                      {" — "}
                      {account.currencyCode} {money(account.currentBalance)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Refund Amount</span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={credit.supplierCreditAvailable}
                    value={refundAmount}
                    onChange={(event) => setRefundAmount(event.target.value)}
                    disabled={isPending}
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  />

                  <p className="text-xs text-muted-foreground">
                    Maximum: {credit.currencyCode}{" "}
                    {money(credit.supplierCreditAvailable)}
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Refund Date</span>

                  <input
                    type="date"
                    value={refundDate}
                    onChange={(event) => setRefundDate(event.target.value)}
                    disabled={isPending}
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Posting Date</span>

                  <input
                    type="date"
                    value={refundPostingDate}
                    onChange={(event) =>
                      setRefundPostingDate(event.target.value)
                    }
                    disabled={isPending}
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Reference Number</span>

                <input
                  type="text"
                  value={refundReferenceNumber}
                  onChange={(event) =>
                    setRefundReferenceNumber(event.target.value)
                  }
                  disabled={isPending}
                  placeholder="Bank transfer, cheque, supplier reference..."
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Notes</span>

                <textarea
                  value={refundNotes}
                  onChange={(event) => setRefundNotes(event.target.value)}
                  disabled={isPending}
                  rows={3}
                  placeholder="Optional refund notes"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={
                    isPending || !refundFinancialAccountId || !refundAmount
                  }
                  onClick={handleRefund}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="size-4" />
                  )}
                  Receive Supplier Refund
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div>
        <div className="border-b px-5 py-4">
          <h3 className="font-semibold">Application History</h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Immutable history of Supplier Return credit applied to later Quick
            Purchases.
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No credit applications have been recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>

                  <th className="px-4 py-3">Quick Purchase</th>

                  <th className="px-4 py-3 text-right">Amount</th>

                  <th className="px-4 py-3">GL Journal</th>

                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td className="px-4 py-4">{application.applicationDate}</td>

                    <td className="px-4 py-4 font-medium">
                      {application.purchaseNumber}
                    </td>

                    <td className="px-4 py-4 text-right font-semibold">
                      {application.currencyCode} {money(application.amount)}
                    </td>

                    <td className="px-4 py-4 font-mono text-xs">
                      {application.journalNumber ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-muted-foreground">
                      {application.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="border-t border-b px-5 py-4">
          <h3 className="font-semibold">Refund History</h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Immutable history of Supplier Return credit refunded into Cash or
            Bank accounts.
          </p>
        </div>

        {refunds.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No supplier refunds have been recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Refund</th>

                  <th className="px-4 py-3">Date</th>

                  <th className="px-4 py-3">Financial Account</th>

                  <th className="px-4 py-3 text-right">Amount</th>

                  <th className="px-4 py-3">Reference</th>

                  <th className="px-4 py-3">Account Transaction</th>

                  <th className="px-4 py-3">GL Journal</th>

                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td className="px-4 py-4 font-medium">
                      {refund.refundNumber}
                    </td>

                    <td className="px-4 py-4">{refund.refundDate}</td>

                    <td className="px-4 py-4">{refund.financialAccountName}</td>

                    <td className="px-4 py-4 text-right font-semibold">
                      {refund.currencyCode} {money(refund.amount)}
                    </td>

                    <td className="px-4 py-4 text-muted-foreground">
                      {refund.referenceNumber ?? "—"}
                    </td>

                    <td className="px-4 py-4 font-mono text-xs">
                      {refund.accountTransactionNumber ?? "—"}
                    </td>

                    <td className="px-4 py-4 font-mono text-xs">
                      {refund.journalNumber ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-muted-foreground">
                      {refund.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function CreditValue({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>

      <p
        className={[
          "mt-2 text-xl font-semibold",
          emphasized ? "text-emerald-700" : "",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>

      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
