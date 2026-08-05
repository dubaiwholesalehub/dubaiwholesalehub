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
import type { SalesOrderFormOptions } from "@/lib/repositories/sales-order.repository";
import {
  salesOrderSchema,
  type SalesOrderFormValues,
  type SalesOrderValidatedValues,
} from "@/lib/validation/sales-order.schema";

const SALES_ORDER_LIST_URL = "/admin/sales/orders";

export interface SalesOrderFormInitialValues {
  quotation_id?: string | null;

  customer_id?: string | null;
  customer_contact_id?: string | null;

  billing_address_id?: string | null;
  shipping_address_id?: string | null;

  warehouse_id?: string | null;

  order_date?: string | null;

  requested_delivery_date?: string | null;
  expected_delivery_date?: string | null;

  status?:
    | "draft"
    | "confirmed"
    | "processing"
    | "partially_fulfilled"
    | "fulfilled"
    | "completed"
    | "cancelled"
    | "closed"
    | null;

  fulfilment_status?:
    | "unplanned"
    | "awaiting_stock"
    | "awaiting_procurement"
    | "partially_allocated"
    | "allocated"
    | "partially_fulfilled"
    | "fulfilled"
    | "not_required"
    | null;

  payment_status?:
    "unpaid" | "partially_paid" | "paid" | "overpaid" | "refunded" | null;

  source?: "internal" | "hmshoponline" | "dubaiwholesalehub" | "import" | null;

  external_reference?: string | null;
  customer_reference?: string | null;

  currency_code?: string | null;
  exchange_rate?: number | null;

  shipping_amount?: number | null;

  payment_terms_days?: number | null;

  delivery_terms?: string | null;
  payment_terms?: string | null;

  customer_notes?: string | null;
  internal_notes?: string | null;
}

interface SalesOrderFormProps {
  mode: "create" | "edit";

  options: SalesOrderFormOptions;

  initialValues?: SalesOrderFormInitialValues;

