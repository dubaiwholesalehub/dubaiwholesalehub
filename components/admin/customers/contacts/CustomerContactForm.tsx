"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  useForm,
  type SubmitHandler,
} from "react-hook-form";

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
  customerContactSchema,
  type CustomerContactFormValues,
  type CustomerContactValidatedValues,
} from "@/lib/validation/customer.schema";

interface CustomerContactFormInitialValues {
  contact_name?: string | null;
  job_title?: string | null;

  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;

  is_primary?: boolean | null;
  is_active?: boolean | null;

  notes?: string | null;
}

interface CustomerContactFormProps {
  mode: "create" | "edit";

  customerId: string;

  initialValues?: CustomerContactFormInitialValues;

  onSubmit: (
    values: CustomerContactValidatedValues,
  ) => Promise<void>;
}

function getDefaultValues(
  initialValues?: CustomerContactFormInitialValues,
): CustomerContactFormValues {
  return {
    contact_name:
      initialValues?.contact_name ?? "",

    job_title:
      initialValues?.job_title ?? "",

    email:
      initialValues?.email ?? "",

    phone:
      initialValues?.phone ?? "",

    whatsapp:
      initialValues?.whatsapp ?? "",

    is_primary:
      initialValues?.is_primary ?? false,

    is_active:
      initialValues?.is_active ?? true,

    notes:
      initialValues?.notes ?? "",
  };
}

export default function CustomerContactForm({
  mode,
  customerId,
  initialValues,
  onSubmit,
}: CustomerContactFormProps) {
  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<
    CustomerContactFormValues,
    unknown,
    CustomerContactValidatedValues
  >({
    resolver: zodResolver(
      customerContactSchema,
    ),
    defaultValues:
      getDefaultValues(initialValues),
  });

  const submitForm: SubmitHandler<
    CustomerContactValidatedValues
  > = async (values) => {
    setSubmitError(null);

    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to save the customer contact.",
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(submitForm)}
      noValidate
    >
      <FormCard
        title={
          mode === "create"
            ? "Add Customer Contact"
            : "Edit Customer Contact"
        }
        description="Add the owner, buyer, accounts person, delivery contact or another representative."
      >
        <FormSection title="Contact Information">
          <FormField
            id="contact_name"
            label="Contact Name"
            error={
              errors.contact_name?.message
            }
            required
          >
            <Input
              id="contact_name"
              placeholder="Contact person name"
              autoComplete="name"
              aria-invalid={Boolean(
                errors.contact_name,
              )}
              {...register("contact_name")}
            />
          </FormField>

          <FormField
            id="job_title"
            label="Job Title"
            error={
              errors.job_title?.message
            }
          >
            <Input
              id="job_title"
              placeholder="For example: Purchasing Manager"
              autoComplete="organization-title"
              aria-invalid={Boolean(
                errors.job_title,
              )}
              {...register("job_title")}
            />
          </FormField>

          <FormField
            id="email"
            label="Email"
            error={errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              placeholder="contact@example.com"
              autoComplete="email"
              aria-invalid={Boolean(
                errors.email,
              )}
              {...register("email")}
            />
          </FormField>

          <FormField
            id="phone"
            label="Phone"
            error={errors.phone?.message}
          >
            <Input
              id="phone"
              type="tel"
              placeholder="+971 50 000 0000"
              autoComplete="tel"
              aria-invalid={Boolean(
                errors.phone,
              )}
              {...register("phone")}
            />
          </FormField>

          <FormField
            id="whatsapp"
            label="WhatsApp"
            error={
              errors.whatsapp?.message
            }
          >
            <Input
              id="whatsapp"
              type="tel"
              placeholder="+971 50 000 0000"
              aria-invalid={Boolean(
                errors.whatsapp,
              )}
              {...register("whatsapp")}
            />
          </FormField>
        </FormSection>

        <FormSection title="Settings">
          <CheckboxField
            id="is_primary"
            label="Primary Contact"
            description="Make this the main contact for the customer. Any existing primary contact will be replaced."
            {...register("is_primary")}
          />

          <CheckboxField
            id="is_active"
            label="Active Contact"
            description="Allow this contact to be used in future customer transactions."
            {...register("is_active")}
          />
        </FormSection>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">
            Notes
          </h3>

          <FormField
            id="notes"
            label="Internal Notes"
            description="Visible only to authorized ERP users."
            error={errors.notes?.message}
          >
            <Textarea
              id="notes"
              rows={4}
              placeholder="Add notes about this contact..."
              aria-invalid={Boolean(
                errors.notes,
              )}
              {...register("notes")}
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

        <FormToolbar
          cancelHref={`/admin/customers/${customerId}`}
        >
          <SaveButton
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : mode === "create"
                ? "Add Contact"
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
          <span
            className="text-destructive"
            aria-hidden="true"
          >
            *
          </span>
        ) : null}
      </FieldLabel>

      <FieldContent>
        {children}

        {description ? (
          <FieldDescription>
            {description}
          </FieldDescription>
        ) : null}

        <FieldError
          errors={
            error
              ? [{ message: error }]
              : []
          }
        />
      </FieldContent>
    </Field>
  );
}

interface CheckboxFieldProps
  extends Omit<
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
          className="cursor-pointer text-sm font-medium"
        >
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