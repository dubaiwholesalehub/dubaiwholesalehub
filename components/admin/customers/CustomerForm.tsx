"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import FormToolbar from "@/components/admin/shared/FormToolbar";
import FormCard from "@/components/forms/FormCard";
import FormSection from "@/components/forms/FormSection";
import SaveButton from "@/components/forms/SaveButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  customerSchema,
  type CustomerFormValues,
  type CustomerValidatedValues,
} from "@/lib/validation/customer.schema";

const CUSTOMER_LIST_URL = "/admin/customers";

export interface CustomerFormInitialValues {
  customer_type?: "individual" | "business" | null;

  display_name?: string | null;
  company_name?: string | null;

  first_name?: string | null;
  last_name?: string | null;

  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;

  tax_registration_number?: string | null;

  currency_code?: string | null;

  credit_limit?: number | null;
  payment_terms_days?: number | null;

  status?: "active" | "inactive" | "blocked" | null;

  source?: "internal" | "hmshoponline" | "dubaiwholesalehub" | "import" | null;

  external_customer_id?: string | null;

  internal_notes?: string | null;
}

interface CustomerFormProps {
  mode: "create" | "edit";

  initialValues?: CustomerFormInitialValues;

  onSubmit: (values: CustomerValidatedValues) => Promise<void>;
}

function getDefaultValues(
  initialValues?: CustomerFormInitialValues,
): CustomerFormValues {
  return {
    customer_type: initialValues?.customer_type ?? "business",

    display_name: initialValues?.display_name ?? "",

    company_name: initialValues?.company_name ?? "",

    first_name: initialValues?.first_name ?? "",

    last_name: initialValues?.last_name ?? "",

    email: initialValues?.email ?? "",

    phone: initialValues?.phone ?? "",

    whatsapp: initialValues?.whatsapp ?? "",

    tax_registration_number: initialValues?.tax_registration_number ?? "",

    currency_code: initialValues?.currency_code ?? "AED",

    credit_limit: initialValues?.credit_limit ?? 0,

    payment_terms_days: initialValues?.payment_terms_days ?? 0,

    status: initialValues?.status ?? "active",

    source: initialValues?.source ?? "internal",

    external_customer_id: initialValues?.external_customer_id ?? "",

    internal_notes: initialValues?.internal_notes ?? "",
  };
}

