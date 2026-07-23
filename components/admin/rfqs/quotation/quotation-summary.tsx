import { formatMoney } from "@/lib/domain/rfq/comparison";

interface QuotationSummaryProps {
  currencyCode: string;
  subtotal: number;
}

export function QuotationSummary({
  currencyCode,
  subtotal,
}: QuotationSummaryProps) {
  return (
    <section className="ml-auto w-full max-w-sm rounded-lg border p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Subtotal
        </span>

        <span className="font-semibold tabular-nums">
          {formatMoney(subtotal, currencyCode)}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <span className="font-semibold">
          Total
        </span>

        <span className="text-lg font-bold tabular-nums">
          {formatMoney(subtotal, currencyCode)}
        </span>
      </div>
    </section>
  );
}