"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { awardSupplierQuotationAction } from "@/app/admin/actions/rfq/award-supplier-quotation";
import type { RfqComparisonData } from "@/lib/repositories/rfq";

import { DetailSection } from "../detail";
import { ComparisonEmptyState } from "./comparison-empty-state";
import {
    formatMoney,
    getBestPrices,
    getBestTotalSupplier,
    getSupplierSavings,
    getSupplierScores,
    isBestPrice,
} from "@/lib/domain/rfq/comparison";

import { submitSupplierQuotationAction } from "@/app/admin/actions/rfq/submit-supplier-quotation";

interface ComparisonTableProps {
    data: RfqComparisonData;
}

export function ComparisonTable({
    data,
}: ComparisonTableProps) {

    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    function handleAward(
        quotationId: string,
    ) {
        const confirmed = window.confirm(
            "Award this supplier quotation?\n\nThis will mark the RFQ as awarded."
        );

        if (!confirmed) {
            return;
        }

        startTransition(async () => {
            const result =
                await awardSupplierQuotationAction(
                    data.rfqId,
                    quotationId,
                );

            if (!result.success) {
                window.alert(result.message);
                return;
            }

            window.alert(result.message);
            router.refresh();
        });
    }

    function handleSubmitQuotation(
        quotationId: string,
    ) {
        const confirmed = window.confirm(
            "Submit this supplier quotation?\n\nAfter submission, it will become eligible for review and award."
        );

        if (!confirmed) {
            return;
        }

        startTransition(async () => {
            const result =
                await submitSupplierQuotationAction(
                    data.rfqId,
                    quotationId,
                );

            if (!result.success) {
                window.alert(result.message);
                return;
            }

            window.alert(result.message);
            router.refresh();
        });
    }
    const suppliersWithQuotations = data.suppliers.filter(
        (supplier) => supplier.quotation
    );
    const bestPrices = getBestPrices(data);
    const bestTotalSupplierId = getBestTotalSupplier(data);
    const savingsLookup = new Map(
        getSupplierSavings(data).map((item) => [
            item.supplierId,
            item.saving,
        ])
    );
    const scoreLookup = new Map(
        getSupplierScores(data).map((item) => [
            item.supplierId,
            item.score,
        ])
    );
    return (
        <DetailSection title="Quotation Comparison">
            {suppliersWithQuotations.length === 0 ? (
                <ComparisonEmptyState />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="px-4 py-3 text-left font-medium">
                                    Item
                                </th>

                                <th className="px-4 py-3 text-right font-medium">
                                    Quantity
                                </th>

                                {suppliersWithQuotations.map((supplier) => (
                                    <th
                                        key={supplier.id}
                                        className="px-4 py-3 text-right font-medium"
                                    >
                                        <div className="flex flex-col items-end gap-2">
                                            <span>{supplier.supplierName}</span>

                                            {supplier.quotation ? (
                                                <>
                                                    <span className="text-xs font-normal text-muted-foreground">
                                                        {supplier.quotation.quotationNumber}
                                                    </span>

                                                    <span className="text-xs font-normal capitalize text-muted-foreground">
                                                        Status: {supplier.quotation.status.replaceAll("_", " ")}
                                                    </span>

                                                    {supplier.quotation.status === "draft" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isPending}
                                                            onClick={() =>
                                                                handleSubmitQuotation(
                                                                    supplier.quotation!.id,
                                                                )
                                                            }
                                                        >
                                                            {isPending ? "Submitting..." : "Submit Quotation"}
                                                        </Button>
                                                    ) : ["submitted", "under_review", "revised"].includes(
                                                        supplier.quotation.status
                                                    ) ? (
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            disabled={isPending}
                                                            onClick={() =>
                                                                handleAward(
                                                                    supplier.quotation!.id,
                                                                )
                                                            }
                                                        >
                                                            {isPending ? "Awarding..." : "🏆 Award"}
                                                        </Button>
                                                    ) : supplier.quotation.status === "accepted" ? (
                                                        <Button
                                                            size="sm"
                                                            disabled
                                                        >
                                                            🏆 Awarded
                                                        </Button>
                                                    ) : supplier.quotation.status === "rejected" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled
                                                        >
                                                            Rejected
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled
                                                        >
                                                            {supplier.quotation.status.replaceAll("_", " ")}
                                                        </Button>
                                                    )}
                                                </>
                                            ) : null}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {data.items.map((item) => (
                                <tr
                                    key={item.id}
                                    className="border-b last:border-b-0"
                                >
                                    <td className="px-4 py-4">
                                        <p className="font-medium">
                                            {item.productName}
                                        </p>

                                        {item.description ? (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {item.description}
                                            </p>
                                        ) : null}
                                    </td>

                                    <td className="px-4 py-4 text-right tabular-nums">
                                        {item.quantity}
                                    </td>

                                    {suppliersWithQuotations.map((supplier) => {
                                        const quotationItem =
                                            supplier.quotation?.items.find(
                                                (quoteItem) =>
                                                    quoteItem.rfqItemId === item.id
                                            );

                                        const best =
                                            quotationItem &&
                                            isBestPrice(
                                                bestPrices,
                                                item.id,
                                                quotationItem.id
                                            );

                                        return (
                                            <td
                                                key={supplier.id}
                                                className="px-4 py-4 text-right tabular-nums"
                                            >
                                                {quotationItem ? (
                                                    <span
                                                        className={
                                                            best
                                                                ? "inline-flex rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700"
                                                                : "inline-flex px-2 py-1"
                                                        }
                                                    >
                                                        {formatMoney(
                                                            quotationItem.unitPrice,
                                                            supplier.quotation?.currencyCode
                                                        )}
                                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t bg-muted/40">
                                <td
                                    className="px-4 py-4 font-semibold"
                                    colSpan={2}
                                >
                                    Total Quotation
                                </td>

                                {suppliersWithQuotations.map((supplier) => (
                                    <td
                                        key={supplier.id}
                                        className="px-4 py-4 text-right font-semibold"
                                    >
                                        <span
                                            className={
                                                supplier.id === bestTotalSupplierId
                                                    ? "inline-flex rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700"
                                                    : ""
                                            }
                                        >
                                            {formatMoney(
                                                supplier.quotation?.totalAmount,
                                                supplier.quotation?.currencyCode
                                            )}
                                        </span>
                                    </td>
                                ))}
                            </tr>

                            <tr className="border-t">
                                <td
                                    className="px-4 py-4 font-medium text-muted-foreground"
                                    colSpan={2}
                                >
                                    Potential Savings
                                </td>

                                {suppliersWithQuotations.map((supplier) => {
                                    const saving =
                                        savingsLookup.get(supplier.id) ?? 0;

                                    return (
                                        <td
                                            key={supplier.id}
                                            className="px-4 py-4 text-right"
                                        >
                                            {saving === 0 ? (
                                                <span className="font-medium text-emerald-600">
                                                    Best
                                                </span>
                                            ) : (
                                                formatMoney(
                                                    saving,
                                                    supplier.quotation?.currencyCode
                                                )
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                            <tr className="border-t">
                                <td
                                    className="px-4 py-4 font-medium text-muted-foreground"
                                    colSpan={2}
                                >
                                    Supplier Score
                                </td>

                                {suppliersWithQuotations.map((supplier) => {
                                    const score = scoreLookup.get(supplier.id) ?? 0;

                                    return (
                                        <td
                                            key={supplier.id}
                                            className="px-4 py-4 text-right"
                                        >
                                            <span
                                                className={
                                                    score >= 90
                                                        ? "inline-flex rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700"
                                                        : score >= 75
                                                            ? "inline-flex rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-700"
                                                            : "inline-flex rounded-md bg-red-50 px-2 py-1 font-semibold text-red-700"
                                                }
                                            >
                                                {score}/100
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </DetailSection>
    );
}