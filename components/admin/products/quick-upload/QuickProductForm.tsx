"use client";

import { useMemo, useState, useTransition } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  Box,
  FileText,
  ImagePlus,
  Package,
  Save,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { toast } from "sonner";

import { createQuickProduct } from "@/app/admin/(protected)/products/quick-upload-actions";

import type { ProductFormOptions } from "@/components/admin/products/product-types";

import type { ProductSupplierOption } from "@/lib/repositories/product-supplier.repository";
import {
  formatImageSize,
  optimizeProductImage,
} from "@/components/admin/products/quick-upload/image-optimizer";

interface QuickProductFormProps {
  options: ProductFormOptions;
  suppliers: ProductSupplierOption[];
}

type PreviewImage = {
  file: File;
  url: string;

  originalSize: number;
  finalSize: number;

  originalWidth: number;
  originalHeight: number;

  finalWidth: number;
  finalHeight: number;

  optimized: boolean;
};

export default function QuickProductForm({
  options,
  suppliers,
}: QuickProductFormProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [categoryId, setCategoryId] = useState("");

  const [countryId, setCountryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierCurrency, setSupplierCurrency] = useState("AED");
  const [fulfilmentMethod, setFulfilmentMethod] = useState("stock");
  const [procurementLeadTimeDays, setProcurementLeadTimeDays] = useState(0);
  const [allowBackorder, setAllowBackorder] = useState(false);

  const [previews, setPreviews] = useState<PreviewImage[]>([]);

  const availableSubcategories = useMemo(
    () =>
      options.subcategories.filter(
        (subcategory) => subcategory.category_id === categoryId,
      ),
    [categoryId, options.subcategories],
  );

  async function handleImages(files: FileList | null) {
    for (const preview of previews) {
      URL.revokeObjectURL(preview.url);
    }

    if (!files) {
      setPreviews([]);

      return;
    }

    const selected = Array.from(files).slice(0, 10);

    try {
      const results = await Promise.all(
        selected.map(async (file) => {
          const result = await optimizeProductImage(file);

          return {
            file: result.file,

            url: URL.createObjectURL(result.file),

            originalSize: result.originalSize,

            finalSize: result.finalSize,

            originalWidth: result.originalWidth,

            originalHeight: result.originalHeight,

            finalWidth: result.finalWidth,

            finalHeight: result.finalHeight,

            optimized: result.optimized,
          };
        }),
      );

      setPreviews(results);
    } catch (error) {
      setPreviews([]);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to prepare the selected images.",
      );
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;

    const nativeEvent = event.nativeEvent as SubmitEvent;

    const submitter = nativeEvent.submitter as HTMLButtonElement | null;

    const formData = new FormData(form);
    /*
     * Replace the original file-input payload with the
     * prepared/optimized versions.
     */
    formData.delete("images");

    for (const preview of previews) {
      formData.append("images", preview.file, preview.file.name);
    }
    formData.set(
      "submitIntent",
      submitter?.value === "add-another" ? "add-another" : "save",
    );

    startTransition(async () => {
      const result = await createQuickProduct(formData);

      if (!result.success) {
        toast.error(result.message);

        return;
      }

      toast.success(result.message);

      if (result.intent === "add-another") {
        /*
         * Reset product-specific fields.
         *
         * Controlled repetitive fields are intentionally
         * preserved in React state.
         */
        form.reset();

        /*
         * Re-apply remembered values after native reset.
         */
        setCategoryId(categoryId);
        setCountryId(countryId);
        setUnitId(unitId);
        setSupplierId(supplierId);
        setSupplierCurrency(supplierCurrency);
        setFulfilmentMethod(fulfilmentMethod);
        setProcurementLeadTimeDays(procurementLeadTimeDays);
        setAllowBackorder(allowBackorder);

        for (const preview of previews) {
          URL.revokeObjectURL(preview.url);
        }

        setPreviews([]);

        /*
         * Clear the file input visually as well.
         */
        const imageInput = form.elements.namedItem("images");

        if (imageInput instanceof HTMLInputElement) {
          imageInput.value = "";
        }

        /*
         * Put the cursor directly back into Product Name
         * so the next item can be entered immediately.
         */
        const nameInput = form.elements.namedItem("name");

        if (nameInput instanceof HTMLInputElement) {
          nameInput.focus();
        }

        router.refresh();

        return;
      }

      router.push(`/admin/products/${result.productId}`);

      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Section
        icon={Box}
        title="Product Information"
        description="Main product identity and catalog classification."
      >
        <Field label="Product Name" required>
          <input
            name="name"
            required
            maxLength={200}
            placeholder="Example: 18V Cordless Drill Machine"
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="SKU">
            <input
              name="sku"
              maxLength={100}
              placeholder="Optional"
              className={inputClass}
            />
          </Field>

          <Field label="Barcode">
            <input
              name="barcode"
              maxLength={100}
              placeholder="EAN / UPC"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Category" required>
            <select
              name="categoryId"
              required
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={inputClass}
            >
              <option value="">Select category</option>

              {options.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Subcategory">
            <select
              name="subcategoryId"
              disabled={!categoryId}
              className={inputClass}
            >
              <option value="">
                {categoryId ? "No subcategory" : "Select category first"}
              </option>

              {availableSubcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Brand">
            <select name="brandId" className={inputClass}>
              <option value="">Generic / No brand</option>

              {options.brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Country of Origin">
            <select
              name="countryId"
              value={countryId}
              onChange={(event) => setCountryId(event.target.value)}
              className={inputClass}
            >
              <option value="">Not specified</option>

              {options.countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section
        icon={ImagePlus}
        title="Product Images"
        description="Select up to 10 images. The first image becomes primary."
      >
        <input
          name="images"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => handleImages(event.target.files)}
          className="block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
        />

        {previews.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {previews.map((preview, index) => (
              <div
                key={`${preview.file.name}-${index}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
              >
                <div className="relative aspect-square">
                  <Image
                    src={preview.url}
                    alt={preview.file.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />

                  {index === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-1 text-xs font-bold text-slate-950">
                      Primary
                    </span>
                  )}
                </div>

                <div className="space-y-1 px-3 py-2">
                  <p className="truncate text-xs font-medium text-slate-700">
                    {preview.file.name}
                  </p>

                  {preview.optimized ? (
                    <>
                      <p className="text-xs font-semibold text-green-700">
                        Optimized
                      </p>

                      <p className="text-xs text-slate-500">
                        {formatImageSize(preview.originalSize)}
                        {" → "}
                        {formatImageSize(preview.finalSize)}
                      </p>

                      <p className="text-xs text-slate-400">
                        {preview.originalWidth}×{preview.originalHeight}
                        {" → "}
                        {preview.finalWidth}×{preview.finalHeight}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Original kept · {formatImageSize(preview.finalSize)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={FileText}
        title="Description"
        description="Customer-facing product information."
      >
        <Field label="Short Description">
          <textarea
            name="shortDescription"
            rows={3}
            maxLength={500}
            placeholder="Short product summary"
            className={textareaClass}
          />
        </Field>

        <Field label="Full Description">
          <textarea
            name="description"
            rows={7}
            maxLength={10000}
            placeholder="Features, specifications and detailed product information"
            className={textareaClass}
          />
        </Field>
      </Section>

      <Section
        icon={Package}
        title="Wholesale Information"
        description="MOQ, units and packaging information."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="MOQ" required>
            <input
              name="moq"
              type="number"
              min={1}
              defaultValue={1}
              required
              className={inputClass}
            />
          </Field>

          <Field label="Unit">
            <select
              name="unitId"
              value={unitId}
              onChange={(event) => setUnitId(event.target.value)}
              className={inputClass}
            >
              <option value="">Not specified</option>

              {options.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.short_name})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Carton Quantity">
            <input
              name="cartonQuantity"
              type="number"
              min={1}
              placeholder="Pieces"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Packaging">
          <textarea
            name="packaging"
            rows={3}
            maxLength={500}
            placeholder="Example: 12 pcs per carton"
            className={textareaClass}
          />
        </Field>
      </Section>

      <Section
        icon={ShoppingCart}
        title="Supplier"
        description="Optional. Connect the first supplier while creating the product."
      >
        <Field label="Supplier">
          <select
            name="supplierId"
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            className={inputClass}
          >
            <option value="">Add supplier later</option>

            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.company_name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Supplier SKU">
            <input name="supplierSku" maxLength={150} className={inputClass} />
          </Field>

          <Field label="Cost Price">
            <input
              name="supplierCostPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className={inputClass}
            />
          </Field>

          <Field label="Currency">
            <input
              name="supplierCurrencyCode"
              maxLength={3}
              value={supplierCurrency}
              onChange={(event) =>
                setSupplierCurrency(event.target.value.toUpperCase())
              }
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Supplier MOQ">
            <input
              name="supplierMoq"
              type="number"
              min={1}
              className={inputClass}
            />
          </Field>

          <Field label="Lead Time Days">
            <input
              name="supplierLeadTimeDays"
              type="number"
              min={0}
              className={inputClass}
            />
          </Field>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
          <input
            name="supplierPreferred"
            type="checkbox"
            defaultChecked
            className="h-4 w-4"
          />

          <span className="text-sm font-semibold text-slate-700">
            Preferred Supplier
          </span>
        </label>
      </Section>

      <Section
        icon={Truck}
        title="Fulfilment"
        description="How this product will normally be supplied."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Fulfilment Method">
            <select
              name="fulfilmentMethod"
              value={fulfilmentMethod}
              onChange={(event) => setFulfilmentMethod(event.target.value)}
              className={inputClass}
            >
              <option value="stock">Stock Item</option>
              <option value="local_purchase">Local Purchase</option>
              <option value="import_on_demand">Import on Demand</option>
              <option value="dropship">Drop Ship</option>
              <option value="service">Service</option>
            </select>
          </Field>

          <Field label="Procurement Lead Time">
            <input
              name="procurementLeadTimeDays"
              type="number"
              min={0}
              value={procurementLeadTimeDays}
              onChange={(event) =>
                setProcurementLeadTimeDays(Number(event.target.value))
              }
              className={inputClass}
            />
          </Field>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
          <input
            name="allowBackorder"
            type="checkbox"
            checked={allowBackorder}
            onChange={(event) => setAllowBackorder(event.target.checked)}
            className="h-4 w-4"
          />

          <span className="text-sm font-semibold text-slate-700">
            Allow Backorder
          </span>
        </label>
      </Section>

      <Section
        icon={Save}
        title="Publishing"
        description="Control product catalog visibility."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Status">
            <select name="status" defaultValue="draft" className={inputClass}>
              <option value="draft">Draft</option>

              <option value="pending_review">Pending Review</option>

              <option value="published">Published</option>
            </select>
          </Field>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
            <input name="featured" type="checkbox" className="h-4 w-4" />

            <span className="text-sm font-semibold">Featured</span>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
            <input
              name="isNew"
              type="checkbox"
              defaultChecked
              className="h-4 w-4"
            />

            <span className="text-sm font-semibold">New Product</span>
          </label>
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-slate-200 bg-white/95 py-5 backdrop-blur sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={isPending}
          onClick={() => router.push("/admin/products")}
          className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold"
        >
          Cancel
        </button>

        <button
          type="submit"
          value="save"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Save className="h-4 w-4" />

          {isPending ? "Saving..." : "Save Product"}
        </button>

        <button
          type="submit"
          value="add-another"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-bold text-slate-950 disabled:opacity-60"
        >
          <Package className="h-4 w-4" />
          Save & Add Another
        </button>
      </div>
    </form>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <Icon className="h-5 w-5 text-amber-700" />
        </div>

        <div>
          <h2 className="font-bold text-slate-950">{title}</h2>

          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700">
        {label}

        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>

      {children}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100";

const textareaClass =
  "w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100";
