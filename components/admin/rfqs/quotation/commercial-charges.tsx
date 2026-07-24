interface CommercialChargesProps {
  discountAmount: number;
  shippingAmount: number;
  otherCharges: number;
  taxAmount: number;

  onDiscountChange: (value: number) => void;
  onShippingChange: (value: number) => void;
  onOtherChargesChange: (value: number) => void;
  onTaxChange: (value: number) => void;
}

export function CommercialCharges({
  discountAmount,
  shippingAmount,
  otherCharges,
  taxAmount,

  onDiscountChange,
  onShippingChange,
  onOtherChargesChange,
  onTaxChange,
}: CommercialChargesProps) {
  function MoneyInput({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
  }) {
    return (
      <label className="space-y-2">
        <span className="text-sm font-medium">
          {label}
        </span>

        <input
          type="number"
          step="0.01"
          min={0}
          value={value}
          onChange={(event) =>
            onChange(Number(event.target.value))
          }
          className="w-full rounded-md border bg-background px-3 py-2 text-right"
        />
      </label>
    );
  }

  return (
    <section className="rounded-lg border p-6">
      <h2 className="font-semibold">
        Commercial Charges
      </h2>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <MoneyInput
          label="Discount Amount"
          value={discountAmount}
          onChange={onDiscountChange}
        />

        <MoneyInput
          label="Shipping Amount"
          value={shippingAmount}
          onChange={onShippingChange}
        />

        <MoneyInput
          label="Other Charges"
          value={otherCharges}
          onChange={onOtherChargesChange}
        />

        <MoneyInput
          label="Tax Amount"
          value={taxAmount}
          onChange={onTaxChange}
        />
      </div>
    </section>
  );
}