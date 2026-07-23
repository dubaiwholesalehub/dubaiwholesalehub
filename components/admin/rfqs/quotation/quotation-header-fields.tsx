import type { SupplierQuotationEntrySupplier } from "@/lib/repositories/rfq";

interface QuotationHeaderFieldsProps {
  suppliers: SupplierQuotationEntrySupplier[];
  supplierId: string;
  quotationNumber: string;
  currencyCode: string;
  leadTimeDays: number;
  paymentTerms: string;
  onSupplierChange: (value: string) => void;
  onQuotationNumberChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onLeadTimeChange: (value: number) => void;
  onPaymentTermsChange: (value: string) => void;
}

export function QuotationHeaderFields({
  suppliers,
  supplierId,
  quotationNumber,
  currencyCode,
  leadTimeDays,
  paymentTerms,
  onSupplierChange,
  onQuotationNumberChange,
  onCurrencyChange,
  onLeadTimeChange,
  onPaymentTermsChange,
}: QuotationHeaderFieldsProps) {
  return (
    <section className="rounded-lg border p-6">
      <h2 className="font-semibold">
        Quotation Information
      </h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">
            Supplier
          </span>

          <select
            value={supplierId}
            onChange={(event) =>
              onSupplierChange(event.target.value)
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select supplier</option>

            {suppliers.map((supplier) => (
              <option
                key={supplier.rfqSupplierId}
                value={supplier.rfqSupplierId}
              >
                {supplier.supplierName}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">
            Quotation Number
          </span>

          <input
            value={quotationNumber}
            onChange={(event) =>
              onQuotationNumberChange(event.target.value)
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="QT-2026-001"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">
            Currency
          </span>

          <input
            value={currencyCode}
            onChange={(event) =>
              onCurrencyChange(
                event.target.value.toUpperCase()
              )
            }
            maxLength={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">
            Lead Time (Days)
          </span>

          <input
            type="number"
            min={0}
            value={leadTimeDays}
            onChange={(event) =>
              onLeadTimeChange(
                Number(event.target.value)
              )
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">
            Payment Terms
          </span>

          <input
            value={paymentTerms}
            onChange={(event) =>
              onPaymentTermsChange(event.target.value)
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="30 days"
          />
        </label>
      </div>
    </section>
  );
}