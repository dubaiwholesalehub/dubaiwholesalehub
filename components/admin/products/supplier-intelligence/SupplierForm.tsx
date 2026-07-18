"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  CircleDollarSign,
  FileText,
  Loader2,
  Package,
  Save,
  Truck,
} from "lucide-react";

import {
  createProductSupplierAction,
  updateProductSupplierAction,
} from "@/app/admin/(protected)/products/supplier-actions";
import type {
  ProductSupplierMapping,
  ProductSupplierOption,
} from "@/lib/repositories/product-supplier.repository";

import SupplierCombobox from "./SupplierCombobox";
import { toast } from "sonner";
import type {
  SupplierActionResult,
  SupplierFormMode,
} from "./types";

type SupplierFormProps = {
  productId: string;
  suppliers: ProductSupplierOption[];
  mode?: SupplierFormMode;
  mapping?: ProductSupplierMapping;
  onSuccess?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
};

const initialResult: SupplierActionResult = {
  success: false,
  message: "",
};

export default function SupplierForm({
  productId,
  suppliers,
  mode = "create",
  mapping,
  onSuccess,
  onDirtyChange,
}: SupplierFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);
    const initialSnapshotRef = useRef("");
    const snapshotReadyRef = useRef(false);
  const [formState, setFormState] =
    useState<SupplierActionResult>(
      initialResult,
    );

  const [isPending, startTransition] =
    useTransition();

    const createFormSnapshot = useCallback(
  (form: HTMLFormElement) => {
    const formData = new FormData(form);

    return Array.from(formData.entries())
      .map(([key, value]) => [
        key,
        typeof value === "string"
          ? value
          : value.name,
      ])
      .sort(([firstKey, firstValue], [secondKey, secondValue]) => {
        return `${firstKey}:${firstValue}`.localeCompare(
          `${secondKey}:${secondValue}`,
        );
      })
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
  },
  [],
);

const updateDirtyState = useCallback(() => {
  const form = formRef.current;

  if (!form || !snapshotReadyRef.current) {
    return;
  }

  const currentSnapshot =
    createFormSnapshot(form);

  onDirtyChange?.(
    currentSnapshot !==
      initialSnapshotRef.current,
  );
}, [createFormSnapshot, onDirtyChange]);

