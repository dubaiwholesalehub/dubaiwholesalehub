"use client";

import Link from "next/link";
import { useState } from "react";

import {
  type RfqDraftItem,
  type RfqProductOption,
  type RfqUnitOption,
} from "@/components/admin/rfqs/items/types";

import { RfqItemsStep } from "@/components/admin/rfqs/items/rfq-items-step";
import { RfqSuppliersStep } from "@/components/admin/rfqs/suppliers/rfq-suppliers-step";

import type {
  RfqSelectedSupplier,
  RfqSupplierCountryOption,
  RfqSupplierOption,
} from "@/components/admin/rfqs/suppliers/types";

import {
  RfqReviewStep,
  type RfqReviewDetails,
} from "@/components/admin/rfqs/review/rfq-review-step";

import { useRouter } from "next/navigation";

import { createRfqAction } from "@/lib/actions/rfq/create-rfq";
import type { CreateRfqPayload } from "@/lib/repositories/rfq/rfq-create.repository";

interface CreateRfqWizardProps {
  products: RfqProductOption[];
  units: RfqUnitOption[];
  suppliers: RfqSupplierOption[];
  supplierCountries: RfqSupplierCountryOption[];
}

type WizardStep =
  | "details"
  | "items"
  | "suppliers"
  | "review";

interface RfqDetailsForm {
  title: string;
  description: string;
  priority: "low" | "normal" | "high" | "urgent";
  currencyCode: string;
  responseDeadline: string;
  requiredDeliveryDate: string;
  deliveryLocation: string;
  incoterm: string;
  paymentTerms: string;
  packagingRequirements: string;
  supplierNotes: string;
  internalNotes: string;
}

interface FormErrors {
  title?: string;
  currencyCode?: string;
  responseDeadline?: string;
}

const wizardSteps: Array<{
  key: WizardStep;
  number: number;
  title: string;
  description: string;
}> = [
    {
      key: "details",
      number: 1,
      title: "RFQ Details",
      description: "General information",
    },
    {
      key: "items",
      number: 2,
      title: "Add Items",
      description: "Products and quantities",
    },
    {
      key: "suppliers",
      number: 3,
      title: "Invite Suppliers",
      description: "Select recipients",
    },
    {
      key: "review",
      number: 4,
      title: "Review",
      description: "Confirm and create",
    },
  ];

const initialForm: RfqDetailsForm = {
  title: "",
  description: "",
  priority: "normal",
  currencyCode: "AED",
  responseDeadline: "",
  requiredDeliveryDate: "",
  deliveryLocation: "Dubai, United Arab Emirates",
  incoterm: "",
  paymentTerms: "",
  packagingRequirements: "",
  supplierNotes: "",
  internalNotes: "",
};

