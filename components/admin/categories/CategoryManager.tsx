"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Edit3,
  FolderTree,
  Plus,
  Search,
  Star,
} from "lucide-react";

import SlideOver from "@/components/admin/ui/SlideOver";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import type {
  AdminCategoryHierarchy,
  AdminSubcategory,
} from "@/lib/repositories/category.repository";

import {
  createCategory,
  createSubcategory,
  toggleCategoryStatus,
  toggleSubcategoryStatus,
  updateCategory,
  updateSubcategory,
} from "@/app/admin/(protected)/categories/actions";
import SubcategoryForm from "@/components/admin/categories/SubcategoryForm";
interface CategoryManagerProps {
  categories: AdminCategoryHierarchy[];
}
function CountBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
      <span className="font-semibold text-slate-900">{value}</span>

      {label}
    </span>
  );
}

function SubcategoryRow({
  subcategory,
  onEdit,
}: {
  subcategory: AdminSubcategory;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <FolderTree className="size-4" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{subcategory.name}</p>

            <StatusBadge active={subcategory.is_active ?? false} />
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {subcategory.description || "No description"}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            <CountBadge label="Products" value={subcategory.product_count} />

            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-600">
              {subcategory.slug}
            </span>

            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500">
              Order: {subcategory.sort_order ?? 0}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
        >
          <Edit3 className="size-4" />
          Edit
        </button>

        <form action={toggleSubcategoryStatus}>
          <input type="hidden" name="id" value={subcategory.id} />

          <input
            type="hidden"
            name="nextStatus"
            value={String(!subcategory.is_active)}
          />

          <button
            type="submit"
            className={[
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
              subcategory.is_active
                ? "border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                : "border-green-200 text-green-700 hover:bg-green-50",
            ].join(" ")}
          >
            {subcategory.is_active ? (
              <>
                <Archive className="size-4" />
                Archive
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Activate
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
export default function CategoryManager({ categories }: CategoryManagerProps) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<AdminCategoryHierarchy | null>(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(
    new Set(),
  );

  const [creatingSubcategoryFor, setCreatingSubcategoryFor] =
    useState<AdminCategoryHierarchy | null>(null);

  const [editingSubcategory, setEditingSubcategory] =
    useState<AdminSubcategory | null>(null);
  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return categories;
    }

    return categories.filter((category) =>
      [category.name, category.slug, category.description ?? ""].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }, [categories, search]);
  function toggleCategoryExpanded(categoryId: string) {
    setExpandedCategoryIds((current) => {
      const next = new Set(current);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
  }

  return (
    <>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            <Plus className="h-5 w-5" />
            New category
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <p className="text-sm text-slate-500">
            {filteredCategories.length} of {categories.length} categories
          </p>

          <FolderTree className="h-5 w-5 text-slate-400" />
        </div>

        {filteredCategories.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FolderTree className="mx-auto h-10 w-10 text-slate-400" />

            <h3 className="mt-4 font-semibold text-slate-900">
              No categories found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try another search or create a category.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Category</th>
                  <th className="px-6 py-4 font-semibold">Slug</th>
                  <th className="px-6 py-4 font-semibold">Order</th>
                  <th className="px-6 py-4 font-semibold">Featured</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredCategories.map((category) => {
                  const isExpanded = expandedCategoryIds.has(category.id);

                  return (
                    <Fragment key={category.id}>
                      <tr className="transition hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                toggleCategoryExpanded(category.id)
                              }
                              aria-label={
                                isExpanded
                                  ? `Collapse ${category.name}`
                                  : `Expand ${category.name}`
                              }
                              aria-expanded={isExpanded}
                              className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </button>

                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                              {category.is_featured ? (
                                <Star className="size-5 text-amber-700" />
                              ) : (
                                <FolderTree className="size-5 text-amber-700" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {category.name}
                              </p>

                              <p className="mt-1 max-w-sm truncate text-sm text-slate-500">
                                {category.description || "No description"}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <CountBadge
                                  label="Products"
                                  value={category.product_count}
                                />

                                <CountBadge
                                  label="Subcategories"
                                  value={category.subcategory_count}
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {category.slug}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {category.sort_order ?? 0}
                        </td>

                        <td className="px-6 py-4">
                          {category.is_featured ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                              <Star className="size-3.5" />
                              Featured
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">No</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge active={category.is_active ?? false} />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setCreatingSubcategoryFor(category)
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100"
                            >
                              <FolderPlus className="size-4" />
                              Add Subcategory
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingCategory(category)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                            >
                              <Edit3 className="size-4" />
                              Edit
                            </button>

                            <form action={toggleCategoryStatus}>
                              <input
                                type="hidden"
                                name="id"
                                value={category.id}
                              />

                              <input
                                type="hidden"
                                name="nextStatus"
                                value={String(!category.is_active)}
                              />

                              <button
                                type="submit"
                                className={[
                                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                                  category.is_active
                                    ? "border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                    : "border-green-200 text-green-700 hover:bg-green-50",
                                ].join(" ")}
                              >
                                {category.is_active ? (
                                  <>
                                    <Archive className="size-4" />
                                    Archive
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="size-4" />
                                    Activate
                                  </>
                                )}
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>

                      {isExpanded ? (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/70 px-6 py-5">
                            <div className="ml-11 space-y-3">
                              {category.subcategories.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                                  <FolderTree className="mx-auto size-8 text-slate-400" />

                                  <p className="mt-3 font-semibold text-slate-900">
                                    No subcategories
                                  </p>

                                  <p className="mt-1 text-sm text-slate-500">
                                    Add the first subcategory under{" "}
                                    {category.name}.
                                  </p>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCreatingSubcategoryFor(category)
                                    }
                                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
                                  >
                                    <FolderPlus className="size-4" />
                                    Add Subcategory
                                  </button>
                                </div>
                              ) : (
                                category.subcategories.map((subcategory) => (
                                  <SubcategoryRow
                                    key={subcategory.id}
                                    subcategory={subcategory}
                                    onEdit={() =>
                                      setEditingSubcategory(subcategory)
                                    }
                                  />
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SlideOver
        open={createOpen}
        title="Create category"
        description="Add a new product category to the wholesale catalog."
        onClose={() => setCreateOpen(false)}
      >
        <CategoryForm action={createCategory} submitLabel="Create category" />
      </SlideOver>

      <SlideOver
        open={Boolean(editingCategory)}
        title="Edit category"
        description="Update the category details and homepage settings."
        onClose={() => setEditingCategory(null)}
      >
        {editingCategory && (
          <CategoryForm
            action={updateCategory}
            category={editingCategory}
            submitLabel="Save changes"
          />
        )}
      </SlideOver>
      <SlideOver
        open={Boolean(creatingSubcategoryFor)}
        title="Create subcategory"
        description={
          creatingSubcategoryFor
            ? `Add a child category under ${creatingSubcategoryFor.name}.`
            : "Add a subcategory."
        }
        onClose={() => setCreatingSubcategoryFor(null)}
      >
        {creatingSubcategoryFor ? (
          <SubcategoryForm
            categories={categories}
            defaultCategoryId={creatingSubcategoryFor.id}
            action={createSubcategory}
            submitLabel="Create subcategory"
          />
        ) : null}
      </SlideOver>

      <SlideOver
        open={Boolean(editingSubcategory)}
        title="Edit subcategory"
        description="Update the subcategory, parent category, catalog content and SEO information."
        onClose={() => setEditingSubcategory(null)}
      >
        {editingSubcategory ? (
          <SubcategoryForm
            categories={categories}
            subcategory={editingSubcategory}
            action={updateSubcategory}
            submitLabel="Save changes"
          />
        ) : null}
      </SlideOver>
    </>
  );
}

interface CategoryFormProps {
  category?: AdminCategoryHierarchy;
  submitLabel: string;
  action: (formData: FormData) => Promise<void>;
}

function CategoryForm({ category, submitLabel, action }: CategoryFormProps) {
  return (
    <form action={action} className="space-y-5">
      {category && <input type="hidden" name="id" value={category.id} />}

      <div>
        <label
          htmlFor={`name-${category?.id ?? "new"}`}
          className="text-sm font-semibold text-slate-700"
        >
          Category name
        </label>

        <input
          id={`name-${category?.id ?? "new"}`}
          name="name"
          required
          maxLength={100}
          defaultValue={category?.name ?? ""}
          placeholder="Example: Household Products"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`slug-${category?.id ?? "new"}`}
          className="text-sm font-semibold text-slate-700"
        >
          URL slug
        </label>

        <input
          id={`slug-${category?.id ?? "new"}`}
          name="slug"
          maxLength={120}
          defaultValue={category?.slug ?? ""}
          placeholder="Generated automatically if empty"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`description-${category?.id ?? "new"}`}
          className="text-sm font-semibold text-slate-700"
        >
          Description
        </label>

        <textarea
          id={`description-${category?.id ?? "new"}`}
          name="description"
          rows={5}
          maxLength={500}
          defaultValue={category?.description ?? ""}
          placeholder="Short description of this category"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`sort-order-${category?.id ?? "new"}`}
          className="text-sm font-semibold text-slate-700"
        >
          Sort order
        </label>

        <input
          id={`sort-order-${category?.id ?? "new"}`}
          name="sortOrder"
          type="number"
          min={0}
          max={10000}
          defaultValue={category?.sort_order ?? 0}
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
        <input
          type="checkbox"
          name="isFeatured"
          defaultChecked={category?.is_featured ?? false}
          className="h-4 w-4 accent-amber-500"
        />

        <span>
          <span className="block text-sm font-semibold text-slate-700">
            Featured category
          </span>

          <span className="text-xs text-slate-500">
            Display this category prominently on the homepage.
          </span>
        </span>
      </label>

      <button
        type="submit"
        className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
      >
        {submitLabel}
      </button>
    </form>
  );
}
