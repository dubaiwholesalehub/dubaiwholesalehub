import type {
  AdminCategoryHierarchy,
  AdminSubcategory,
} from "@/lib/repositories/category.repository";

interface SubcategoryFormProps {
  categories: AdminCategoryHierarchy[];
  subcategory?: AdminSubcategory;
  defaultCategoryId?: string;
  submitLabel: string;
  action: (
    formData: FormData,
  ) => Promise<void>;
}

export default function SubcategoryForm({
  categories,
  subcategory,
  defaultCategoryId,
  submitLabel,
  action,
}: SubcategoryFormProps) {
  const suffix =
    subcategory?.id ?? "new";

  const selectedCategoryId =
    subcategory?.category_id ??
    defaultCategoryId ??
    "";

  return (
    <form
      action={action}
      className="space-y-5"
    >
      {subcategory ? (
        <input
          type="hidden"
          name="id"
          value={subcategory.id}
        />
      ) : null}

      <div>
        <label
          htmlFor={`subcategory-category-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Parent category
        </label>

        <select
          id={`subcategory-category-${suffix}`}
          name="categoryId"
          required
          defaultValue={
            selectedCategoryId
          }
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        >
          <option value="">
            Select category
          </option>

          {categories.map(
            (category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ),
          )}
        </select>
      </div>

      <div>
        <label
          htmlFor={`subcategory-name-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Subcategory name
        </label>

        <input
          id={`subcategory-name-${suffix}`}
          name="name"
          required
          maxLength={100}
          defaultValue={
            subcategory?.name ?? ""
          }
          placeholder="Example: Mobile Accessories"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`subcategory-slug-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          URL slug
        </label>

        <input
          id={`subcategory-slug-${suffix}`}
          name="slug"
          maxLength={120}
          defaultValue={
            subcategory?.slug ?? ""
          }
          placeholder="Generated automatically if empty"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />

        <p className="mt-2 text-xs text-slate-500">
          Used in catalog and product-page URLs.
        </p>
      </div>

      <div>
        <label
          htmlFor={`subcategory-description-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Description
        </label>

        <textarea
          id={`subcategory-description-${suffix}`}
          name="description"
          rows={4}
          maxLength={1000}
          defaultValue={
            subcategory?.description ??
            ""
          }
          placeholder="Short information about this subcategory"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`subcategory-image-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Image URL
        </label>

        <input
          id={`subcategory-image-${suffix}`}
          name="imageUrl"
          type="url"
          maxLength={500}
          defaultValue={
            subcategory?.image_url ?? ""
          }
          placeholder="https://example.com/category.jpg"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`subcategory-sort-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Sort order
        </label>

        <input
          id={`subcategory-sort-${suffix}`}
          name="sortOrder"
          type="number"
          min={0}
          max={10000}
          defaultValue={
            subcategory?.sort_order ??
            0
          }
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Search engine information
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Optional information used by public catalog pages.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor={`subcategory-seo-title-${suffix}`}
              className="text-sm font-semibold text-slate-700"
            >
              SEO title
            </label>

            <input
              id={`subcategory-seo-title-${suffix}`}
              name="seoTitle"
              maxLength={70}
              defaultValue={
                subcategory?.seo_title ??
                ""
              }
              placeholder="Wholesale Mobile Accessories"
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </div>

          <div>
            <label
              htmlFor={`subcategory-seo-description-${suffix}`}
              className="text-sm font-semibold text-slate-700"
            >
              SEO description
            </label>

            <textarea
              id={`subcategory-seo-description-${suffix}`}
              name="seoDescription"
              rows={3}
              maxLength={170}
              defaultValue={
                subcategory
                  ?.seo_description ??
                ""
              }
              placeholder="Browse wholesale mobile accessories available for bulk supply and export."
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
      >
        {submitLabel}
      </button>
    </form>
  );
}