"use client";

import { useMemo, useState } from "react";

import type {
    RfqSelectedSupplier,
    RfqSupplierCountryOption,
    RfqSupplierOption,
} from "@/components/admin/rfqs/suppliers/types";

import {
    countSelectedSupplierCountries,
    createSelectedSupplier,
    filterRfqSuppliers,
    getSupplierLocation,
    hasSupplierContactMethod,
} from "@/components/admin/rfqs/suppliers/utils";

interface RfqSuppliersStepProps {
    suppliers: RfqSupplierOption[];
    countries: RfqSupplierCountryOption[];
    selectedSuppliers: RfqSelectedSupplier[];
    onSelectedSuppliersChange: (
        suppliers: RfqSelectedSupplier[],
    ) => void;
    onBack: () => void;
    onContinue: () => void;
}

export function RfqSuppliersStep({
    suppliers,
    countries,
    selectedSuppliers,
    onSelectedSuppliersChange,
    onBack,
    onContinue,
}: RfqSuppliersStepProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [countryId, setCountryId] = useState("");

    const filteredSuppliers = useMemo(
        () =>
            filterRfqSuppliers(
                suppliers,
                searchQuery,
                countryId,
            ),
        [suppliers, searchQuery, countryId],
    );

    const selectedCountryCount =
        countSelectedSupplierCountries(
            selectedSuppliers,
        );

    const contactableSupplierCount = useMemo(
        () =>
            suppliers.filter(hasSupplierContactMethod)
                .length,
        [suppliers],
    );

    function isSelected(supplierId: string) {
        return selectedSuppliers.some(
            (supplier) =>
                supplier.supplierId === supplierId,
        );
    }

    function toggleSupplier(
        supplier: RfqSupplierOption,
    ) {
        if (isSelected(supplier.id)) {
            onSelectedSuppliersChange(
                selectedSuppliers.filter(
                    (selectedSupplier) =>
                        selectedSupplier.supplierId !==
                        supplier.id,
                ),
            );

            return;
        }

        onSelectedSuppliersChange([
            ...selectedSuppliers,
            createSelectedSupplier(supplier),
        ]);
    }

    function removeSelectedSupplier(
        supplierId: string,
    ) {
        onSelectedSuppliersChange(
            selectedSuppliers.filter(
                (supplier) =>
                    supplier.supplierId !== supplierId,
            ),
        );
    }

    function clearSelectedSuppliers() {
        onSelectedSuppliersChange([]);
    }

    function clearFilters() {
        setSearchQuery("");
        setCountryId("");
    }

    return (
        <>
            <div className="border-b px-6 py-5">
                <h2 className="text-lg font-semibold">
                    Select suppliers
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                    Search and select the suppliers who should
                    receive this RFQ.
                </p>
            </div>

            <div className="space-y-6 p-6">
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatisticCard
                        label="Available suppliers"
                        value={suppliers.length.toLocaleString(
                            "en-AE",
                        )}
                        description="Active suppliers available"
                    />

                    <StatisticCard
                        label="Selected"
                        value={selectedSuppliers.length.toLocaleString(
                            "en-AE",
                        )}
                        description="Suppliers invited to this RFQ"
                    />

                    <StatisticCard
                        label="Countries"
                        value={selectedCountryCount.toLocaleString(
                            "en-AE",
                        )}
                        description="Countries represented"
                    />

                    <StatisticCard
                        label="Contactable"
                        value={contactableSupplierCount.toLocaleString(
                            "en-AE",
                        )}
                        description="With email, phone or WhatsApp"
                    />
                </section>

                <section className="rounded-lg border bg-background p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                        <FieldGroup
                            label="Search suppliers"
                            htmlFor="supplier-search"
                        >
                            <input
                                id="supplier-search"
                                type="search"
                                placeholder="Company, contact, email, phone or city"
                                value={searchQuery}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                className={getInputClasses()}
                            />
                        </FieldGroup>

                        <FieldGroup
                            label="Country"
                            htmlFor="supplier-country"
                        >
                            <select
                                id="supplier-country"
                                value={countryId}
                                onChange={(event) =>
                                    setCountryId(event.target.value)
                                }
                                className={getInputClasses()}
                            >
                                <option value="">
                                    All countries
                                </option>

                                {countries.map((country) => (
                                    <option
                                        key={country.id}
                                        value={country.id}
                                    >
                                        {country.name}
                                        {country.iso2
                                            ? ` (${country.iso2})`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        </FieldGroup>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing{" "}
                            <span className="font-medium text-foreground">
                                {filteredSuppliers.length}
                            </span>{" "}
                            of{" "}
                            <span className="font-medium text-foreground">
                                {suppliers.length}
                            </span>{" "}
                            suppliers
                        </p>

                        {searchQuery || countryId ? (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="self-start text-sm font-medium text-primary hover:underline sm:self-auto"
                            >
                                Clear filters
                            </button>
                        ) : null}
                    </div>
                </section>

                <div className="space-y-6">
                    <section className="space-y-4">
                        <div>
                            <h3 className="font-medium">
                                Supplier directory
                            </h3>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Select one or more suppliers for this
                                request for quotation.
                            </p>
                        </div>

                        {filteredSuppliers.length === 0 ? (
                            <div className="rounded-lg border bg-background px-6 py-14 text-center">
                                <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-muted text-lg">
                                    ?
                                </div>

                                <h4 className="mt-4 font-medium">
                                    No suppliers found
                                </h4>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Try changing the search text or country
                                    filter.
                                </p>

                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="mt-5 inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
                                >
                                    Clear filters
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                                {filteredSuppliers.map(
                                    (supplier) => {
                                        const selected = isSelected(
                                            supplier.id,
                                        );

                                        return (
                                            <SupplierCard
                                                key={supplier.id}
                                                supplier={supplier}
                                                selected={selected}
                                                onToggle={() =>
                                                    toggleSupplier(supplier)
                                                }
                                            />
                                        );
                                    },
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
                >
                    Back to items
                </button>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <p className="text-center text-sm text-muted-foreground sm:text-left">
                        {selectedSuppliers.length === 0
                            ? "Select at least one supplier."
                            : `${selectedSuppliers.length} supplier${selectedSuppliers.length === 1
                                ? ""
                                : "s"
                            } selected.`}
                    </p>

                    <button
                        type="button"
                        onClick={onContinue}
                        disabled={
                            selectedSuppliers.length === 0
                        }
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Continue to review
                    </button>
                </div>
            </div>
        </>
    );
}

interface SupplierCardProps {
    supplier: RfqSupplierOption;
    selected: boolean;
    onToggle: () => void;
}

function SupplierCard({
    supplier,
    selected,
    onToggle,
}: SupplierCardProps) {
    const location = getSupplierLocation(supplier);

    const hasContact =
        hasSupplierContactMethod(supplier);

    return (
        <article
            className={[
                "flex h-full min-w-0 flex-col overflow-hidden rounded-lg border bg-background p-5 transition-colors",
                selected
                    ? "border-primary ring-1 ring-primary/20"
                    : "hover:border-foreground/20",
            ].join(" ")}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h4 className="truncate font-semibold">
                        {supplier.company_name}
                    </h4>

                    <p className="mt-1 text-sm text-muted-foreground">
                        {supplier.contact_name ??
                            "No contact person"}
                    </p>
                </div>

                <span
                    className={[
                        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        selected
                            ? "bg-primary/10 text-primary"
                            : hasContact
                                ? "bg-emerald-500/10 text-emerald-700"
                                : "bg-amber-500/10 text-amber-700",
                    ].join(" ")}
                >
                    {selected
                        ? "Selected"
                        : hasContact
                            ? "Contactable"
                            : "Limited contact"}
                </span>
            </div>

            <div className="mt-5 space-y-3 text-sm">
                <SupplierDetail
                    label="Location"
                    value={location || "Not provided"}
                />

                <SupplierDetail
                    label="Email"
                    value={
                        supplier.email || "Not provided"
                    }
                />

                <SupplierDetail
                    label="Phone"
                    value={
                        supplier.phone || "Not provided"
                    }
                />

                <SupplierDetail
                    label="WhatsApp"
                    value={
                        supplier.whatsapp || "Not provided"
                    }
                />
            </div>

            {supplier.notes ? (
                <div className="mt-4 rounded-md bg-muted/40 px-3 py-2">
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                        {supplier.notes}
                    </p>
                </div>
            ) : null}

            <div className="mt-auto pt-5">
                <button
                    type="button"
                    onClick={onToggle}
                    aria-pressed={selected}
                    className={[
                        "inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors",
                        selected
                            ? "border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                            : "bg-primary text-primary-foreground hover:bg-primary/90",
                    ].join(" ")}
                >
                    {selected
                        ? "Remove selection"
                        : "Select supplier"}
                </button>
            </div>
        </article>
    );
}

interface SupplierDetailProps {
    label: string;
    value: string;
}

function SupplierDetail({
    label,
    value,
}: SupplierDetailProps) {
    return (
        <div className="grid gap-1 sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-3">
            <span className="text-muted-foreground">
                {label}
            </span>

            <span className="min-w-0 break-all font-medium sm:break-words">
                {value}
            </span>
        </div>
    );
}

interface StatisticCardProps {
    label: string;
    value: string;
    description: string;
}

function StatisticCard({
    label,
    value,
    description,
}: StatisticCardProps) {
    return (
        <div className="rounded-lg border bg-background p-4">
            <p className="text-sm font-medium text-muted-foreground">
                {label}
            </p>

            <p className="mt-2 text-2xl font-semibold tracking-tight">
                {value}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
                {description}
            </p>
        </div>
    );
}

interface FieldGroupProps {
    label: string;
    htmlFor: string;
    children: React.ReactNode;
}

function FieldGroup({
    label,
    htmlFor,
    children,
}: FieldGroupProps) {
    return (
        <div>
            <label
                htmlFor={htmlFor}
                className="mb-2 block text-sm font-medium"
            >
                {label}
            </label>

            {children}
        </div>
    );
}

function getInputClasses() {
    return [
        "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors",
        "placeholder:text-muted-foreground",
        "focus:border-ring focus:ring-2 focus:ring-ring/20",
    ].join(" ");
}