export default function CustomerForm({
  mode,
  initialValues,
  onSubmit,
}: CustomerFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues, unknown, CustomerValidatedValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: getDefaultValues(initialValues),
  });

  const customerType = watch("customer_type");

  const customerSource = watch("source");

  const submitForm: SubmitHandler<CustomerValidatedValues> = async (values) => {
    setSubmitError(null);

    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to save the customer.",
      );
    }
  };

  const title = mode === "create" ? "Create Customer" : "Edit Customer";

  const description =
    mode === "create"
      ? "Add a retail, wholesale, export or internal customer record."
      : "Update the customer’s information, credit settings and status.";

  const saveLabel = mode === "create" ? "Create Customer" : "Save Changes";

  return (
    <form onSubmit={handleSubmit(submitForm)} noValidate className="space-y-6">
      <FormCard title={title} description={description}>
        <FormSection title="Customer Classification">
          <SelectField
            id="customer_type"
            label="Customer Type"
            error={errors.customer_type?.message}
            required
          >
            <select
              id="customer_type"
              aria-invalid={Boolean(errors.customer_type)}
              className={selectClassName}
              {...register("customer_type")}
            >
              <option value="business">Business</option>

              <option value="individual">Individual</option>
            </select>
          </SelectField>

          <TextField
            id="display_name"
            label="Display Name"
            error={errors.display_name?.message}
            required
          >
            <Input
              id="display_name"
              placeholder={
                customerType === "business"
                  ? "For example: ABC Trading LLC"
                  : "For example: Ahmed Ali"
              }
              aria-invalid={Boolean(errors.display_name)}
              autoComplete="organization"
              {...register("display_name")}
            />
          </TextField>

          {customerType === "business" ? (
            <TextField
              id="company_name"
              label="Company Name"
              error={errors.company_name?.message}
              required
            >
              <Input
                id="company_name"
                placeholder="Registered company name"
                aria-invalid={Boolean(errors.company_name)}
                autoComplete="organization"
                {...register("company_name")}
              />
            </TextField>
          ) : (
            <>
              <TextField
                id="first_name"
                label="First Name"
                error={errors.first_name?.message}
              >
                <Input
                  id="first_name"
                  placeholder="First name"
                  aria-invalid={Boolean(errors.first_name)}
                  autoComplete="given-name"
                  {...register("first_name")}
                />
              </TextField>

              <TextField
                id="last_name"
                label="Last Name"
                error={errors.last_name?.message}
              >
                <Input
                  id="last_name"
                  placeholder="Last name"
                  aria-invalid={Boolean(errors.last_name)}
                  autoComplete="family-name"
                  {...register("last_name")}
                />
              </TextField>
            </>
          )}

          <SelectField
            id="status"
            label="Status"
            error={errors.status?.message}
          >
            <select
              id="status"
              aria-invalid={Boolean(errors.status)}
              className={selectClassName}
              {...register("status")}
            >
              <option value="active">Active</option>

              <option value="inactive">Inactive</option>

              <option value="blocked">Blocked</option>
            </select>
          </SelectField>

          <SelectField
            id="source"
            label="Customer Source"
            error={errors.source?.message}
          >
            <select
              id="source"
              aria-invalid={Boolean(errors.source)}
              className={selectClassName}
              {...register("source")}
            >
              <option value="internal">Internal</option>

              <option value="hmshoponline">HMShopOnline</option>

              <option value="dubaiwholesalehub">Dubai Wholesale Hub</option>

              <option value="import">Imported</option>
            </select>
          </SelectField>

          {customerSource !== "internal" ? (
            <TextField
              id="external_customer_id"
              label="External Customer ID"
              error={errors.external_customer_id?.message}
              description="Optional customer reference from the connected website or imported system."
            >
              <Input
                id="external_customer_id"
                placeholder="External system customer ID"
                aria-invalid={Boolean(errors.external_customer_id)}
                autoComplete="off"
                {...register("external_customer_id")}
              />
            </TextField>
          ) : null}
        </FormSection>

        <FormSection title="Contact Information">
          <TextField id="email" label="Email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              placeholder="customer@example.com"
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              {...register("email")}
            />
          </TextField>

          <TextField id="phone" label="Phone" error={errors.phone?.message}>
            <Input
              id="phone"
              type="tel"
              placeholder="+971 50 000 0000"
              aria-invalid={Boolean(errors.phone)}
              autoComplete="tel"
              {...register("phone")}
            />
          </TextField>

          <TextField
            id="whatsapp"
            label="WhatsApp"
            error={errors.whatsapp?.message}
          >
            <Input
              id="whatsapp"
              type="tel"
              placeholder="+971 50 000 0000"
              aria-invalid={Boolean(errors.whatsapp)}
              autoComplete="tel"
              {...register("whatsapp")}
            />
          </TextField>

          <TextField
            id="tax_registration_number"
            label="Tax Registration Number"
            error={errors.tax_registration_number?.message}
            description="Enter the VAT TRN when applicable."
          >
            <Input
              id="tax_registration_number"
              placeholder="100XXXXXXXXX003"
              aria-invalid={Boolean(errors.tax_registration_number)}
              autoComplete="off"
              {...register("tax_registration_number")}
            />
          </TextField>
        </FormSection>

        <FormSection title="Commercial Settings">
          <TextField
            id="currency_code"
            label="Currency"
            error={errors.currency_code?.message}
            required
          >
            <Input
              id="currency_code"
              maxLength={3}
              placeholder="AED"
              aria-invalid={Boolean(errors.currency_code)}
              autoComplete="off"
              className="uppercase"
              {...register("currency_code")}
            />
          </TextField>

          <TextField
            id="credit_limit"
            label="Credit Limit"
            error={errors.credit_limit?.message}
          >
            <Input
              id="credit_limit"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              aria-invalid={Boolean(errors.credit_limit)}
              {...register("credit_limit")}
            />
          </TextField>

          <TextField
            id="payment_terms_days"
            label="Payment Terms"
            error={errors.payment_terms_days?.message}
            description="Number of days allowed before payment becomes due."
          >
            <Input
              id="payment_terms_days"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              aria-invalid={Boolean(errors.payment_terms_days)}
              {...register("payment_terms_days")}
            />
          </TextField>
        </FormSection>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Internal Notes</h3>

          <TextField
            id="internal_notes"
            label="Notes"
            error={errors.internal_notes?.message}
            description="Visible only to authorized ERP users."
          >
            <Textarea
              id="internal_notes"
              rows={5}
              placeholder="Add internal customer notes..."
              aria-invalid={Boolean(errors.internal_notes)}
              {...register("internal_notes")}
            />
          </TextField>
        </section>

        {submitError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {submitError}
          </div>
        ) : null}

        <FormToolbar cancelHref={CUSTOMER_LIST_URL}>
          <SaveButton disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : saveLabel}
          </SaveButton>
        </FormToolbar>
      </FormCard>
    </form>
  );
}

interface FieldWrapperProps {
  id: string;
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: React.ReactNode;
}

function TextField({
  id,
  label,
  required = false,
  description,
  error,
  children,
}: FieldWrapperProps) {
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

function SelectField({
  id,
  label,
  required = false,
  description,
  error,
  children,
}: FieldWrapperProps) {
  return (
    <TextField
      id={id}
      label={label}
      required={required}
      description={description}
      error={error}
    >
      {children}
    </TextField>
  );
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";
