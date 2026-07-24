import { formatMoney } from "@/lib/domain/rfq/comparison";

interface QuotationSummaryProps {
    currencyCode: string;

    subtotal: number;

    discountAmount: number;
    shippingAmount: number;
    otherCharges: number;
    taxAmount: number;

    total: number;
}

export function QuotationSummary({
    currencyCode,
    subtotal,

    discountAmount,
    shippingAmount,
    otherCharges,
    taxAmount,

    total,
}: QuotationSummaryProps) {
    function Row({
        label,
        value,
        bold = false,
    }: {
        label: string;
        value: number;
        bold?: boolean;
    }) {
        return (
            <div className="flex items-center justify-between py-2">
                <span
                    className={
                        bold
                            ? "font-semibold"
                            : "text-sm text-muted-foreground"
                    }
                >
                    {label}
                </span>

                <span
                    className={
                        bold
                            ? "text-lg font-bold tabular-nums"
                            : "font-medium tabular-nums"
                    }
                >
                    {formatMoney(value, currencyCode)}
                </span>
            </div>
        );
    }

    return (
        <section className="ml-auto w-full max-w-md rounded-lg border p-6">
            <h2 className="mb-4 font-semibold">
                Quotation Summary
            </h2>

            <Row label="Subtotal" value={subtotal} />
            <Row label="Discount" value={discountAmount} />
            <Row label="Shipping" value={shippingAmount} />
            <Row label="Other Charges" value={otherCharges} />
            <Row label="Tax" value={taxAmount} />

            <div className="my-3 border-t" />

            <Row
                label="Grand Total"
                value={total}
                bold
            />
        </section>
    );
}