  onSubmit: (values: SalesOrderValidatedValues) => Promise<void>;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultValues(
  initialValues?: SalesOrderFormInitialValues,
): SalesOrderFormValues {
  return {
    quotation_id: initialValues?.quotation_id ?? "",

    customer_id: initialValues?.customer_id ?? "",

    customer_contact_id: initialValues?.customer_contact_id ?? "",

    billing_address_id: initialValues?.billing_address_id ?? "",

    shipping_address_id: initialValues?.shipping_address_id ?? "",

    warehouse_id: initialValues?.warehouse_id ?? "",

    order_date: initialValues?.order_date ?? getToday(),

    requested_delivery_date: initialValues?.requested_delivery_date ?? "",

    expected_delivery_date: initialValues?.expected_delivery_date ?? "",

    status: initialValues?.status ?? "draft",

    fulfilment_status: initialValues?.fulfilment_status ?? "unplanned",

    payment_status: initialValues?.payment_status ?? "unpaid",

    source: initialValues?.source ?? "internal",

    external_reference: initialValues?.external_reference ?? "",

    customer_reference: initialValues?.customer_reference ?? "",

    currency_code: initialValues?.currency_code ?? "AED",

    exchange_rate: initialValues?.exchange_rate ?? 1,

    shipping_amount: initialValues?.shipping_amount ?? 0,

    payment_terms_days: initialValues?.payment_terms_days ?? 0,

    delivery_terms: initialValues?.delivery_terms ?? "",

    payment_terms: initialValues?.payment_terms ?? "",

    customer_notes: initialValues?.customer_notes ?? "",

    internal_notes: initialValues?.internal_notes ?? "",
  };
}

export default function SalesOrderForm({
  mode,
  options,
  initialValues,
  onSubmit,
}: SalesOrderFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SalesOrderFormValues, unknown, SalesOrderValidatedValues>({
    resolver: zodResolver(salesOrderSchema),

    defaultValues: getDefaultValues(initialValues),
  });

  const selectedCustomerId = watch("customer_id");

  const selectedSource = watch("source");

  const customerContacts = useMemo(
    () =>
      options.contacts.filter(
        (contact) => contact.customer_id === selectedCustomerId,
      ),
    [options.contacts, selectedCustomerId],
  );

  const customerAddresses = useMemo(
    () =>
      options.addresses.filter(
        (address) => address.customer_id === selectedCustomerId,
      ),
    [options.addresses, selectedCustomerId],
  );

  const selectedCustomer = options.customers.find(
    (customer) => customer.id === selectedCustomerId,
  );

  function handleCustomerChange(customerId: string) {
    setValue("customer_id", customerId, {
      shouldValidate: true,
    });

    setValue("customer_contact_id", "");

    setValue("billing_address_id", "");

    setValue("shipping_address_id", "");

    const customer = options.customers.find((item) => item.id === customerId);

    if (customer?.currency_code) {
      setValue("currency_code", customer.currency_code, {
        shouldValidate: true,
      });
    }

    const primaryContact = options.contacts.find(
      (contact) => contact.customer_id === customerId && contact.is_primary,
    );

    if (primaryContact) {
      setValue("customer_contact_id", primaryContact.id);
    }

    const defaultAddresses = options.addresses.filter(
      (address) => address.customer_id === customerId && address.is_default,
    );

    const billingAddress = defaultAddresses.find(
      (address) =>
        address.address_type === "billing" || address.address_type === "both",
    );

    const shippingAddress = defaultAddresses.find(
      (address) =>
        address.address_type === "shipping" || address.address_type === "both",
    );

    if (billingAddress) {
      setValue("billing_address_id", billingAddress.id);
    }

    if (shippingAddress) {
      setValue("shipping_address_id", shippingAddress.id);
    }
  }

  const submitForm: SubmitHandler<SalesOrderValidatedValues> = async (
    values,
  ) => {
    setSubmitError(null);

    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to save the sales order.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(submitForm)} noValidate className="space-y-6">
      <FormCard
        title={mode === "create" ? "Create Sales Order" : "Edit Sales Order"}
        description="Enter the customer, delivery dates, warehouse and commercial terms."
      >
        <FormSection title="Customer">
          <FormField
            id="customer_id"
            label="Customer"
            required
            error={errors.customer_id?.message}
          >
            <select
              id="customer_id"
              value={selectedCustomerId}
              className={selectClassName}
              aria-invalid={Boolean(errors.customer_id)}
              onChange={(event) => handleCustomerChange(event.target.value)}
            >
              <option value="">Select customer</option>

              {options.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_number} — {customer.display_name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="customer_contact_id"
            label="Customer Contact"
            error={errors.customer_contact_id?.message}
          >
            <select
              id="customer_contact_id"
              className={selectClassName}
              disabled={!selectedCustomerId}
              aria-invalid={Boolean(errors.customer_contact_id)}
              {...register("customer_contact_id")}
            >
              <option value="">No contact selected</option>

              {customerContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.contact_name}
                  {contact.job_title ? ` — ${contact.job_title}` : ""}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="billing_address_id"
            label="Billing Address"
            error={errors.billing_address_id?.message}
          >
            <select
              id="billing_address_id"
              className={selectClassName}
              disabled={!selectedCustomerId}
              aria-invalid={Boolean(errors.billing_address_id)}
              {...register("billing_address_id")}
            >
              <option value="">No billing address</option>

              {customerAddresses
                .filter(
                  (address) =>
                    address.address_type === "billing" ||
                    address.address_type === "both",
                )
                .map((address) => (
                  <option key={address.id} value={address.id}>
                    {formatAddressOption(address)}
                  </option>
                ))}
            </select>
          </FormField>

          <FormField
            id="shipping_address_id"
            label="Shipping Address"
            error={errors.shipping_address_id?.message}
          >
            <select
              id="shipping_address_id"
              className={selectClassName}
              disabled={!selectedCustomerId}
              aria-invalid={Boolean(errors.shipping_address_id)}
              {...register("shipping_address_id")}
            >
              <option value="">No shipping address</option>

              {customerAddresses
                .filter(
                  (address) =>
                    address.address_type === "shipping" ||
                    address.address_type === "both",
                )
                .map((address) => (
                  <option key={address.id} value={address.id}>
                    {formatAddressOption(address)}
                  </option>
                ))}
            </select>
          </FormField>
        </FormSection>

        <FormSection title="Order Information">
          <FormField
            id="order_date"
            label="Order Date"
            required
            error={errors.order_date?.message}
          >
            <Input
              id="order_date"
              type="date"
              aria-invalid={Boolean(errors.order_date)}
              {...register("order_date")}
            />
          </FormField>

          <FormField
            id="requested_delivery_date"
            label="Requested Delivery"
            error={errors.requested_delivery_date?.message}
          >
            <Input
              id="requested_delivery_date"
              type="date"
              aria-invalid={Boolean(errors.requested_delivery_date)}
              {...register("requested_delivery_date")}
            />
          </FormField>

          <FormField
            id="expected_delivery_date"
            label="Expected Delivery"
            error={errors.expected_delivery_date?.message}
          >
            <Input
              id="expected_delivery_date"
              type="date"
              aria-invalid={Boolean(errors.expected_delivery_date)}
              {...register("expected_delivery_date")}
            />
          </FormField>

          <FormField
            id="warehouse_id"
            label="Warehouse"
            error={errors.warehouse_id?.message}
          >
            <select
              id="warehouse_id"
              className={selectClassName}
              aria-invalid={Boolean(errors.warehouse_id)}
              {...register("warehouse_id")}
            >
              <option value="">No warehouse selected</option>

              {options.warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} — {warehouse.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="source" label="Source" error={errors.source?.message}>
            <select
              id="source"
              className={selectClassName}
              aria-invalid={Boolean(errors.source)}
              {...register("source")}
            >
              <option value="internal">Internal</option>

              <option value="hmshoponline">HMShopOnline</option>

              <option value="dubaiwholesalehub">Dubai Wholesale Hub</option>

              <option value="import">Imported</option>
            </select>
          </FormField>

          {selectedSource !== "internal" ? (
            <FormField
              id="external_reference"
              label="External Reference"
              error={errors.external_reference?.message}
              description="Reference from the connected website or imported system."
            >
              <Input
                id="external_reference"
                placeholder="External order reference"
                aria-invalid={Boolean(errors.external_reference)}
                {...register("external_reference")}
              />
            </FormField>
          ) : null}

          <FormField
            id="customer_reference"
            label="Customer Reference"
            error={errors.customer_reference?.message}
          >
            <Input
              id="customer_reference"
              placeholder="Customer PO or reference"
              aria-invalid={Boolean(errors.customer_reference)}
              {...register("customer_reference")}
            />
          </FormField>
        </FormSection>

        <FormSection title="Commercial Settings">
          <FormField
            id="currency_code"
            label="Currency"
            required
            error={errors.currency_code?.message}
            description={
              selectedCustomer
                ? `Customer default: ${selectedCustomer.currency_code}`
                : undefined
            }
          >
            <Input
              id="currency_code"
              maxLength={3}
              className="uppercase"
              aria-invalid={Boolean(errors.currency_code)}
              {...register("currency_code")}
            />
          </FormField>

          <FormField
            id="exchange_rate"
            label="Exchange Rate"
            required
            error={errors.exchange_rate?.message}
          >
            <Input
              id="exchange_rate"
              type="number"
              min="0.00000001"
              step="0.00000001"
              aria-invalid={Boolean(errors.exchange_rate)}
              {...register("exchange_rate")}
            />
          </FormField>

          <FormField
            id="shipping_amount"
            label="Shipping Amount"
            error={errors.shipping_amount?.message}
          >
            <Input
              id="shipping_amount"
              type="number"
              min="0"
              step="0.01"
              aria-invalid={Boolean(errors.shipping_amount)}
              {...register("shipping_amount")}
            />
          </FormField>

          <FormField
            id="payment_terms_days"
            label="Payment Terms Days"
            error={errors.payment_terms_days?.message}
          >
            <Input
              id="payment_terms_days"
              type="number"
              min="0"
              step="1"
              aria-invalid={Boolean(errors.payment_terms_days)}
              {...register("payment_terms_days")}
            />
          </FormField>

          <FormField
            id="delivery_terms"
            label="Delivery Terms"
            error={errors.delivery_terms?.message}
          >
            <Input
              id="delivery_terms"
              placeholder="For example: Ex-warehouse Dubai"
              aria-invalid={Boolean(errors.delivery_terms)}
              {...register("delivery_terms")}
            />
          </FormField>

          <FormField
            id="payment_terms"
            label="Payment Terms"
            error={errors.payment_terms?.message}
          >
            <Input
              id="payment_terms"
              placeholder="For example: 50% advance"
              aria-invalid={Boolean(errors.payment_terms)}
              {...register("payment_terms")}
            />
          </FormField>
        </FormSection>

        <FormSection title="Notes">
          <FormField
            id="customer_notes"
            label="Customer Notes"
            error={errors.customer_notes?.message}
            description="These notes may appear on documents sent to the customer."
          >
            <Textarea
              id="customer_notes"
              rows={5}
              placeholder="Add customer-facing notes..."
              aria-invalid={Boolean(errors.customer_notes)}
              {...register("customer_notes")}
            />
          </FormField>

          <FormField
            id="internal_notes"
            label="Internal Notes"
            error={errors.internal_notes?.message}
            description="Visible only to authorized ERP users."
          >
            <Textarea
              id="internal_notes"
              rows={5}
              placeholder="Add internal order notes..."
              aria-invalid={Boolean(errors.internal_notes)}
              {...register("internal_notes")}
            />
          </FormField>
        </FormSection>

        {submitError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {submitError}
          </div>
        ) : null}

        <FormToolbar cancelHref={SALES_ORDER_LIST_URL}>
          <SaveButton disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : mode === "create"
                ? "Create Sales Order"
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

        <FieldError
          errors={
            error
              ? [
                  {
                    message: error,
                  },
                ]
              : []
          }
        />
      </FieldContent>
    </Field>
  );
}

function formatAddressOption(
  address: SalesOrderFormOptions["addresses"][number],
): string {
  return [
    address.address_name,
    address.address_line_1,
    address.city,
    address.country,
  ]
    .filter(Boolean)
    .join(" — ");
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";