export function CreateRfqWizard({
  products,
  units,
  suppliers,
  supplierCountries,
}: CreateRfqWizardProps) {
  const [activeStep, setActiveStep] =
    useState<WizardStep>("details");

  const router = useRouter();

  const [createError, setCreateError] =
    useState<string | null>(null);

  const [isCreating, setIsCreating] =
    useState(false);
  const [form, setForm] =
    useState<RfqDetailsForm>(initialForm);

  const [items, setItems] = useState<RfqDraftItem[]>([]);

  const [selectedSuppliers, setSelectedSuppliers] =
    useState<RfqSelectedSupplier[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});

  function buildCreateRfqPayload(): {
    rfq: CreateRfqPayload["rfq"];
    items: CreateRfqPayload["items"];
    suppliers: CreateRfqPayload["suppliers"];
  } {
    const currencyCode =
      form.currencyCode.trim().toUpperCase();

    const rfq: CreateRfqPayload["rfq"] = {
      title: form.title.trim(),

      description:
        form.description.trim() || null,

      priority: form.priority,

      currency_code: currencyCode,

      response_deadline:
        form.responseDeadline || null,

      required_delivery_date:
        form.requiredDeliveryDate || null,

      delivery_location:
        form.deliveryLocation.trim() || null,

      incoterm:
        form.incoterm.trim() || null,
    };

    const itemPayload =
      items.map((item) => ({
        product_id:
          item.productId || null,

        item_name:
          item.itemName.trim(),

        item_description:
          item.itemDescription?.trim() || null,

        product_sku:
          item.productSku?.trim() || null,

        requested_quantity:
          item.requestedQuantity,

        unit_id:
          item.unitId || null,

        target_unit_price:
          item.targetUnitPrice,

        target_currency_code:
          item.targetUnitPrice !== null
            ? currencyCode
            : null,

        target_delivery_date:
          item.targetDeliveryDate || null,

        specifications:
          item.specifications?.trim() || null,

        packaging_requirements:
          item.packagingRequirements?.trim() ||
          null,

        notes:
          item.notes?.trim() || null,
      })) satisfies CreateRfqPayload["items"];

    const supplierPayload =
      selectedSuppliers.map((supplier) => ({
        supplier_id:
          supplier.supplierId,

        contact_name:
          supplier.contactName?.trim() || null,

        contact_email:
          supplier.email?.trim() || null,

        contact_phone:
          supplier.phone?.trim() || null,

        contact_whatsapp:
          supplier.whatsapp?.trim() || null,
      })) satisfies CreateRfqPayload["suppliers"];

    return {
      rfq,
      items: itemPayload,
      suppliers: supplierPayload,
    };
  }

  async function handleCreateRfq() {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const payload = buildCreateRfqPayload();

      console.log("Starting RFQ creation");

      const result = await createRfqAction(payload);

      console.log("RFQ creation result:", result);

      if (!result.success) {
        setCreateError(
          result.message || "Unable to create RFQ.",
        );
        return;
      }

      window.location.assign("/admin/rfqs");
    } catch (error) {
      console.error("Create RFQ error:", error);

      setCreateError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while creating the RFQ.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function updateField<K extends keyof RfqDetailsForm>(
    field: K,
    value: RfqDetailsForm[K],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    if (
      field === "title" ||
      field === "currencyCode" ||
      field === "responseDeadline"
    ) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined,
      }));
    }
  }
  function validateDetails() {
    const nextErrors: FormErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "RFQ title is required.";
    }

    if (!form.currencyCode.trim()) {
      nextErrors.currencyCode =
        "Currency is required.";
    }

    if (!form.responseDeadline) {
      nextErrors.responseDeadline =
        "Response deadline is required.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function continueToItems() {
    if (!validateDetails()) {
      return;
    }

    setActiveStep("items");
  }
  const reviewDetails: RfqReviewDetails = {
    title: form.title,
    priority: form.priority,
    currencyCode: form.currencyCode,
    responseDeadline: form.responseDeadline,
    requiredDeliveryDate:
      form.requiredDeliveryDate,
    deliveryLocation: form.deliveryLocation,
    incoterm: form.incoterm,
    description: form.description,
  };
  return (
    <div className="space-y-6">
      <WizardProgress activeStep={activeStep} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-lg border bg-card">
          {activeStep === "details" ? (
            <RfqDetailsStep
              form={form}
              errors={errors}
              onUpdate={updateField}
              onContinue={continueToItems}
            />
          ) : null}

          {activeStep === "items" ? (
            <RfqItemsStep
              products={products}
              units={units}
              currencyCode={form.currencyCode}
              items={items}
              onItemsChange={setItems}
              onBack={() => setActiveStep("details")}
              onContinue={() => setActiveStep("suppliers")}
            />
          ) : null}

          {activeStep === "suppliers" ? (
            <RfqSuppliersStep
              suppliers={suppliers}
              countries={supplierCountries}
              selectedSuppliers={selectedSuppliers}
              onSelectedSuppliersChange={
                setSelectedSuppliers
              }
              onBack={() => setActiveStep("items")}
              onContinue={() => {
                setCreateError(null);
                setActiveStep("review");
              }}
            />
          ) : null}
          {activeStep === "review" ? (
            <RfqReviewStep
              details={reviewDetails}
              items={items}
              selectedSuppliers={selectedSuppliers}
              onBack={() => {
                setCreateError(null);
                setActiveStep("suppliers");
              }}
              onCreate={handleCreateRfq}
              isCreating={isCreating}
              createError={createError}
            />
          ) : null}
        </section>

        <RfqDraftSummary
          form={form}
          items={items}
        />
      </div>
    </div>
  );
}

