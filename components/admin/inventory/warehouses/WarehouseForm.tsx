"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import FormCard from "@/components/forms/FormCard";
import FormSection from "@/components/forms/FormSection";
import SaveButton from "@/components/forms/SaveButton";
import { Input } from "@/components/ui/input";
import {
  WarehouseFormValues,
  WarehouseValidatedValues,
  warehouseSchema,
} from "@/lib/validation/warehouse.schema";
import FormToolbar from "@/components/admin/shared/FormToolbar";

const WAREHOUSE_LIST_URL = "/admin/inventory/warehouses";

export interface WarehouseFormInitialValues {
  code?: string | null;
  name?: string | null;

  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;

  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;

  is_active?: boolean | null;
  is_default?: boolean | null;
}

export interface WarehouseFormProps {
  mode: "create" | "edit";
  initialValues?: WarehouseFormInitialValues;
  onSubmit: (values: WarehouseValidatedValues) => Promise<void>;
}

function getDefaultValues(
  initialValues?: WarehouseFormInitialValues,
): WarehouseFormValues {
  return {
    code: initialValues?.code ?? "",
    name: initialValues?.name ?? "",

    address_line_1: initialValues?.address_line_1 ?? "",

    address_line_2: initialValues?.address_line_2 ?? "",

    city: initialValues?.city ?? "",
    state: initialValues?.state ?? "",
    country: initialValues?.country ?? "",

    postal_code: initialValues?.postal_code ?? "",

    contact_person: initialValues?.contact_person ?? "",

    phone: initialValues?.phone ?? "",
    email: initialValues?.email ?? "",

    is_active: initialValues?.is_active ?? true,

    is_default: initialValues?.is_default ?? false,
  };
}

export default function WarehouseForm({
  mode,
  initialValues,
  onSubmit,
}: WarehouseFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WarehouseFormValues, unknown, WarehouseValidatedValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: getDefaultValues(initialValues),
  });

  const submitForm: SubmitHandler<WarehouseValidatedValues> = async (
    values,
  ) => {
    setSubmitError(null);

    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to save the warehouse.",
      );
    }
  };

  const title = mode === "create" ? "Create Warehouse" : "Edit Warehouse";

  const description =
    mode === "create"
      ? "Add a warehouse for inventory storage and stock operations."
      : "Update the warehouse information and operational settings.";

  const saveLabel = mode === "create" ? "Create Warehouse" : "Save Changes";

  return (
    <form onSubmit={handleSubmit(submitForm)} noValidate className="space-y-6">
      <FormCard title={title} description={description}>
        <FormSection title="Warehouse Information">
          <FormField
            id="code"
            label="Warehouse Code"
            error={errors.code?.message}
            required
          >
            <Input
              id="code"
              placeholder="For example: WH-DXB-01"
              aria-invalid={Boolean(errors.code)}
              autoComplete="off"
              {...register("code")}
            />
          </FormField>

          <FormField
            id="name"
            label="Warehouse Name"
            error={errors.name?.message}
            required
          >
            <Input
              id="name"
              placeholder="For example: Dubai Main Warehouse"
              aria-invalid={Boolean(errors.name)}
              autoComplete="organization"
              {...register("name")}
            />
          </FormField>

          <FormField
            id="contact_person"
            label="Contact Person"
            error={errors.contact_person?.message}
          >
            <Input
              id="contact_person"
              placeholder="Contact person name"
              aria-invalid={Boolean(errors.contact_person)}
              autoComplete="name"
              {...register("contact_person")}
            />
          </FormField>

          <FormField id="phone" label="Phone" error={errors.phone?.message}>
            <Input
              id="phone"
              type="tel"
              placeholder="+971 50 000 0000"
              aria-invalid={Boolean(errors.phone)}
              autoComplete="tel"
              {...register("phone")}
            />
          </FormField>

          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              placeholder="warehouse@example.com"
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              {...register("email")}
            />
          </FormField>
        </FormSection>

        <FormSection title="Address">
          <FormField
            id="address_line_1"
            label="Address Line 1"
            error={errors.address_line_1?.message}
          >
            <Input
              id="address_line_1"
              placeholder="Building, street or area"
              aria-invalid={Boolean(errors.address_line_1)}
              autoComplete="address-line1"
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
              aria-invalid={Boolean(errors.address_line_2)}
              autoComplete="address-line2"
              {...register("address_line_2")}
            />
          </FormField>

          <FormField id="city" label="City" error={errors.city?.message}>
            <Input
              id="city"
              placeholder="Dubai"
              aria-invalid={Boolean(errors.city)}
              autoComplete="address-level2"
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
              aria-invalid={Boolean(errors.state)}
              autoComplete="address-level1"
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
              aria-invalid={Boolean(errors.country)}
              autoComplete="country-name"
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
              aria-invalid={Boolean(errors.postal_code)}
              autoComplete="postal-code"
              {...register("postal_code")}
            />
          </FormField>
        </FormSection>

        <FormSection title="Settings">
          <CheckboxField
            id="is_active"
            label="Active Warehouse"
            description="Allow this warehouse to be used in inventory transactions."
            disabled={isSubmitting}
            {...register("is_active")}
          />

          <CheckboxField
            id="is_default"
            label="Default Warehouse"
            description="Use this warehouse as the default selection where applicable."
            disabled={isSubmitting}
            {...register("is_default")}
          />
        </FormSection>

        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {submitError}
          </div>
        )}

        <FormToolbar cancelHref={WAREHOUSE_LIST_URL}>
          <SaveButton disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : saveLabel}
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
  error?: string;
  children: React.ReactNode;
}

function FormField({
  id,
  label,
  required = false,
  error,
  children,
}: FormFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium leading-none">
        {label}

        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
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
        <label
          htmlFor={id}
          className="cursor-pointer text-sm font-medium leading-none"
        >
          {label}
        </label>

        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
