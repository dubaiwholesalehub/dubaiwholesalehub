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
  customerAddressSchema,
  type CustomerAddressFormValues,
  type CustomerAddressValidatedValues,
} from "@/lib/validation/customer.schema";

interface CustomerAddressFormInitialValues {
  address_type?: "billing" | "shipping" | "both" | null;

  address_name?: string | null;

  contact_name?: string | null;
  phone?: string | null;

  address_line_1?: string | null;
  address_line_2?: string | null;

  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;

  is_default?: boolean | null;
  is_active?: boolean | null;

  delivery_instructions?: string | null;
}

interface CustomerAddressFormProps {
  mode: "create" | "edit";

  customerId: string;

  initialValues?: CustomerAddressFormInitialValues;

  onSubmit: (values: CustomerAddressValidatedValues) => Promise<void>;
}

function getDefaultValues(
  initialValues?: CustomerAddressFormInitialValues,
): CustomerAddressFormValues {
  return {
    address_type: initialValues?.address_type ?? "shipping",

    address_name: initialValues?.address_name ?? "",

    contact_name: initialValues?.contact_name ?? "",

    phone: initialValues?.phone ?? "",

    address_line_1: initialValues?.address_line_1 ?? "",

    address_line_2: initialValues?.address_line_2 ?? "",

    city: initialValues?.city ?? "",

    state: initialValues?.state ?? "",

    country: initialValues?.country ?? "United Arab Emirates",

    postal_code: initialValues?.postal_code ?? "",

    is_default: initialValues?.is_default ?? false,

    is_active: initialValues?.is_active ?? true,

    delivery_instructions: initialValues?.delivery_instructions ?? "",
  };
}

export default function CustomerAddressForm({
  mode,
  customerId,
  initialValues,
  onSubmit,
}: CustomerAddressFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<
    CustomerAddressFormValues,
    unknown,
    CustomerAddressValidatedValues
  >({
    resolver: zodResolver(customerAddressSchema),
    defaultValues: getDefaultValues(initialValues),
  });

  const submitForm: SubmitHandler<CustomerAddressValidatedValues> = async (
    values,
  ) => {
    setSubmitError(null);

    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to save the customer address.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(submitForm)} noValidate>
      <FormCard
        title={
          mode === "create" ? "Add Customer Address" : "Edit Customer Address"
        }
        description="Add a billing, shipping, or combined customer address."
      >
        <FormSection title="Address Classification">
          <FormField
            id="address_type"
            label="Address Type"
            error={errors.address_type?.message}
            required
          >
            <select
              id="address_type"
              className={selectClassName}
              aria-invalid={Boolean(errors.address_type)}
              {...register("address_type")}
            >
              <option value="shipping">Shipping</option>

              <option value="billing">Billing</option>

              <option value="both">Billing & Shipping</option>
            </select>
          </FormField>

          <FormField
            id="address_name"
            label="Address Name"
            error={errors.address_name?.message}
            description="For example: Head Office, Main Shop, Warehouse."
          >
            <Input
              id="address_name"
              placeholder="Head Office"
              aria-invalid={Boolean(errors.address_name)}
              {...register("address_name")}
            />
          </FormField>
        </FormSection>

        <FormSection title="Address Details">
          <FormField
            id="address_line_1"
            label="Address Line 1"
            error={errors.address_line_1?.message}
            required
          >
            <Input
              id="address_line_1"
              placeholder="Building, street or area"
              autoComplete="address-line1"
              aria-invalid={Boolean(errors.address_line_1)}
              {...register("address_line_1")}
            />
          </FormField>

          <FormField
            id="address_line_2"
            label="Address Line 2"
            error={errors.address_line_2?.message}
          >
            <Input
              id="address_line_2"
              placeholder="Office, unit or landmark"
              autoComplete="address-line2"
              aria-invalid={Boolean(errors.address_line_2)}
              {...register("address_line_2")}
            />
          </FormField>

          <FormField id="city" label="City" error={errors.city?.message}>
            <Input
              id="city"
              placeholder="Dubai"
              autoComplete="address-level2"
              aria-invalid={Boolean(errors.city)}
              {...register("city")}
            />
          </FormField>

          <FormField
            id="state"
            label="State / Emirate"
            error={errors.state?.message}
          >
            <Input
              id="state"
              placeholder="Dubai"
              autoComplete="address-level1"
              aria-invalid={Boolean(errors.state)}
              {...register("state")}
            />
          </FormField>

          <FormField
            id="country"
            label="Country"
            error={errors.country?.message}
          >
            <Input
              id="country"
              placeholder="United Arab Emirates"
              autoComplete="country-name"
              aria-invalid={Boolean(errors.country)}
              {...register("country")}
            />
          </FormField>

          <FormField
            id="postal_code"
            label="Postal Code"
            error={errors.postal_code?.message}
          >
            <Input
              id="postal_code"
              placeholder="Postal code"
              autoComplete="postal-code"
              aria-invalid={Boolean(errors.postal_code)}
              {...register("postal_code")}
            />
          </FormField>
        </FormSection>

        <FormSection title="Delivery Contact">
          <FormField
            id="contact_name"
            label="Contact Name"
            error={errors.contact_name?.message}
          >
            <Input
              id="contact_name"
              placeholder="Delivery contact name"
              autoComplete="name"
              aria-invalid={Boolean(errors.contact_name)}
              {...register("contact_name")}
            />
          </FormField>

          <FormField id="phone" label="Phone" error={errors.phone?.message}>
            <Input
              id="phone"
              type="tel"
              placeholder="+971 50 000 0000"
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
          </FormField>
        </FormSection>

        <FormSection title="Settings">
          <CheckboxField
            id="is_default"
            label="Default Address"
            description="Use this as the customer’s default address. Any existing default address will be replaced."
            {...register("is_default")}
          />

          <CheckboxField
            id="is_active"
            label="Active Address"
            description="Allow this address to be selected in future transactions."
            {...register("is_active")}
          />
        </FormSection>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Delivery Instructions</h3>

          <FormField
            id="delivery_instructions"
            label="Instructions"
            error={errors.delivery_instructions?.message}
          >
            <Textarea
              id="delivery_instructions"
              rows={4}
              placeholder="Add delivery notes, timing or location instructions..."
              aria-invalid={Boolean(errors.delivery_instructions)}
              {...register("delivery_instructions")}
            />
          </FormField>
        </section>

        {submitError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {submitError}
          </div>
        ) : null}

        <FormToolbar cancelHref={`/admin/customers/${customerId}`}>
          <SaveButton disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : mode === "create"
                ? "Add Address"
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
  description?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function FormField({
  id,
  label,
  description,
  required = false,
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

interface CheckboxFieldProps extends Omit<
  React.ComponentProps<"input">,
  "type"
> {
  id: string;
  label: string;
  description?: string;
}

function CheckboxField({
  id,
  label,
  description,
  ...props
}: CheckboxFieldProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 rounded border-input accent-primary"
        {...props}
      />

      <div className="space-y-1">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </label>

        {description ? (
          <p className="text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";
