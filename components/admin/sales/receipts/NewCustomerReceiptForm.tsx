"use client";

import {
    useMemo,
    useState,
    useTransition,
} from "react";

import {
    Calculator,
    CircleDollarSign,
    Loader2,
    ReceiptText,
    RotateCcw,
} from "lucide-react";

import {
    useRouter,
} from "next/navigation";

import {
    toast,
} from "sonner";

import {
    createCustomerReceipt,
    loadCustomerOutstandingOrders,
} from "@/app/admin/(protected)/sales/receipts/new/actions";

import type {
    CustomerOutstandingOrder,
    CustomerReceiptPaymentMethod,
} from "@/lib/repositories/customer-receipt.repository";

type CustomerOption = {
    id: string;
    customerNumber: string | null;
    displayName: string;
    companyName: string | null;
};

type AllocationMode =
    | "auto"
    | "manual";

interface NewCustomerReceiptFormProps {
    customers:
        CustomerOption[];
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

export default function NewCustomerReceiptForm({
    customers,
}: NewCustomerReceiptFormProps) {
    const router =
        useRouter();

    const [
        isLoadingOrders,
        startLoadingOrders,
    ] =
        useTransition();

    const [
        isPosting,
        startPosting,
    ] =
        useTransition();

    const [
        customerId,
        setCustomerId,
    ] =
        useState("");

    const [
        receiptDate,
        setReceiptDate,
    ] =
        useState(
            new Date()
                .toISOString()
                .slice(
                    0,
                    10,
                ),
        );

    const [
        paymentMethod,
        setPaymentMethod,
    ] =
        useState<CustomerReceiptPaymentMethod>(
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
        orders,
        setOrders,
    ] =
        useState<
            CustomerOutstandingOrder[]
        >([]);

    const [
        manualAllocations,
        setManualAllocations,
    ] =
        useState<
            Record<
                string,
                number
            >
        >({});


    /* =====================================================
     * Outstanding Summary
     * ===================================================== */

    const totalOutstanding =
        useMemo(
            () =>
                orders.reduce(
                    (
                        total,
                        order,
                    ) =>
                        total +
                        order.balanceDue,
                    0,
                ),
            [orders],
        );


    /* =====================================================
     * Automatic Allocation
     *
     * Orders are already returned oldest first.
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
                    const order of
                    orders
                ) {
                    if (
                        remaining <=
                        0
                    ) {
                        break;
                    }

                    const allocation =
                        Math.min(
                            order.balanceDue,
                            remaining,
                        );

                    if (
                        allocation >
                        0
                    ) {
                        result[
                            order.id
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
                orders,
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
     * Customer
     * ===================================================== */

    function handleCustomerChange(
        nextCustomerId: string,
    ) {
        setCustomerId(
            nextCustomerId,
        );

        setOrders([]);

        setManualAllocations(
            {},
        );

        if (
            !nextCustomerId
        ) {
            return;
        }

        startLoadingOrders(
            async () => {
                try {
                    const result =
                        await loadCustomerOutstandingOrders(
                            nextCustomerId,
                        );

                    setOrders(
                        result,
                    );
                } catch (error) {
                    toast.error(
                        error instanceof Error
                            ? error.message
                            : "Unable to load outstanding invoices.",
                    );
                }
            },
        );
    }


    /* =====================================================
     * Manual Allocation
     * ===================================================== */

    function updateManualAllocation(
        order:
            CustomerOutstandingOrder,

        value: number,
    ) {
        const next =
            Math.max(
                Math.min(
                    value,
                    order.balanceDue,
                ),
                0,
            );

        setManualAllocations(
            (current) => ({
                ...current,

                [order.id]:
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
        if (!customerId) {
            toast.error(
                "Please select a customer.",
            );

            return;
        }

        if (
            amount <= 0
        ) {
            toast.error(
                "Receipt amount must be greater than zero.",
            );

            return;
        }

        if (
            allocatedAmount >
            amount + 0.01
        ) {
            toast.error(
                "Allocated amount cannot exceed receipt amount.",
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
                            salesOrderId,
                            allocationAmount,
                        ],
                    ) => ({
                        salesOrderId,

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
                    await createCustomerReceipt({
                        customerId,

                        receiptDate,

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
                    });

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
                    "/admin/sales/receipts",
                );

                router.refresh();
            },
        );
    }


    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div className="space-y-6">
                {/* Receipt Header */}

                <section className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-3">
                        <ReceiptText className="size-5" />

                        <div>
                            <h2 className="font-semibold">
                                Receipt Details
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Enter the customer and payment information.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <Field
                            label="Customer"
                            required
                        >
                            <select
                                value={
                                    customerId
                                }
                                onChange={(
                                    event,
                                ) =>
                                    handleCustomerChange(
                                        event.target.value,
                                    )
                                }
                                className={
                                    inputClass
                                }
                            >
                                <option value="">
                                    Select customer
                                </option>

                                {customers.map(
                                    (
                                        customer,
                                    ) => (
                                        <option
                                            key={
                                                customer.id
                                            }
                                            value={
                                                customer.id
                                            }
                                        >
                                            {
                                                customer.displayName
                                            }

                                            {customer.customerNumber
                                                ? ` — ${customer.customerNumber}`
                                                : ""}
                                        </option>
                                    ),
                                )}
                            </select>
                        </Field>

                        <Field
                            label="Receipt Date"
                            required
                        >
                            <input
                                type="date"
                                value={
                                    receiptDate
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setReceiptDate(
                                        event.target.value,
                                    )
                                }
                                className={
                                    inputClass
                                }
                            />
                        </Field>

                        <Field
                            label="Receipt Amount"
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
                                            CustomerReceiptPaymentMethod,
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
                                placeholder="Transfer / POS / receipt reference"
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


                {/* Allocations */}

                <section className="overflow-hidden rounded-xl border bg-card">
                    <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-semibold">
                                Outstanding Sales Orders
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Allocate this payment against customer invoices.
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

                    {isLoadingOrders ? (
                        <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />

                            Loading outstanding invoices...
                        </div>
                    ) : !customerId ? (
                        <div className="px-6 py-14 text-center text-sm text-muted-foreground">
                            Select a customer to view their outstanding Sales Orders.
                        </div>
                    ) : orders.length ===
                      0 ? (
                        <div className="px-6 py-14 text-center">
                            <p className="font-medium">
                                No outstanding Sales Orders.
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Any unallocated receipt amount will remain available as customer credit.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3">
                                            Order
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
                                    {orders.map(
                                        (
                                            order,
                                        ) => {
                                            const allocation =
                                                activeAllocations[
                                                    order.id
                                                ] ??
                                                0;

                                            return (
                                                <tr
                                                    key={
                                                        order.id
                                                    }
                                                >
                                                    <td className="px-4 py-4 font-semibold">
                                                        {
                                                            order.orderNumber
                                                        }
                                                    </td>

                                                    <td className="px-4 py-4 text-muted-foreground">
                                                        {
                                                            order.orderDate
                                                        }
                                                    </td>

                                                    <td className="px-4 py-4 text-right">
                                                        AED{" "}
                                                        {money(
                                                            order.grandTotal,
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-4 text-right">
                                                        AED{" "}
                                                        {money(
                                                            order.paidAmount,
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-4 text-right font-semibold text-amber-700">
                                                        AED{" "}
                                                        {money(
                                                            order.balanceDue,
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-4 text-right">
                                                        {allocationMode ===
                                                        "manual" ? (
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={
                                                                    order.balanceDue
                                                                }
                                                                step="0.01"
                                                                value={
                                                                    allocation
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateManualAllocation(
                                                                        order,
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


            {/* Summary */}

            <aside className="h-fit rounded-xl bg-slate-950 p-6 text-white xl:sticky xl:top-24">
                <div className="flex items-center gap-3">
                    <Calculator className="size-5 text-amber-400" />

                    <h2 className="font-semibold">
                        Receipt Summary
                    </h2>
                </div>

                <div className="mt-6 space-y-4 text-sm">
                    <SummaryRow
                        label="Customer Outstanding"
                        value={
                            totalOutstanding
                        }
                    />

                    <div className="border-t border-slate-700 pt-4">
                        <SummaryRow
                            label="Receipt Amount"
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
                        label="Unallocated Credit"
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
                        will remain as unallocated customer credit.
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
                        <CircleDollarSign className="size-5" />
                    )}

                    {isPosting
                        ? "Posting Receipt..."
                        : "Post Receipt"}
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