interface WizardProgressProps {
  activeStep: WizardStep;
}

function WizardProgress({
  activeStep,
}: WizardProgressProps) {
  const activeIndex = wizardSteps.findIndex(
    (step) => step.key === activeStep,
  );

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="grid md:grid-cols-4">
        {wizardSteps.map((step, index) => {
          const isActive = step.key === activeStep;
          const isComplete = index < activeIndex;

          return (
            <div
              key={step.key}
              className={`relative flex gap-3 border-b p-4 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0 ${isActive ? "bg-primary/5" : ""
                }`}
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : isComplete
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-background text-muted-foreground"
                  }`}
              >
                {isComplete ? "✓" : step.number}
              </div>

              <div className="min-w-0">
                <p
                  className={`text-sm font-medium ${isActive
                    ? "text-foreground"
                    : "text-muted-foreground"
                    }`}
                >
                  {step.title}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface RfqDetailsStepProps {
  form: RfqDetailsForm;
  errors: FormErrors;
  onUpdate: <K extends keyof RfqDetailsForm>(
    field: K,
    value: RfqDetailsForm[K],
  ) => void;
  onContinue: () => void;
}

function RfqDetailsStep({
  form,
  errors,
  onUpdate,
  onContinue,
}: RfqDetailsStepProps) {
  return (
    <>
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">
          RFQ details
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Enter the main information for this request for
          quotation.
        </p>
      </div>

      <div className="space-y-8 p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <FieldGroup
            label="RFQ title"
            htmlFor="title"
            required
            error={errors.title}
            className="lg:col-span-2"
          >
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(event) =>
                onUpdate("title", event.target.value)
              }
              placeholder="Example: Household products procurement – July 2026"
              className={getInputClasses(
                Boolean(errors.title),
              )}
            />
          </FieldGroup>

          <FieldGroup
            label="Description"
            htmlFor="description"
            className="lg:col-span-2"
          >
            <textarea
              id="description"
              value={form.description}
              onChange={(event) =>
                onUpdate(
                  "description",
                  event.target.value,
                )
              }
              rows={4}
              placeholder="Explain the purpose and scope of this RFQ."
              className={getInputClasses(false)}
            />
          </FieldGroup>

          <FieldGroup
            label="Priority"
            htmlFor="priority"
          >
            <select
              id="priority"
              value={form.priority}
              onChange={(event) =>
                onUpdate(
                  "priority",
                  event.target
                    .value as RfqDetailsForm["priority"],
                )
              }
              className={getInputClasses(false)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </FieldGroup>

          <FieldGroup
            label="Currency"
            htmlFor="currencyCode"
            required
            error={errors.currencyCode}
          >
            <select
              id="currencyCode"
              value={form.currencyCode}
              onChange={(event) =>
                onUpdate(
                  "currencyCode",
                  event.target.value,
                )
              }
              className={getInputClasses(
                Boolean(errors.currencyCode),
              )}
            >
              <option value="AED">AED — UAE Dirham</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">
                GBP — British Pound
              </option>
              <option value="SAR">
                SAR — Saudi Riyal
              </option>
              <option value="INR">
                INR — Indian Rupee
              </option>
            </select>
          </FieldGroup>

          <FieldGroup
            label="Response deadline"
            htmlFor="responseDeadline"
            required
            error={errors.responseDeadline}
          >
            <input
              id="responseDeadline"
              type="datetime-local"
              value={form.responseDeadline}
              onChange={(event) =>
                onUpdate(
                  "responseDeadline",
                  event.target.value,
                )
              }
              className={getInputClasses(
                Boolean(errors.responseDeadline),
              )}
            />
          </FieldGroup>

          <FieldGroup
            label="Required delivery date"
            htmlFor="requiredDeliveryDate"
          >
            <input
              id="requiredDeliveryDate"
              type="date"
              value={form.requiredDeliveryDate}
              onChange={(event) =>
                onUpdate(
                  "requiredDeliveryDate",
                  event.target.value,
                )
              }
              className={getInputClasses(false)}
            />
          </FieldGroup>

          <FieldGroup
            label="Delivery location"
            htmlFor="deliveryLocation"
            className="lg:col-span-2"
          >
            <input
              id="deliveryLocation"
              type="text"
              value={form.deliveryLocation}
              onChange={(event) =>
                onUpdate(
                  "deliveryLocation",
                  event.target.value,
                )
              }
              placeholder="Dubai, United Arab Emirates"
              className={getInputClasses(false)}
            />
          </FieldGroup>

          <FieldGroup
            label="Incoterm"
            htmlFor="incoterm"
          >
            <select
              id="incoterm"
              value={form.incoterm}
              onChange={(event) =>
                onUpdate(
                  "incoterm",
                  event.target.value,
                )
              }
              className={getInputClasses(false)}
            >
              <option value="">Select incoterm</option>
              <option value="EXW">EXW</option>
              <option value="FCA">FCA</option>
              <option value="FOB">FOB</option>
              <option value="CFR">CFR</option>
              <option value="CIF">CIF</option>
              <option value="CPT">CPT</option>
              <option value="CIP">CIP</option>
              <option value="DAP">DAP</option>
              <option value="DPU">DPU</option>
              <option value="DDP">DDP</option>
            </select>
          </FieldGroup>

          <FieldGroup
            label="Payment terms"
            htmlFor="paymentTerms"
          >
            <input
              id="paymentTerms"
              type="text"
              value={form.paymentTerms}
              onChange={(event) =>
                onUpdate(
                  "paymentTerms",
                  event.target.value,
                )
              }
              placeholder="Example: 30% advance, 70% before shipment"
              className={getInputClasses(false)}
            />
          </FieldGroup>

          <FieldGroup
            label="Packaging requirements"
            htmlFor="packagingRequirements"
            className="lg:col-span-2"
          >
            <textarea
              id="packagingRequirements"
              value={form.packagingRequirements}
              onChange={(event) =>
                onUpdate(
                  "packagingRequirements",
                  event.target.value,
                )
              }
              rows={3}
              placeholder="Carton specifications, labels, pallet requirements or export packaging."
              className={getInputClasses(false)}
            />
          </FieldGroup>

          <FieldGroup
            label="Supplier notes"
            htmlFor="supplierNotes"
            className="lg:col-span-2"
          >
            <textarea
              id="supplierNotes"
              value={form.supplierNotes}
              onChange={(event) =>
                onUpdate(
                  "supplierNotes",
                  event.target.value,
                )
              }
              rows={3}
              placeholder="Instructions that invited suppliers will be allowed to see."
              className={getInputClasses(false)}
            />
          </FieldGroup>

          <FieldGroup
            label="Internal notes"
            htmlFor="internalNotes"
            className="lg:col-span-2"
          >
            <textarea
              id="internalNotes"
              value={form.internalNotes}
              onChange={(event) =>
                onUpdate(
                  "internalNotes",
                  event.target.value,
                )
              }
              rows={3}
              placeholder="Private notes for your internal procurement team."
              className={getInputClasses(false)}
            />
          </FieldGroup>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/rfqs"
          className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Cancel
        </Link>

        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Continue to items
        </button>
      </div>
    </>
  );
}

interface FieldGroupProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

function FieldGroup({
  label,
  htmlFor,
  required = false,
  error,
  className,
  children,
}: FieldGroupProps) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium"
      >
        {label}

        {required ? (
          <span className="ml-1 text-destructive">
            *
          </span>
        ) : null}
      </label>

      {children}

      {error ? (
        <p className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function getInputClasses(hasError: boolean) {
  return [
    "min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
    "outline-none transition-colors",
    "placeholder:text-muted-foreground",
    "focus:border-primary focus:ring-2 focus:ring-primary/15",
    "disabled:cursor-not-allowed disabled:opacity-50",
    hasError
      ? "border-destructive focus:border-destructive focus:ring-destructive/15"
      : "border-input",
  ].join(" ");
}

interface PlaceholderStepProps {
  title: string;
  description: string;
  backLabel: string;
  continueLabel: string;
  onBack: () => void;
  onContinue: () => void;
}

function PlaceholderStep({
  title,
  description,
  backLabel,
  continueLabel,
  onBack,
  onContinue,
}: PlaceholderStepProps) {
  return (
    <>
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">
          {title}
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="flex min-h-80 items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border bg-muted text-lg font-semibold">
            …
          </div>

          <h3 className="mt-4 font-medium">
            This step is ready for implementation
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            We will build this section incrementally after
            validating the wizard foundation.
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          {backLabel}
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {continueLabel}
        </button>
      </div>
    </>
  );
}

interface ReviewPlaceholderProps {
  form: RfqDetailsForm;
  onBack: () => void;
}

function ReviewPlaceholder({
  form,
  onBack,
}: ReviewPlaceholderProps) {
  return (
    <>
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">
          Review RFQ
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Review the request before creating it.
        </p>
      </div>

      <div className="space-y-4 p-6">
        <ReviewRow
          label="Title"
          value={form.title || "Not entered"}
        />

        <ReviewRow
          label="Priority"
          value={form.priority}
        />

        <ReviewRow
          label="Currency"
          value={form.currencyCode}
        />

        <ReviewRow
          label="Response deadline"
          value={
            form.responseDeadline || "Not selected"
          }
        />

        <ReviewRow
          label="Delivery location"
          value={
            form.deliveryLocation || "Not entered"
          }
        />

        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Database creation will be connected after the
            Items and Suppliers steps are implemented.
          </p>
        </div>
      </div>

      <div className="flex border-t bg-muted/20 px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Back to suppliers
        </button>
      </div>
    </>
  );
}

interface ReviewRowProps {
  label: string;
  value: string;
}

function ReviewRow({
  label,
  value,
}: ReviewRowProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="text-sm font-medium capitalize">
        {value}
      </span>
    </div>
  );
}

interface RfqDraftSummaryProps {
  form: RfqDetailsForm;
  items: RfqDraftItem[];
}

function RfqDraftSummary({
  form,
  items,
}: RfqDraftSummaryProps) {
  return (
    <aside className="h-fit rounded-lg border bg-card xl:sticky xl:top-6">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">Draft summary</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Live preview of the current RFQ.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <SummaryItem
          label="Title"
          value={form.title || "Not entered"}
        />

        <SummaryItem
          label="Priority"
          value={formatLabel(form.priority)}
        />

        <SummaryItem
          label="Currency"
          value={form.currencyCode}
        />

        <SummaryItem
          label="Response deadline"
          value={
            form.responseDeadline
              ? formatLocalDateTime(
                form.responseDeadline,
              )
              : "Not selected"
          }
        />

        <SummaryItem
          label="Required delivery"
          value={
            form.requiredDeliveryDate
              ? formatLocalDate(
                form.requiredDeliveryDate,
              )
              : "Not selected"
          }
        />

        <SummaryItem
          label="Delivery location"
          value={
            form.deliveryLocation || "Not entered"
          }
        />

        <SummaryItem
          label="Incoterm"
          value={form.incoterm || "Not selected"}
        />

        <div className="grid grid-cols-2 gap-3 border-t pt-5">
          <div className="rounded-md border bg-background p-3 text-center">
            <p className="text-xl font-semibold">
              {items.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Items
            </p>
          </div>

          <div className="rounded-md border bg-background p-3 text-center">
            <p className="text-xl font-semibold">0</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Suppliers
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

interface SummaryItemProps {
  label: string;
  value: string;
}

function SummaryItem({
  label,
  value,
}: SummaryItemProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium">
        {value}
      </p>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function formatLocalDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatLocalDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}