"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  Calculator,
  HandCoins,
  Loader2,
  RotateCcw,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  toast,
} from "sonner";

import {
  createSupplierPayment,
  loadSupplierOutstandingPurchases,
} from "@/app/admin/(protected)/purchasing/supplier-payments/new/actions";

import type {
  SupplierOutstandingPurchase,
  SupplierPaymentMethod,
  SupplierPaymentSupplierOption,
} from "@/lib/repositories/supplier-payment.repository";

type AllocationMode =
  | "auto"
  | "manual";

interface NewSupplierPaymentFormProps {
  suppliers:
    SupplierPaymentSupplierOption[];
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

export default function NewSupplierPaymentForm({
  suppliers,
}: NewSupplierPaymentFormProps) {
  const router =
    useRouter();

  const [
    isLoadingPurchases,
    startLoadingPurchases,
  ] =
    useTransition();

  const [
    isPosting,
    startPosting,
  ] =
    useTransition();

  const [
    supplierId,
    setSupplierId,
  ] =
    useState("");

  const [
    paymentDate,
    setPaymentDate,
  ] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10),
    );

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<SupplierPaymentMethod>(
      "cash",
    );

  const [
    amount,
    setAmount,
  ] =
    useState(0);

  const [
    referenceNumber,
    setReferenceNumber,
  ] =
    useState("");

  const [
    bankName,
    setBankName,
  ] =
    useState("");

  const [
    chequeNumber,
    setChequeNumber,
  ] =
    useState("");

  const [
    chequeDate,
    setChequeDate,
  ] =
    useState("");

  const [
    notes,
    setNotes,
  ] =
    useState("");

  const [
    allocationMode,
    setAllocationMode,
  ] =
    useState<AllocationMode>(
      "auto",
    );

  const [
    purchases,
    setPurchases,
  ] =
    useState<
      SupplierOutstandingPurchase[]
    >([]);

  const [
    manualAllocations,
    setManualAllocations,
  ] =
    useState<
      Record<string, number>
    >({});


  /* =====================================================
   * Totals
   * ===================================================== */

  const totalOutstanding =
    useMemo(
      () =>
        purchases.reduce(
          (
            total,
            purchase,
          ) =>
            total +
            purchase.balanceDue,
          0,
        ),
      [purchases],
    );


  /* =====================================================
   * Auto Allocation
   * ===================================================== */

  const automaticAllocations =
    useMemo(
      () => {
        let remaining =
          Math.max(
            amount,
            0,
          );

        const result:
          Record<
            string,
            number
          > = {};

        for (
          const purchase of
          purchases
        ) {
          if (
            remaining <= 0
          ) {
            break;
          }

          const allocation =
            Math.min(
              purchase.balanceDue,
              remaining,
            );

          if (
            allocation > 0
          ) {
            result[
              purchase.id
            ] =
              allocation;

            remaining -=
              allocation;
          }
        }

        return result;
      },
      [
        amount,
        purchases,
      ],
    );


  const activeAllocations =
    allocationMode ===
    "auto"
      ? automaticAllocations
      : manualAllocations;


  const allocatedAmount =
    Object.values(
      activeAllocations,
    ).reduce(
      (
        total,
        value,
      ) =>
        total +
        Number(
          value || 0,
        ),
      0,
    );


  const unallocatedAmount =
    Math.max(
      amount -
        allocatedAmount,
      0,
    );


  /* =====================================================
   * Supplier Change
   * ===================================================== */

  function handleSupplierChange(
    nextSupplierId: string,
  ) {
    setSupplierId(
      nextSupplierId,
    );

    setPurchases([]);

    setManualAllocations(
      {},
    );

    if (
      !nextSupplierId
    ) {
      return;
    }

    startLoadingPurchases(
      async () => {
        try {
          const result =
            await loadSupplierOutstandingPurchases(
              nextSupplierId,
            );

          setPurchases(
            result,
          );
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load outstanding purchases.",
          );
        }
      },
    );
  }


  /* =====================================================
   * Manual Allocation
   * ===================================================== */

  function updateManualAllocation(
    purchase:
      SupplierOutstandingPurchase,

    value: number,
  ) {
    const next =
      Math.max(
        Math.min(
          value,
          purchase.balanceDue,
        ),
        0,
      );

    setManualAllocations(
      (current) => ({
        ...current,

        [purchase.id]:
          next,
      }),
    );
  }


  function clearAllocations() {
    setManualAllocations(
      {},
    );
  }


  /* =====================================================
   * Submit
   * ===================================================== */

  function handleSubmit() {
    if (
      !supplierId
    ) {
      toast.error(
        "Please select a supplier.",
      );

      return;
    }

    if (
      amount <= 0
    ) {
      toast.error(
        "Payment amount must be greater than zero.",
      );

      return;
    }

    if (
      allocatedAmount >
      amount + 0.01
    ) {
      toast.error(
        "Allocated amount cannot exceed the payment amount.",
      );

      return;
    }

    if (
      paymentMethod ===
        "cheque" &&
      !chequeNumber.trim()
    ) {
      toast.error(
        "Please enter the cheque number.",
      );

      return;
    }

    const allocations =
      Object.entries(
        activeAllocations,
      )
        .filter(
          (
            [, value],
          ) =>
            value >
            0,
        )
        .map(
          (
            [
              quickPurchaseId,
              allocationAmount,
            ],
          ) => ({
            quickPurchaseId,

            amount:
              Number(
                allocationAmount.toFixed(
                  2,
                ),
              ),
          }),
        );

    startPosting(
      async () => {
        const result =
          await createSupplierPayment(
            {
              supplierId,

              paymentDate,

              paymentMethod,

              amount,

              referenceNumber:
                referenceNumber ||
                undefined,

              bankName:
                bankName ||
                undefined,

              chequeNumber:
                chequeNumber ||
                undefined,

              chequeDate:
                chequeDate ||
                undefined,

              notes:
                notes ||
                undefined,

              allocations,
            },
          );

        if (
          !result.success
        ) {
          toast.error(
            result.message,
          );

          return;
        }

        toast.success(
          result.message,
        );

        router.push(
          "/admin/purchasing/supplier-payments",
        );

        router.refresh();
      },
    );
  }


  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-6">

        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <HandCoins className="size-5" />

            <div>
              <h2 className="font-semibold">
                Payment Details
              </h2>

              <p className="text-sm text-muted-foreground">
                Enter supplier and payment information.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field
              label="Supplier"
              required
            >
              <select
                value={
                  supplierId
                }
                onChange={(
                  event,
                ) =>
                  handleSupplierChange(
                    event.target.value,
                  )
                }
                className={
                  inputClass
                }
              >
                <option value="">
                  Select supplier
                </option>

                {suppliers.map(
                  (
                    supplier,
                  ) => (
                    <option
                      key={
                        supplier.id
                      }
                      value={
                        supplier.id
                      }
                    >
                      {
                        supplier.companyName
                      }

                      {supplier.city
                        ? ` — ${supplier.city}`
                        : ""}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field
              label="Payment Date"
              required
            >
              <input
                type="date"
                value={
                  paymentDate
                }
                onChange={(
                  event,
                ) =>
                  setPaymentDate(
                    event.target.value,
                  )
                }
                className={
                  inputClass
                }
              />
            </Field>

            <Field
              label="Payment Amount"
              required
            >
              <input
                type="number"
                min={0}
                step="0.01"
                value={
                  amount
                }
                onChange={(
                  event,
                ) =>
                  setAmount(
                    Number(
                      event.target.value,
                    ) ||
                      0,
                  )
                }
                className={
                  inputClass
                }
              />
            </Field>

            <Field
              label="Payment Method"
              required
            >
              <select
                value={
                  paymentMethod
                }
                onChange={(
                  event,
                ) =>
                  setPaymentMethod(
                    event.target.value as
                      SupplierPaymentMethod,
                  )
                }
                className={
                  inputClass
                }
              >
                <option value="cash">
                  Cash
                </option>

                <option value="bank">
                  Bank Transfer
                </option>

                <option value="card">
                  Card
                </option>

                <option value="cheque">
                  Cheque
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </Field>

            <Field label="Payment Reference">
              <input
                value={
                  referenceNumber
                }
                onChange={(
                  event,
                ) =>
                  setReferenceNumber(
                    event.target.value,
                  )
                }
                placeholder="Transfer / receipt / reference"
                className={
                  inputClass
                }
              />
            </Field>

            {paymentMethod ===
            "bank" ? (
              <Field label="Bank Name">
                <input
                  value={
                    bankName
                  }
                  onChange={(
                    event,
                  ) =>
                    setBankName(
                      event.target.value,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>
            ) : null}

            {paymentMethod ===
            "cheque" ? (
              <>
                <Field
                  label="Cheque Number"
                  required
                >
                  <input
                    value={
                      chequeNumber
                    }
                    onChange={(
                      event,
                    ) =>
                      setChequeNumber(
                        event.target.value,
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Cheque Date">
                  <input
                    type="date"
                    value={
                      chequeDate
                    }
                    onChange={(
                      event,
                    ) =>
                      setChequeDate(
                        event.target.value,
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>
              </>
            ) : null}
          </div>

          <div className="mt-4">
            <Field label="Notes">
              <textarea
                value={
                  notes
                }
                onChange={(
                  event,
                ) =>
                  setNotes(
                    event.target.value,
                  )
                }
                rows={3}
                className={`${inputClass} h-auto py-3`}
              />
            </Field>
          </div>
        </section>


        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">
                Outstanding Quick Purchases
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Allocate this payment against supplier purchases.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setAllocationMode(
                    "auto",
                  )
                }
                className={
                  allocationMode ===
                  "auto"
                    ? activeButton
                    : inactiveButton
                }
              >
                Auto Allocate
              </button>

              <button
                type="button"
                onClick={() =>
                  setAllocationMode(
                    "manual",
                  )
                }
                className={
                  allocationMode ===
                  "manual"
                    ? activeButton
                    : inactiveButton
                }
              >
                Manual
              </button>
            </div>
          </div>

          {isLoadingPurchases ? (
            <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />

              Loading outstanding purchases...
            </div>
          ) : !supplierId ? (
            <div className="px-6 py-14 text-center text-sm text-muted-foreground">
              Select a supplier to view outstanding Quick Purchases.
            </div>
          ) : purchases.length ===
            0 ? (
              <div className="px-6 py-14 text-center">
                <p className="font-medium">
                  No outstanding Quick Purchases.
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Any unallocated amount will remain as supplier advance.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">
                        Purchase
                      </th>

                      <th className="px-4 py-3">
                        Invoice
                      </th>

                      <th className="px-4 py-3">
                        Date
                      </th>

                      <th className="px-4 py-3 text-right">
                        Total
                      </th>

                      <th className="px-4 py-3 text-right">
                        Paid
                      </th>

                      <th className="px-4 py-3 text-right">
                        Outstanding
                      </th>

                      <th className="px-4 py-3 text-right">
                        Allocate
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {purchases.map(
                      (
                        purchase,
                      ) => {
                        const allocation =
                          activeAllocations[
                            purchase.id
                          ] ??
                          0;

                        return (
                          <tr
                            key={
                              purchase.id
                            }
                          >
                            <td className="px-4 py-4 font-semibold">
                              {
                                purchase.purchaseNumber
                              }
                            </td>

                            <td className="px-4 py-4 text-muted-foreground">
                              {
                                purchase.supplierInvoiceNumber ??
                                "—"
                              }
                            </td>

                            <td className="px-4 py-4 text-muted-foreground">
                              {
                                purchase.purchaseDate
                              }
                            </td>

                            <td className="px-4 py-4 text-right">
                              AED{" "}
                              {money(
                                purchase.grandTotal,
                              )}
                            </td>

                            <td className="px-4 py-4 text-right">
                              AED{" "}
                              {money(
                                purchase.paidAmount,
                              )}
                            </td>

                            <td className="px-4 py-4 text-right font-semibold text-amber-700">
                              AED{" "}
                              {money(
                                purchase.balanceDue,
                              )}
                            </td>

                            <td className="px-4 py-4 text-right">
                              {allocationMode ===
                              "manual" ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={
                                    purchase.balanceDue
                                  }
                                  step="0.01"
                                  value={
                                    allocation
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateManualAllocation(
                                      purchase,
                                      Number(
                                        event
                                          .target
                                          .value,
                                      ) ||
                                        0,
                                    )
                                  }
                                  className="h-9 w-28 rounded-md border bg-background px-2 text-right"
                                />
                              ) : (
                                <span className="font-semibold text-emerald-700">
                                  AED{" "}
                                  {money(
                                    allocation,
                                  )}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}

          {allocationMode ===
          "manual" ? (
            <div className="border-t p-4">
              <button
                type="button"
                onClick={
                  clearAllocations
                }
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-4" />

                Clear allocations
              </button>
            </div>
          ) : null}
        </section>
      </div>


      <aside className="h-fit rounded-xl bg-slate-950 p-6 text-white xl:sticky xl:top-24">
        <div className="flex items-center gap-3">
          <Calculator className="size-5 text-amber-400" />

          <h2 className="font-semibold">
            Payment Summary
          </h2>
        </div>

        <div className="mt-6 space-y-4 text-sm">
          <SummaryRow
            label="Supplier Outstanding"
            value={
              totalOutstanding
            }
          />

          <div className="border-t border-slate-700 pt-4">
            <SummaryRow
              label="Payment Amount"
              value={
                amount
              }
              strong
            />
          </div>

          <SummaryRow
            label="Allocated"
            value={
              allocatedAmount
            }
          />

          <SummaryRow
            label="Supplier Advance"
            value={
              unallocatedAmount
            }
            strong={
              unallocatedAmount >
              0
            }
          />
        </div>

        {unallocatedAmount >
        0 ? (
          <div className="mt-5 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-200">
            AED{" "}
            {money(
              unallocatedAmount,
            )}{" "}
            will remain as unallocated supplier advance.
          </div>
        ) : null}

        <button
          type="button"
          disabled={
            isPosting
          }
          onClick={
            handleSubmit
          }
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPosting ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <HandCoins className="size-5" />
          )}

          {isPosting
            ? "Posting Payment..."
            : "Post Supplier Payment"}
        </button>
      </aside>
    </div>
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
    <label className="block space-y-2">
      <span className="text-sm font-medium">
        {label}

        {required ? (
          <span className="ml-1 text-red-500">
            *
          </span>
        ) : null}
      </span>

      {children}
    </label>
  );
}


function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-300">
        {label}
      </span>

      <span
        className={
          strong
            ? "font-bold"
            : ""
        }
      >
        AED{" "}
        {money(
          value,
        )}
      </span>
    </div>
  );
}


const inputClass =
  "h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const activeButton =
  "rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white";

const inactiveButton =
  "rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted";