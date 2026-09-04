"use client";

import {
    Building2,
    ReceiptText,
} from "lucide-react";

type CustomerOption = {
    id: string;
    customer_number: string;
    display_name: string;
    company_name: string | null;
};

type SupplierOption = {
    id: string;
    company_name: string;
};

interface OpeningBalanceFormsProps {
    customers: CustomerOption[];
    suppliers: SupplierOption[];

    customerAction:
        (formData: FormData) =>
            Promise<void>;

    supplierAction:
        (formData: FormData) =>
            Promise<void>;
}

const OPENING_DATE =
    "2026-09-01";

export default function OpeningBalanceForms({
    customers,
    suppliers,
    customerAction,
    supplierAction,
}: OpeningBalanceFormsProps) {
    return (
        <div className="grid gap-6 xl:grid-cols-2">
            <OpeningCard
                icon={
                    <ReceiptText className="size-5" />
                }
                title="Customer Receivables"
                description="Amounts customers already owed the business before ERP go-live."
            >
                <form
                    action={customerAction}
                    className="grid gap-4"
                >
                    <Field label="Customer">
                        <select
                            name="customerId"
                            required
                            defaultValue=""
                            className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
                        >
                            <option
                                value=""
                                disabled
                            >
                                Select customer
                            </option>

                            {customers.map(
                                (customer) => (
                                    <option
                                        key={
                                            customer.id
                                        }
                                        value={
                                            customer.id
                                        }
                                    >
                                        {
                                            customer.customer_number
                                        }{" "}
                                        —{" "}
                                        {
                                            customer.display_name
                                        }
                                        {customer.company_name
                                            ? ` (${customer.company_name})`
                                            : ""}
                                    </option>
                                ),
                            )}
                        </select>
                    </Field>

                    <DateRow />

                    <Field label="Reference / Old Invoice No.">
                        <input
                            name="referenceNumber"
                            placeholder="e.g. INV-OLD-125"
                            className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
                        />
                    </Field>

                    <AmountField
                        label="Opening Receivable"
                    />

                    <NotesField />

                    <button
                        type="submit"
                        className="mt-1 h-11 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        Post Customer Opening Balance
                    </button>
                </form>
            </OpeningCard>

            <OpeningCard
                icon={
                    <Building2 className="size-5" />
                }
                title="Supplier Payables"
                description="Amounts already payable to suppliers before ERP go-live."
            >
                <form
                    action={supplierAction}
                    className="grid gap-4"
                >
                    <Field label="Supplier">
                        <select
                            name="supplierId"
                            required
                            defaultValue=""
                            className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
                        >
                            <option
                                value=""
                                disabled
                            >
                                Select supplier
                            </option>

                            {suppliers.map(
                                (supplier) => (
                                    <option
                                        key={
                                            supplier.id
                                        }
                                        value={
                                            supplier.id
                                        }
                                    >
                                        {
                                            supplier.company_name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </Field>

                    <DateRow />

                    <Field label="Supplier Invoice / Reference">
                        <input
                            name="referenceNumber"
                            placeholder="e.g. SUP-INV-458"
                            className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
                        />
                    </Field>

                    <AmountField
                        label="Opening Payable"
                    />

                    <NotesField />

                    <button
                        type="submit"
                        className="mt-1 h-11 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        Post Supplier Opening Balance
                    </button>
                </form>
            </OpeningCard>
        </div>
    );
}

function OpeningCard({
    icon,
    title,
    description,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border bg-card p-6">
            <div className="mb-6 flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    {icon}
                </div>

                <div>
                    <h2 className="font-semibold">
                        {title}
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>

            {children}
        </section>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="space-y-2">
            <span className="text-sm font-medium">
                {label}
            </span>

            {children}
        </label>
    );
}

function DateRow() {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opening Date">
                <input
                    type="date"
                    name="openingDate"
                    defaultValue={
                        OPENING_DATE
                    }
                    required
                    className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
                />
            </Field>

            <Field label="Due Date">
                <input
                    type="date"
                    name="dueDate"
                    className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
                />
            </Field>
        </div>
    );
}

function AmountField({
    label,
}: {
    label: string;
}) {
    return (
        <Field label={label}>
            <div className="flex h-11 overflow-hidden rounded-lg border bg-background">
                <div className="flex items-center border-r bg-muted/40 px-3 text-sm font-semibold">
                    AED
                </div>

                <input
                    type="number"
                    name="amount"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="min-w-0 flex-1 bg-transparent px-3 text-right text-sm outline-none"
                />
            </div>
        </Field>
    );
}

function NotesField() {
    return (
        <Field label="Notes">
            <textarea
                name="notes"
                rows={3}
                placeholder="Optional opening balance notes"
                className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm"
            />
        </Field>
    );
}