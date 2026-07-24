"use client";

import {
  type FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { createSupplierQuotationAction } from "@/app/admin/actions/rfq/create-supplier-quotation";
import type { SupplierQuotationEntryData } from "@/lib/repositories/rfq";

import { CommercialCharges } from "./commercial-charges";
import { QuotationHeader } from "./quotation-header";
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
  const router = useRouter();

  const [isSaving, setIsSaving] =
    useState(false);

  const [formMessage, setFormMessage] =
    useState<{
      type: "success" | "error";
      text: string;
    } | null>(null);

  const [header, setHeader] = useState({
    supplierId: "",
    quotationNumber: "",
    quotationDate:
      new Date().toISOString().slice(0, 10),
    validUntil: "",

    currencyCode:
      data.currencyCode ?? "AED",

    paymentTerms: "",
    leadTimeDays: 0,

    incoterm: "",
    loadingPort: "",
    deliveryLocation: "",

    packaging: "",
    warranty: "",

    supplierNotes: "",
    internalNotes: "",

    discountAmount: 0,
    shippingAmount: 0,
    otherCharges: 0,
    taxAmount: 0,
  });

  const [items, setItems] =
    useState<QuotationFormItem[]>(
      data.items.map((item) => ({
        rfqItemId: item.rfqItemId,
        itemName: item.itemName,
        requestedQuantity:
          item.requestedQuantity,
        quotedQuantity:
          item.requestedQuantity,
        unitPrice: 0,
        moq: 0,
        leadTimeDays: 0,
        isCompliant: true,
      })),
    );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total +
          item.quotedQuantity *
            item.unitPrice,
        0,
      ),
    [items],
  );

  const total =
    subtotal -
    header.discountAmount +
    header.shippingAmount +
    header.otherCharges +
    header.taxAmount;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setFormMessage(null);
    setIsSaving(true);

    try {
      const result =
        await createSupplierQuotationAction({
          rfqId: data.rfqId,
          rfqSupplierId:
            header.supplierId,

          quotationNumber:
            header.quotationNumber,

          quotationDate:
            header.quotationDate,

          validUntil:
            header.validUntil,

          currencyCode:
            header.currencyCode,

          paymentTerms:
            header.paymentTerms,

          leadTimeDays:
            header.leadTimeDays,

          incoterm:
            header.incoterm,

          loadingPort:
            header.loadingPort,

          deliveryLocation:
            header.deliveryLocation,

          packaging:
            header.packaging,

          warranty:
            header.warranty,

          supplierNotes:
            header.supplierNotes,

          internalNotes:
            header.internalNotes,

          discountAmount:
            header.discountAmount,

          shippingAmount:
            header.shippingAmount,

          otherCharges:
            header.otherCharges,

          taxAmount:
            header.taxAmount,

          items: items.map((item) => ({
            rfqItemId:
              item.rfqItemId,

            quotedQuantity:
              item.quotedQuantity,

            unitPrice:
              item.unitPrice,

            moq:
              item.moq,

            leadTimeDays:
              item.leadTimeDays,

            isCompliant:
              item.isCompliant,
          })),
        });

      if (!result.success) {
        setFormMessage({
          type: "error",
          text:
            result.message ??
            "Unable to save the quotation.",
        });

        return;
      }

      setFormMessage({
        type: "success",
        text:
          result.message ??
          "Quotation saved successfully.",
      });

      router.push(
        `/admin/rfqs/${data.rfqId}`,
      );

      router.refresh();
    } catch (error) {
      setFormMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while saving the quotation.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit}
    >
      <QuotationHeader
        suppliers={data.suppliers}
        supplierId={header.supplierId}
        quotationNumber={
          header.quotationNumber
        }
        quotationDate={
          header.quotationDate
        }
        validUntil={header.validUntil}
        currencyCode={
          header.currencyCode
        }
        paymentTerms={
          header.paymentTerms
        }
        leadTimeDays={
          header.leadTimeDays
        }
        incoterm={header.incoterm}
        loadingPort={
          header.loadingPort
        }
        deliveryLocation={
          header.deliveryLocation
        }
        packaging={header.packaging}
        warranty={header.warranty}
        supplierNotes={
          header.supplierNotes
        }
        internalNotes={
          header.internalNotes
        }
        onSupplierChange={(supplierId) =>
          setHeader((current) => ({
            ...current,
            supplierId,
          }))
        }
        onQuotationNumberChange={(
          quotationNumber,
        ) =>
          setHeader((current) => ({
            ...current,
            quotationNumber,
          }))
        }
        onQuotationDateChange={(
          quotationDate,
        ) =>
          setHeader((current) => ({
            ...current,
            quotationDate,
          }))
        }
        onValidUntilChange={(
          validUntil,
        ) =>
          setHeader((current) => ({
            ...current,
            validUntil,
          }))
        }
        onCurrencyChange={(
          currencyCode,
        ) =>
          setHeader((current) => ({
            ...current,
            currencyCode,
          }))
        }
        onPaymentTermsChange={(
          paymentTerms,
        ) =>
          setHeader((current) => ({
            ...current,
            paymentTerms,
          }))
        }
        onLeadTimeChange={(
          leadTimeDays,
        ) =>
          setHeader((current) => ({
            ...current,
            leadTimeDays,
          }))
        }
        onIncotermChange={(incoterm) =>
          setHeader((current) => ({
            ...current,
            incoterm,
          }))
        }
        onLoadingPortChange={(
          loadingPort,
        ) =>
          setHeader((current) => ({
            ...current,
            loadingPort,
          }))
        }
        onDeliveryLocationChange={(
          deliveryLocation,
        ) =>
          setHeader((current) => ({
            ...current,
            deliveryLocation,
          }))
        }
        onPackagingChange={(
          packaging,
        ) =>
          setHeader((current) => ({
            ...current,
            packaging,
          }))
        }
        onWarrantyChange={(warranty) =>
          setHeader((current) => ({
            ...current,
            warranty,
          }))
        }
        onSupplierNotesChange={(
          supplierNotes,
        ) =>
          setHeader((current) => ({
            ...current,
            supplierNotes,
          }))
        }
        onInternalNotesChange={(
          internalNotes,
        ) =>
          setHeader((current) => ({
            ...current,
            internalNotes,
          }))
        }
      />

      <QuotationItemsTable
        items={items}
        onItemsChange={setItems}
      />

      <CommercialCharges
        discountAmount={
          header.discountAmount
        }
        shippingAmount={
          header.shippingAmount
        }
        otherCharges={
          header.otherCharges
        }
        taxAmount={header.taxAmount}
        onDiscountChange={(
          discountAmount,
        ) =>
          setHeader((current) => ({
            ...current,
            discountAmount,
          }))
        }
        onShippingChange={(
          shippingAmount,
        ) =>
          setHeader((current) => ({
            ...current,
            shippingAmount,
          }))
        }
        onOtherChargesChange={(
          otherCharges,
        ) =>
          setHeader((current) => ({
            ...current,
            otherCharges,
          }))
        }
        onTaxChange={(taxAmount) =>
          setHeader((current) => ({
            ...current,
            taxAmount,
          }))
        }
      />

      <QuotationSummary
        currencyCode={
          header.currencyCode
        }
        subtotal={subtotal}
        discountAmount={
          header.discountAmount
        }
        shippingAmount={
          header.shippingAmount
        }
        otherCharges={
          header.otherCharges
        }
        taxAmount={header.taxAmount}
        total={total}
      />

      {formMessage ? (
        <div
          aria-live="polite"
          className={
            formMessage.type === "success"
              ? "rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          }
        >
          {formMessage.text}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving
            ? "Saving Quotation..."
            : "Save Quotation"}
        </button>
      </div>
    </form>
  );
}