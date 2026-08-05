"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import FormToolbar from "@/components/admin/shared/FormToolbar";
import FormCard from "@/components/forms/FormCard";
import FormSection from "@/components/forms/FormSection";
import SaveButton from "@/components/forms/SaveButton";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SalesQuotationItemFormOptions } from "@/lib/repositories/sales-quotation.repository";
import {
  salesQuotationItemSchema,
  type SalesQuotationItemFormValues,
  type SalesQuotationItemValidatedValues,
} from "@/lib/validation/sales-quotation.schema";

export interface SalesQuotationItemInitialValues {
  product_id?: string | null;
  unit_id?: string | null;

  sku?: string | null;

  item_name?: string | null;
  description?: string | null;

  quantity?: number | null;
  unit_price?: number | null;

  discount_percentage?: number | null;
  tax_percentage?: number | null;

  requested_delivery_date?: string | null;

  line_notes?: string | null;
}

interface SalesQuotationItemFormProps {
  mode: "create" | "edit";

  quotationId: string;
  currencyCode: string;

  options: SalesQuotationItemFormOptions;

  initialValues?: SalesQuotationItemInitialValues;

  onSubmit: (values: SalesQuotationItemValidatedValues) => Promise<void>;
}

function getDefaultValues(
  initialValues?: SalesQuotationItemInitialValues,
): SalesQuotationItemFormValues {
  return {
    product_id: initialValues?.product_id ?? "",

    unit_id: initialValues?.unit_id ?? "",

    sku: initialValues?.sku ?? "",

    item_name: initialValues?.item_name ?? "",

    description: initialValues?.description ?? "",

    quantity: initialValues?.quantity ?? 1,

    unit_price: initialValues?.unit_price ?? 0,

    discount_percentage: initialValues?.discount_percentage ?? 0,

    tax_percentage: initialValues?.tax_percentage ?? 5,

    requested_delivery_date: initialValues?.requested_delivery_date ?? "",

    line_notes: initialValues?.line_notes ?? "",
  };
}

