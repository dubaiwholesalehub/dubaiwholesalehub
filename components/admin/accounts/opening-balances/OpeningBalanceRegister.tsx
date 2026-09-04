import type {
    CustomerOpeningBalanceRegisterRow,
    SupplierOpeningBalanceRegisterRow,
} from "@/lib/repositories/opening-balance.repository";

interface OpeningBalanceRegisterProps {
    customers:
        CustomerOpeningBalanceRegisterRow[];

    suppliers:
        SupplierOpeningBalanceRegisterRow[];

    customerCancelAction:
        (formData: FormData) =>
            Promise<void>;

    supplierCancelAction:
        (formData: FormData) =>
            Promise<void>;
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

export default function OpeningBalanceRegister({
    customers,
    suppliers,
    customerCancelAction,
    supplierCancelAction,
}: OpeningBalanceRegisterProps) {
    const customerTotal =
        customers
            .filter(
                (row) =>
                    row.status !==
                    "cancelled",
            )
            .reduce(
                (total, row) =>
                    total +
                    row.outstandingAmount,
                0,
            );

    const supplierTotal =
        suppliers
            .filter(
                (row) =>
                    row.status !==
                    "cancelled",
            )
            .reduce(
                (total, row) =>
                    total +
                    row.outstandingAmount,
                0,
            );

    return (
        <section className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold">
                    Opening Balance Register
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                    Audit history of customer
                    receivables and supplier
                    payables entered at ERP
                    go-live.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Metric
                    label="Customer Opening Receivables"
                    value={customerTotal}
                />

                <Metric
                    label="Supplier Opening Payables"
                    value={supplierTotal}
                />
            </div>

            <RegisterSection
                title="Customer Receivables"
                emptyText="No customer opening receivables have been posted."
            >
                {customers.length > 0 ? (
                    <CustomerTable
                        rows={customers}
                        cancelAction={
                            customerCancelAction
                        }
                    />
                ) : null}
            </RegisterSection>

            <RegisterSection
                title="Supplier Payables"
                emptyText="No supplier opening payables have been posted."
            >
                {suppliers.length > 0 ? (
                    <SupplierTable
                        rows={suppliers}
                        cancelAction={
                            supplierCancelAction
                        }
                    />
                ) : null}
            </RegisterSection>
        </section>
    );
}

function CustomerTable({
    rows,
    cancelAction,
}: {
    rows:
        CustomerOpeningBalanceRegisterRow[];

    cancelAction:
        (formData: FormData) =>
            Promise<void>;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
                <TableHead
                    party="Customer"
                />

                <tbody className="divide-y">
                    {rows.map(
                        (row) => (
                            <tr
                                key={
                                    row.id
                                }
                                className={
                                    row.status ===
                                    "cancelled"
                                        ? "opacity-50"
                                        : ""
                                }
                            >
                                <td className="px-4 py-4">
                                    <p className="font-semibold">
                                        {
                                            row.customerName
                                        }
                                    </p>

                                    {row.customerNumber ? (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {
                                                row.customerNumber
                                            }
                                        </p>
                                    ) : null}
                                </td>

                                <CommonCells
                                    row={
                                        row
                                    }
                                />

                                <td className="px-4 py-4">
                                    <CancelControl
                                        row={
                                            row
                                        }
                                        action={
                                            cancelAction
                                        }
                                    />
                                </td>
                            </tr>
                        ),
                    )}
                </tbody>
            </table>
        </div>
    );
}

function SupplierTable({
    rows,
    cancelAction,
}: {
    rows:
        SupplierOpeningBalanceRegisterRow[];

    cancelAction:
        (formData: FormData) =>
            Promise<void>;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
                <TableHead
                    party="Supplier"
                />

                <tbody className="divide-y">
                    {rows.map(
                        (row) => (
                            <tr
                                key={
                                    row.id
                                }
                                className={
                                    row.status ===
                                    "cancelled"
                                        ? "opacity-50"
                                        : ""
                                }
                            >
                                <td className="px-4 py-4 font-semibold">
                                    {
                                        row.supplierName
                                    }
                                </td>

                                <CommonCells
                                    row={
                                        row
                                    }
                                />

                                <td className="px-4 py-4">
                                    <CancelControl
                                        row={
                                            row
                                        }
                                        action={
                                            cancelAction
                                        }
                                    />
                                </td>
                            </tr>
                        ),
                    )}
                </tbody>
            </table>
        </div>
    );
}

function TableHead({
    party,
}: {
    party: string;
}) {
    return (
        <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
                <th className="px-4 py-3">
                    {party}
                </th>

                <th className="px-4 py-3">
                    Reference
                </th>

                <th className="px-4 py-3">
                    Opening Date
                </th>

                <th className="px-4 py-3">
                    Due Date
                </th>

                <th className="px-4 py-3 text-right">
                    Original
                </th>

                <th className="px-4 py-3 text-right">
                    Outstanding
                </th>

                <th className="px-4 py-3">
                    Status
                </th>

                <th className="px-4 py-3">
                    Action
                </th>
            </tr>
        </thead>
    );
}

function CommonCells({
    row,
}: {
    row:
        | CustomerOpeningBalanceRegisterRow
        | SupplierOpeningBalanceRegisterRow;
}) {
    return (
        <>
            <td className="px-4 py-4">
                {row.referenceNumber ??
                    "—"}
            </td>

            <td className="px-4 py-4">
                {row.openingDate}
            </td>

            <td className="px-4 py-4">
                {row.dueDate ??
                    "—"}
            </td>

            <td className="px-4 py-4 text-right font-semibold">
                {row.currencyCode}{" "}
                {money(
                    row.originalAmount,
                )}
            </td>

            <td className="px-4 py-4 text-right font-semibold">
                {row.currencyCode}{" "}
                {money(
                    row.outstandingAmount,
                )}
            </td>

            <td className="px-4 py-4">
                <StatusBadge
                    status={
                        row.status
                    }
                />

                {row.status ===
                    "cancelled" &&
                row.cancellationReason ? (
                    <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                        {
                            row.cancellationReason
                        }
                    </p>
                ) : null}
            </td>
        </>
    );
}

function CancelControl({
    row,
    action,
}: {
    row:
        | CustomerOpeningBalanceRegisterRow
        | SupplierOpeningBalanceRegisterRow;

    action:
        (formData: FormData) =>
            Promise<void>;
}) {
    if (
        row.status ===
        "cancelled"
    ) {
        return (
            <span className="text-xs text-muted-foreground">
                Cancelled
            </span>
        );
    }

    if (
        row.outstandingAmount !==
        row.originalAmount
    ) {
        return (
            <span className="text-xs text-muted-foreground">
                Has allocations
            </span>
        );
    }

    return (
        <form
            action={action}
            className="flex min-w-[280px] gap-2"
        >
            <input
                type="hidden"
                name="openingBalanceId"
                value={row.id}
            />

            <input
                name="reason"
                required
                placeholder="Cancellation reason"
                className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-xs"
            />

            <button
                type="submit"
                className="h-9 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
                Cancel
            </button>
        </form>
    );
}

function StatusBadge({
    status,
}: {
    status:
        | "posted"
        | "settled"
        | "cancelled";
}) {
    const className =
        status === "posted"
            ? "bg-blue-50 text-blue-700"
            : status ===
                "settled"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700";

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}
        >
            {status}
        </span>
    );
}

function RegisterSection({
    title,
    emptyText,
    children,
}: {
    title: string;
    emptyText: string;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border bg-card">
            <div className="border-b px-5 py-4">
                <h3 className="font-semibold">
                    {title}
                </h3>
            </div>

            {children ?? (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                    {emptyText}
                </div>
            )}
        </section>
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
                AED {money(value)}
            </p>
        </div>
    );
}