"use client";
import ProductImageManager from "@/components/admin/products/ProductImageManager";
import { useMemo, useState } from "react";
import {
  Box,
  FileText,
  Globe2,
  ImageIcon,
  Package,
  SearchCheck,
  Settings2,
} from "lucide-react";

import type {
  Product,
  ProductFormOptions,
  ProductStatus,
} from "@/components/admin/products/product-types";

interface ProductFormProps {
  product?: Product;
  options: ProductFormOptions;
  submitLabel: string;
  action: (formData: FormData) => Promise<void>;
}

const statuses: Array<{
  value: ProductStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  {
    value: "pending_review",
    label: "Pending Review",
  },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function ProductForm({
  product,
  options,
  submitLabel,
  action,
}: ProductFormProps) {
  const [categoryId, setCategoryId] = useState(
    product?.category_id ?? "",
  );

  const availableSubcategories = useMemo(
    () =>
      options.subcategories.filter(
        (subcategory) =>
          subcategory.category_id === categoryId,
      ),
    [categoryId, options.subcategories],
  );

  const suffix = product?.id ?? "new";

  return (
  <div className="space-y-8">
    <form action={action} className="space-y-8">
      {product && (
        <input
          type="hidden"
          name="id"
          value={product.id}
        />
      )}

      <FormSection
        icon={Box}
        title="Basic information"
        description="Product identity and catalog classification."
      >
        <div>
          <FieldLabel htmlFor={`product-name-${suffix}`}>
            Product name
          </FieldLabel>

          <input
            id={`product-name-${suffix}`}
            name="name"
            required
            maxLength={200}
            defaultValue={product?.name ?? ""}
            placeholder="Example: 18V Cordless Drill Machine"
            className={inputClassName}
          />
        </div>

        <div>
          <FieldLabel htmlFor={`product-slug-${suffix}`}>
            URL slug
          </FieldLabel>

          <input
            id={`product-slug-${suffix}`}
            name="slug"
            maxLength={220}
            defaultValue={product?.slug ?? ""}
            placeholder="Generated automatically if empty"
            className={inputClassName}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor={`product-sku-${suffix}`}>
              SKU
            </FieldLabel>

            <input
              id={`product-sku-${suffix}`}
              name="sku"
              maxLength={100}
              defaultValue={product?.sku ?? ""}
              placeholder="DWH-TOOL-001"
              className={inputClassName}
            />
          </div>

          <div>
            <FieldLabel
              htmlFor={`product-barcode-${suffix}`}
            >
              Barcode
            </FieldLabel>

            <input
              id={`product-barcode-${suffix}`}
              name="barcode"
              maxLength={100}
              defaultValue={product?.barcode ?? ""}
              placeholder="EAN / UPC"
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor={`product-model-${suffix}`}>
            Model number
          </FieldLabel>

          <input
            id={`product-model-${suffix}`}
            name="modelNumber"
            maxLength={120}
            defaultValue={product?.model_number ?? ""}
            placeholder="Manufacturer model number"
            className={inputClassName}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel
              htmlFor={`product-category-${suffix}`}
            >
              Category
            </FieldLabel>

            <select
              id={`product-category-${suffix}`}
              name="categoryId"
              required
              value={categoryId}
              onChange={(event) =>
                setCategoryId(event.target.value)
              }
              className={selectClassName}
            >
              <option value="">Select category</option>

              {options.categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel
              htmlFor={`product-subcategory-${suffix}`}
            >
              Subcategory
            </FieldLabel>

            <select
              key={`${suffix}-${categoryId}`}
              id={`product-subcategory-${suffix}`}
              name="subcategoryId"
              defaultValue={
                availableSubcategories.some(
                  (subcategory) =>
                    subcategory.id === product?.subcategory_id,
                )
                  ? product?.subcategory_id ?? ""
                  : ""
              }
              disabled={!categoryId}
              className={selectClassName}
            >
              <option value="">
                {categoryId
                  ? "No subcategory"
                  : "Select category first"}
              </option>

              {availableSubcategories.map(
                (subcategory) => (
                  <option
                    key={subcategory.id}
                    value={subcategory.id}
                  >
                    {subcategory.name}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor={`product-brand-${suffix}`}>
              Brand
            </FieldLabel>

            <select
              id={`product-brand-${suffix}`}
              name="brandId"
              defaultValue={product?.brand_id ?? ""}
              className={selectClassName}
            >
              <option value="">No brand / Generic</option>

              {options.brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel
              htmlFor={`product-country-${suffix}`}
            >
              Country of origin
            </FieldLabel>

            <select
              id={`product-country-${suffix}`}
              name="countryId"
              defaultValue={product?.country_id ?? ""}
              className={selectClassName}
            >
              <option value="">Not specified</option>

              {options.countries.map((country) => (
                <option
                  key={country.id}
                  value={country.id}
                >
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FormSection>

      <FormSection
        icon={FileText}
        title="Descriptions"
        description="Content shown on catalog and product pages."
      >
        <div>
          <FieldLabel
            htmlFor={`product-short-description-${suffix}`}
          >
            Short description
          </FieldLabel>

          <textarea
            id={`product-short-description-${suffix}`}
            name="shortDescription"
            rows={3}
            maxLength={500}
            defaultValue={
              product?.short_description ?? ""
            }
            placeholder="Short summary for product cards"
            className={textareaClassName}
          />
        </div>

        <div>
          <FieldLabel
            htmlFor={`product-description-${suffix}`}
          >
            Full description
          </FieldLabel>

          <textarea
            id={`product-description-${suffix}`}
            name="description"
            rows={8}
            maxLength={10000}
            defaultValue={product?.description ?? ""}
            placeholder="Detailed product description, features and specifications"
            className={textareaClassName}
          />
        </div>
      </FormSection>

      <FormSection
        icon={Package}
        title="Wholesale information"
        description="Minimum quantities, packaging and export details."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor={`product-moq-${suffix}`}>
              Minimum order quantity
            </FieldLabel>

            <input
              id={`product-moq-${suffix}`}
              name="moq"
              type="number"
              min={1}
              defaultValue={product?.moq ?? 1}
              required
              className={inputClassName}
            />
          </div>

          <div>
            <FieldLabel htmlFor={`product-unit-${suffix}`}>
              Unit
            </FieldLabel>

            <select
              id={`product-unit-${suffix}`}
              name="unitId"
              defaultValue={product?.unit_id ?? ""}
              className={selectClassName}
            >
              <option value="">Not specified</option>

              {options.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.short_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel
              htmlFor={`product-carton-${suffix}`}
            >
              Carton quantity
            </FieldLabel>

            <input
              id={`product-carton-${suffix}`}
              name="cartonQuantity"
              type="number"
              min={1}
              defaultValue={
                product?.carton_quantity ?? ""
              }
              placeholder="Pieces per carton"
              className={inputClassName}
            />
          </div>

          <div>
            <FieldLabel
              htmlFor={`product-lead-time-${suffix}`}
            >
              Lead time
            </FieldLabel>

            <input
              id={`product-lead-time-${suffix}`}
              name="leadTime"
              maxLength={120}
              defaultValue={product?.lead_time ?? ""}
              placeholder="Example: 7–14 days"
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <FieldLabel
            htmlFor={`product-packaging-${suffix}`}
          >
            Packaging
          </FieldLabel>

          <textarea
            id={`product-packaging-${suffix}`}
            name="packaging"
            rows={3}
            maxLength={500}
            defaultValue={product?.packaging ?? ""}
            placeholder="Example: 12 pieces per carton"
            className={textareaClassName}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel
              htmlFor={`product-warranty-${suffix}`}
            >
              Warranty
            </FieldLabel>

            <input
              id={`product-warranty-${suffix}`}
              name="warranty"
              maxLength={250}
              defaultValue={product?.warranty ?? ""}
              placeholder="Example: 1 year"
              className={inputClassName}
            />
          </div>

          <div>
            <FieldLabel
              htmlFor={`product-hs-code-${suffix}`}
            >
              HS code
            </FieldLabel>

            <input
              id={`product-hs-code-${suffix}`}
              name="hsCode"
              maxLength={50}
              defaultValue={product?.hs_code ?? ""}
              placeholder="Customs tariff code"
              className={inputClassName}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        icon={Settings2}
        title="Publishing"
        description="Control workflow and catalog visibility."
      >
        <div>
          <FieldLabel
            htmlFor={`product-status-${suffix}`}
          >
            Product status
          </FieldLabel>

          <select
            id={`product-status-${suffix}`}
            name="status"
            defaultValue={product?.status ?? "draft"}
            className={selectClassName}
          >
            {statuses.map((status) => (
              <option
                key={status.value}
                value={status.value}
              >
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CheckboxCard
            name="featured"
            title="Featured product"
            description="Display this product in featured catalog areas."
            defaultChecked={product?.featured ?? false}
          />

          <CheckboxCard
            name="isNew"
            title="New arrival"
            description="Show a new-product badge on the catalog."
            defaultChecked={product?.is_new ?? false}
          />
        </div>
      </FormSection>

      <FormSection
        icon={SearchCheck}
        title="Search engine optimization"
        description="Optional SEO content for product pages."
      >
        <div>
          <FieldLabel
            htmlFor={`product-meta-title-${suffix}`}
          >
            Meta title
          </FieldLabel>

          <input
            id={`product-meta-title-${suffix}`}
            name="metaTitle"
            maxLength={70}
            defaultValue={product?.meta_title ?? ""}
            placeholder="SEO page title"
            className={inputClassName}
          />
        </div>

        <div>
          <FieldLabel
            htmlFor={`product-meta-description-${suffix}`}
          >
            Meta description
          </FieldLabel>

          <textarea
            id={`product-meta-description-${suffix}`}
            name="metaDescription"
            rows={4}
            maxLength={170}
            defaultValue={
              product?.meta_description ?? ""
            }
            placeholder="Search engine description"
            className={textareaClassName}
          />
        </div>
      </FormSection>
      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-950 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
      >
        {submitLabel}
      </button>
    </form>

    {product ? (
      <ProductImageManager product={product} />
    ) : (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <ImageIcon className="mx-auto h-8 w-8 text-slate-400" />

        <h3 className="mt-3 font-semibold text-slate-900">
          Save the product before uploading images
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Create the product first, then open Edit to upload its gallery
          images.
        </p>
      </section>
    )}
  </div>
  );
}

const inputClassName =
  "mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100";

const selectClassName =
  "mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const textareaClassName =
  "mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100";

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-semibold text-slate-700"
    >
      {children}
    </label>
  );
}

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Globe2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <Icon className="h-5 w-5 text-amber-700" />
        </div>

        <div>
          <h3 className="font-semibold text-slate-950">
            {title}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function CheckboxCard({
  name,
  title,
  description,
  defaultChecked,
}: {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-amber-300 hover:bg-amber-50/40">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 accent-amber-500"
      />

      <span>
        <span className="block text-sm font-semibold text-slate-700">
          {title}
        </span>

        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}