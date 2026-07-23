"use client";

import { useMemo, useState } from "react";

import type { SupplierQuotationEntryData } from "@/lib/repositories/rfq";

import { QuotationHeaderFields } from "./quotation-header-fields";
import { QuotationItemsTable } from "./quotation-items-table";
import { QuotationSummary } from "./quotation-summary";

export interface QuotationFormItem {
  rfqItemId: string;
  itemName: string;
  requestedQuantity: number;
  quotedQuantity: number;
  unitPrice: number;
  moq: number;
  leadTimeDays: number;
  isCompliant: boolean;
}

interface QuotationFormProps {
  data: SupplierQuotationEntryData;
}

export function QuotationForm({
  data,
}: QuotationFormProps) {
  const [supplierId, setSupplierId] = useState("");
  const [quotationNumber, setQuotationNumber] = useState("");
  const [currencyCode, setCurrencyCode] = useState(
    data.currencyCode ?? "AED"
  );
  const [leadTimeDays, setLeadTimeDays] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("");

  const [items, setItems] = useState<QuotationFormItem[]>(
    data.items.map((item) => ({
      rfqItemId: item.rfqItemId,
      itemName: item.itemName,
      requestedQuantity: item.requestedQuantity,
      quotedQuantity: item.requestedQuantity,
      unitPrice: 0,
      moq: 0,
      leadTimeDays: 0,
      isCompliant: true,
    }))
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + item.quotedQuantity * item.unitPrice,
        0
      ),
    [items]
  );

  return (
    <form className="space-y-6">
      <QuotationHeaderFields
        suppliers={data.suppliers}
        supplierId={supplierId}
        quotationNumber={quotationNumber}
        currencyCode={currencyCode}
        leadTimeDays={leadTimeDays}
        paymentTerms={paymentTerms}
        onSupplierChange={setSupplierId}
        onQuotationNumberChange={setQuotationNumber}
        onCurrencyChange={setCurrencyCode}
        onLeadTimeChange={setLeadTimeDays}
        onPaymentTermsChange={setPaymentTerms}
      />

      <QuotationItemsTable
        items={items}
        onItemsChange={setItems}
      />

      <QuotationSummary
        currencyCode={currencyCode}
        subtotal={subtotal}
      />

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Save Quotation
        </button>
      </div>
    </form>
  );
}