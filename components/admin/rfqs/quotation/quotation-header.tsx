import type { SupplierQuotationEntrySupplier } from "@/lib/repositories/rfq";

interface QuotationHeaderProps {
  suppliers: SupplierQuotationEntrySupplier[];

  supplierId: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;

  currencyCode: string;
  paymentTerms: string;
  leadTimeDays: number;

  incoterm: string;
  loadingPort: string;
  deliveryLocation: string;

  packaging: string;
  warranty: string;

  supplierNotes: string;
  internalNotes: string;

  onSupplierChange: (value: string) => void;
  onQuotationNumberChange: (value: string) => void;
  onQuotationDateChange: (value: string) => void;
  onValidUntilChange: (value: string) => void;

  onCurrencyChange: (value: string) => void;
  onPaymentTermsChange: (value: string) => void;
  onLeadTimeChange: (value: number) => void;

  onIncotermChange: (value: string) => void;
  onLoadingPortChange: (value: string) => void;
  onDeliveryLocationChange: (value: string) => void;

  onPackagingChange: (value: string) => void;
  onWarrantyChange: (value: string) => void;

  onSupplierNotesChange: (value: string) => void;
  onInternalNotesChange: (value: string) => void;
}

export function QuotationHeader({
  suppliers,

  supplierId,
  quotationNumber,
  quotationDate,
  validUntil,

  currencyCode,
  paymentTerms,
  leadTimeDays,

  incoterm,
  loadingPort,
  deliveryLocation,

  packaging,
  warranty,

  supplierNotes,
  internalNotes,

  onSupplierChange,
  onQuotationNumberChange,
  onQuotationDateChange,
  onValidUntilChange,

  onCurrencyChange,
  onPaymentTermsChange,
  onLeadTimeChange,

  onIncotermChange,
  onLoadingPortChange,
  onDeliveryLocationChange,

  onPackagingChange,
  onWarrantyChange,

  onSupplierNotesChange,
  onInternalNotesChange,
}: QuotationHeaderProps) {
  return (
    <section className="rounded-lg border p-6">
      <div>
        <h2 className="text-lg font-semibold">
          Quotation Information
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Enter the supplier quotation and commercial details.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
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
            required
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
            Quotation Date
          </span>

          <input
            type="date"
            value={quotationDate}
            onChange={(event) =>
              onQuotationDateChange(event.target.value)
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">
            Valid Until
          </span>

          <input
            type="date"
            value={validUntil}
            onChange={(event) =>
              onValidUntilChange(event.target.value)
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
            placeholder="AED"
            required
          />
        </label>

        <label className="space-y-2">
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

        <label className="space-y-2">
          <span className="text-sm font-medium">
            Lead Time (Days)
          </span>

          <input
            type="number"
            min={0}
            value={leadTimeDays}
            onChange={(event) =>
              onLeadTimeChange(Number(event.target.value))
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">
            Incoterm
          </span>

          <input
            value={incoterm}
            onChange={(event) =>
              onIncotermChange(event.target.value)
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="FOB, CIF, EXW"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">
            Loading Port
          </span>

          <input
            value={loadingPort}
            onChange={(event) =>
              onLoadingPortChange(event.target.value)
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Jebel Ali"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">
            Delivery Location
          </span>

          <input
            value={deliveryLocation}
            onChange={(event) =>
              onDeliveryLocationChange(event.target.value)
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Dubai warehouse"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">
            Packaging
          </span>

          <input
            value={packaging}
            onChange={(event) =>
              onPackagingChange(event.target.value)
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Cartons, pallets, wooden box"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">
            Warranty
          </span>

          <input
            value={warranty}
            onChange={(event) =>
              onWarrantyChange(event.target.value)
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="12 months"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">
            Supplier Notes
          </span>

          <textarea
            value={supplierNotes}
            onChange={(event) =>
              onSupplierNotesChange(event.target.value)
            }
            rows={3}
            className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Notes received from the supplier"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">
            Internal Notes
          </span>

          <textarea
            value={internalNotes}
            onChange={(event) =>
              onInternalNotesChange(event.target.value)
            }
            rows={3}
            className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Internal procurement notes"
          />
        </label>
      </div>
    </section>
  );
}