export default function SalesQuotationItemForm({
  mode,
  quotationId,
  currencyCode,
  options,
  initialValues,
  onSubmit,
}: SalesQuotationItemFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<
    SalesQuotationItemFormValues,
    unknown,
    SalesQuotationItemValidatedValues
  >({
    resolver: zodResolver(salesQuotationItemSchema),
    defaultValues: getDefaultValues(initialValues),
  });

  const selectedProductId = watch("product_id");

  const quantity = Number(watch("quantity")) || 0;

  const unitPrice = Number(watch("unit_price")) || 0;

  const discountPercentage = Number(watch("discount_percentage")) || 0;

  const taxPercentage = Number(watch("tax_percentage")) || 0;

  const calculation = useMemo(() => {
    const gross = quantity * unitPrice;

    const discount = gross * (discountPercentage / 100);

    const subtotal = gross - discount;

    const tax = subtotal * (taxPercentage / 100);

    const total = subtotal + tax;

    return {
      gross,
      discount,
      subtotal,
      tax,
      total,
    };
  }, [quantity, unitPrice, discountPercentage, taxPercentage]);

  function handleProductChange(productId: string) {
    setValue("product_id", productId, {
      shouldValidate: true,
    });

    if (!productId) {
      return;
    }

    const product = options.products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    setValue("item_name", product.name, {
      shouldValidate: true,
    });

    setValue("sku", product.sku ?? "");

    setValue("description", product.short_description ?? "");

    if (product.unit_id) {
      setValue("unit_id", product.unit_id);
    }
  }

  const submitForm: SubmitHandler<SalesQuotationItemValidatedValues> = async (
    values,
  ) => {
    setSubmitError(null);

    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to save the quotation item.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(submitForm)} noValidate className="space-y-6">
      <FormCard
        title={mode === "create" ? "Add Quotation Item" : "Edit Quotation Item"}
        description="Select an existing product or enter a custom sourcing item."
      >
        <FormSection title="Product">
          <FormField
            id="product_id"
            label="Product"
            description="Optional. Leave empty when quoting a custom or sourced item."
            error={errors.product_id?.message}
          >
            <select
              id="product_id"
              value={selectedProductId ?? ""}
              className={selectClassName}
              aria-invalid={Boolean(errors.product_id)}
              onChange={(event) => handleProductChange(event.target.value)}
            >
              <option value="">Custom item / no linked product</option>

              {options.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku ? `${product.sku} — ` : ""}
                  {product.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="unit_id" label="Unit" error={errors.unit_id?.message}>
            <select
              id="unit_id"
              className={selectClassName}
              aria-invalid={Boolean(errors.unit_id)}
              {...register("unit_id")}
            >
              <option value="">No unit selected</option>

              {options.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.short_name})
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="sku" label="SKU" error={errors.sku?.message}>
            <Input
              id="sku"
              placeholder="Product or custom SKU"
              aria-invalid={Boolean(errors.sku)}
              {...register("sku")}
            />
          </FormField>

          <FormField
            id="item_name"
            label="Item Name"
            required
            error={errors.item_name?.message}
          >
            <Input
              id="item_name"
              placeholder="Item shown on quotation"
              aria-invalid={Boolean(errors.item_name)}
              {...register("item_name")}
            />
          </FormField>
        </FormSection>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Description</h3>

          <FormField
            id="description"
            label="Item Description"
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={4}
              placeholder="Specifications, model, packaging or other details..."
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
          </FormField>
        </section>

        <FormSection title="Quantity & Pricing">
          <FormField
            id="quantity"
            label="Quantity"
            required
            error={errors.quantity?.message}
          >
            <Input
              id="quantity"
              type="number"
              min="0.0001"
              step="0.0001"
              aria-invalid={Boolean(errors.quantity)}
              {...register("quantity")}
            />
          </FormField>

          <FormField
            id="unit_price"
            label={`Unit Price (${currencyCode})`}
            required
            error={errors.unit_price?.message}
          >
            <Input
              id="unit_price"
              type="number"
              min="0"
              step="0.0001"
              aria-invalid={Boolean(errors.unit_price)}
              {...register("unit_price")}
            />
          </FormField>

          <FormField
            id="discount_percentage"
            label="Discount %"
            error={errors.discount_percentage?.message}
          >
            <Input
              id="discount_percentage"
              type="number"
              min="0"
              max="100"
              step="0.0001"
              aria-invalid={Boolean(errors.discount_percentage)}
              {...register("discount_percentage")}
            />
          </FormField>

          <FormField
            id="tax_percentage"
            label="Tax %"
            error={errors.tax_percentage?.message}
          >
            <Input
              id="tax_percentage"
              type="number"
              min="0"
              max="100"
              step="0.0001"
              aria-invalid={Boolean(errors.tax_percentage)}
              {...register("tax_percentage")}
            />
          </FormField>
        </FormSection>

        <FormSection title="Delivery">
          <FormField
            id="requested_delivery_date"
            label="Requested Delivery Date"
            error={errors.requested_delivery_date?.message}
          >
            <Input
              id="requested_delivery_date"
              type="date"
              aria-invalid={Boolean(errors.requested_delivery_date)}
              {...register("requested_delivery_date")}
            />
          </FormField>
        </FormSection>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Line Notes</h3>

          <FormField
            id="line_notes"
            label="Notes"
            error={errors.line_notes?.message}
          >
            <Textarea
              id="line_notes"
              rows={3}
              placeholder="Add notes specific to this quotation line..."
              aria-invalid={Boolean(errors.line_notes)}
              {...register("line_notes")}
            />
          </FormField>
        </section>

        <section className="rounded-xl border bg-muted/20 p-5">
          <h3 className="font-semibold">Line Calculation</h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <CalculationItem
              label="Gross"
              value={formatCurrency(calculation.gross, currencyCode)}
            />

            <CalculationItem
              label="Discount"
              value={formatCurrency(calculation.discount, currencyCode)}
            />

            <CalculationItem
              label="Subtotal"
              value={formatCurrency(calculation.subtotal, currencyCode)}
            />

            <CalculationItem
              label="Tax"
              value={formatCurrency(calculation.tax, currencyCode)}
            />

            <CalculationItem
              label="Line Total"
              value={formatCurrency(calculation.total, currencyCode)}
              emphasized
            />
          </div>
        </section>

        {submitError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {submitError}
          </div>
        ) : null}

        <FormToolbar cancelHref={`/admin/sales/quotations/${quotationId}`}>
          <SaveButton disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : mode === "create"
                ? "Add Item"
                : "Save Changes"}
          </SaveButton>
        </FormToolbar>
      </FormCard>
    </form>
  );
}

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({
  id,
  label,
  required = false,
  description,
  error,
  children,
}: FormFieldProps) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>
        {label}

        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </FieldLabel>

      <FieldContent>
        {children}

        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}

        <FieldError errors={error ? [{ message: error }] : []} />
      </FieldContent>
    </Field>
  );
}

function CalculationItem({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p
        className={
          emphasized
            ? "mt-2 text-lg font-semibold"
            : "mt-2 text-sm font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";