useEffect(() => {
  const form = formRef.current;

  if (!form) {
    return;
  }

  const frame = window.requestAnimationFrame(() => {
    initialSnapshotRef.current =
      createFormSnapshot(form);

    snapshotReadyRef.current = true;
    onDirtyChange?.(false);
  });

  return () => {
    window.cancelAnimationFrame(frame);
  };
}, [createFormSnapshot, onDirtyChange]);

  const fieldError = (name: string) =>
    formState.fieldErrors?.[name]?.[0];

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormState(initialResult);

    const formData = new FormData(
      event.currentTarget,
    );

    startTransition(async () => {
      const response =
        mode === "edit"
          ? await updateProductSupplierAction(
              formData,
            )
          : await createProductSupplierAction(
              formData,
            );

      if (!response.success) {
        setFormState(response);

        toast.error(
          response.message ||
            "Unable to save supplier.",
        );

        return;
      }

      setFormState(initialResult);

      toast.success(
        response.message ||
          (mode === "edit"
            ? "Supplier updated successfully."
            : "Supplier added successfully."),
      );
      onDirtyChange?.(false);
      snapshotReadyRef.current = false;
      if (mode === "create") {
        formRef.current?.reset();
      }

      onSuccess?.();
    });
  }

  return (
    <form
  ref={formRef}
  onSubmit={handleSubmit}
  onInput={updateDirtyState}
  onChange={updateDirtyState}
  className="space-y-8"
>
      <input
        type="hidden"
        name="productId"
        value={productId}
      />

      {mapping ? (
        <input
          type="hidden"
          name="mappingId"
          value={mapping.id}
        />
      ) : null}

      <FormSection
        icon={Package}
        title="Supplier"
        description="Select the source and enter its product reference."
      >
        <Field
          label="Supplier"
          required
          error={fieldError("supplierId")}
        >
          <SupplierCombobox
            suppliers={suppliers}
            defaultValue={
              mapping?.supplier_id ?? ""
            }
            disabled={mode === "edit"}
            error={fieldError("supplierId")}
          />
        </Field>

        <Field
          label="Supplier SKU"
          error={fieldError("supplierSku")}
        >
          <input
            name="supplierSku"
            defaultValue={
              mapping?.supplier_sku ?? ""
            }
            maxLength={150}
            placeholder="Supplier product code"
            className={inputClass(
              Boolean(
                fieldError("supplierSku"),
              ),
            )}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <CheckboxField
            name="isPreferred"
            label="Preferred supplier"
            description="Use this supplier as the default source."
            defaultChecked={
              mapping?.is_preferred ?? false
            }
          />

          <CheckboxField
            name="isActive"
            label="Active mapping"
            description="Allow this supplier to be used."
            defaultChecked={
              mapping?.is_active ?? true
            }
          />
        </div>
      </FormSection>

      <FormSection
        icon={CircleDollarSign}
        title="Pricing"
        description="Record current and historical purchase prices."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Cost Price"
            error={fieldError("costPrice")}
          >
            <input
              type="number"
              name="costPrice"
              step="0.01"
              min="0"
              defaultValue={
                mapping?.cost_price ?? ""
              }
              placeholder="0.00"
              className={inputClass(
                Boolean(
                  fieldError("costPrice"),
                ),
              )}
            />
          </Field>

          <Field
            label="Currency"
            required
            error={fieldError(
              "currencyCode",
            )}
          >
            <input
              name="currencyCode"
              defaultValue={
                mapping?.currency_code ??
                "AED"
              }
              maxLength={3}
              placeholder="AED"
              className={inputClass(
                Boolean(
                  fieldError("currencyCode"),
                ),
              )}
            />
          </Field>

          <Field
            label="Last Purchase Price"
            error={fieldError(
              "lastPurchasePrice",
            )}
          >
            <input
              type="number"
              name="lastPurchasePrice"
              step="0.01"
              min="0"
              defaultValue={
                mapping?.last_purchase_price ??
                ""
              }
              placeholder="0.00"
              className={inputClass(
                Boolean(
                  fieldError(
                    "lastPurchasePrice",
                  ),
                ),
              )}
            />
          </Field>

          <Field
            label="Priority"
            error={fieldError("priority")}
          >
            <input
              type="number"
              name="priority"
              min="0"
              max="10000"
              defaultValue={
                mapping?.priority ?? 0
              }
              className={inputClass(
                Boolean(
                  fieldError("priority"),
                ),
              )}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        icon={Truck}
        title="Logistics"
        description="Capture quantities, timing and shipment information."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="MOQ"
            error={fieldError("moq")}
          >
            <input
              type="number"
              name="moq"
              min="1"
              step="1"
              defaultValue={mapping?.moq ?? ""}
              placeholder="Minimum quantity"
              className={inputClass(
                Boolean(fieldError("moq")),
              )}
            />
          </Field>

          <Field
            label="Lead Time in Days"
            error={fieldError(
              "leadTimeDays",
            )}
          >
            <input
              type="number"
              name="leadTimeDays"
              min="0"
              step="1"
              defaultValue={
                mapping?.lead_time_days ?? ""
              }
              placeholder="Example: 7"
              className={inputClass(
                Boolean(
                  fieldError("leadTimeDays"),
                ),
              )}
            />
          </Field>

          <Field
            label="Lead-Time Description"
            error={fieldError("leadTime")}
          >
            <input
              name="leadTime"
              defaultValue={
                mapping?.lead_time ?? ""
              }
              maxLength={150}
              placeholder="Ready stock, 7–10 days..."
              className={inputClass(
                Boolean(
                  fieldError("leadTime"),
                ),
              )}
            />
          </Field>

          <Field
            label="Loading Port"
            error={fieldError(
              "loadingPort",
            )}
          >
            <input
              name="loadingPort"
              defaultValue={
                mapping?.loading_port ?? ""
              }
              maxLength={150}
              placeholder="Jebel Ali, Ningbo..."
              className={inputClass(
                Boolean(
                  fieldError("loadingPort"),
                ),
              )}
            />
          </Field>
        </div>

        <Field
          label="Packaging"
          error={fieldError("packaging")}
        >
          <textarea
            name="packaging"
            defaultValue={
              mapping?.packaging ?? ""
            }
            maxLength={500}
            rows={3}
            placeholder="Carton quantity, dimensions, weight and packing details"
            className={textareaClass(
              Boolean(
                fieldError("packaging"),
              ),
            )}
          />
        </Field>
      </FormSection>

      <FormSection
        icon={FileText}
        title="Commercial Terms"
        description="Store payment, delivery and internal sourcing information."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Incoterm"
            error={fieldError("incoterm")}
          >
            <select
              name="incoterm"
              defaultValue={
                mapping?.incoterm ?? ""
              }
              className={inputClass(
                Boolean(
                  fieldError("incoterm"),
                ),
              )}
            >
              <option value="">
                Select incoterm
              </option>
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
          </Field>

          <Field
            label="Payment Terms"
            error={fieldError(
              "paymentTerms",
            )}
          >
            <input
              name="paymentTerms"
              defaultValue={
                mapping?.payment_terms ?? ""
              }
              maxLength={500}
              placeholder="Cash, 30 days, 50% advance..."
              className={inputClass(
                Boolean(
                  fieldError("paymentTerms"),
                ),
              )}
            />
          </Field>
        </div>

        <Field
          label="Internal Notes"
          error={fieldError("notes")}
        >
          <textarea
            name="notes"
            defaultValue={
              mapping?.notes ?? ""
            }
            maxLength={2000}
            rows={5}
            placeholder="Negotiation history, quality details, contact preferences..."
            className={textareaClass(
              Boolean(fieldError("notes")),
            )}
          />
        </Field>
      </FormSection>

      

      <div className="sticky bottom-0 -mx-6 flex justify-end border-t border-slate-200 bg-white px-6 py-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}

          {isPending
            ? "Saving..."
            : mode === "edit"
              ? "Update Supplier"
              : "Add Supplier"}
        </button>
      </div>
    </form>
  );
}

type FormSectionProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
};

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <section className="space-y-5">
      <div className="flex gap-3">
        <div className="rounded-xl bg-slate-100 p-2.5">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>

        <div>
          <h3 className="font-bold text-slate-950">
            {title}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
}

type FieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
};

function Field({
  label,
  required,
  error,
  children,
}: FieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required ? (
          <span className="ml-1 text-red-500">
            *
          </span>
        ) : null}
      </span>

      {children}

      {error ? (
        <span className="block text-sm text-red-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}

type CheckboxFieldProps = {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
};

function CheckboxField({
  name,
  label,
  description,
  defaultChecked,
}: CheckboxFieldProps) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 rounded border-slate-300"
      />

      <span>
        <span className="block text-sm font-semibold text-slate-800">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}

function inputClass(hasError: boolean) {
  return [
    "h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none transition placeholder:text-slate-400",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100",
  ].join(" ");
}

function textareaClass(hasError: boolean) {
  return [
    "w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100",
  ].join(" ");
}