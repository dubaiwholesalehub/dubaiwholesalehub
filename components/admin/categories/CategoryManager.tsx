"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Edit3,
  FolderTree,
  Plus,
  Search,
  Star,
} from "lucide-react";

import SlideOver from "@/components/admin/ui/SlideOver";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import type { Database } from "@/lib/database.types";

import {
  createCategory,
  toggleCategoryStatus,
  updateCategory,
} from "@/app/admin/(protected)/categories/actions";

type Category =
  Database["public"]["Tables"]["categories"]["Row"];

interface CategoryManagerProps {
  categories: Category[];
}

export default function CategoryManager({
  categories,
}: CategoryManagerProps) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return categories;
    }

    return categories.filter((category) =>
      [
        category.name,
        category.slug,
        category.description ?? "",
      ].some((value) => value.toLowerCase().includes(term)),
    );
  }, [categories, search]);

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
                {filteredCategories.map((category) => (
                  <tr
                    key={category.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                          {category.is_featured ? (
                            <Star className="h-5 w-5 text-amber-700" />
                          ) : (
                            <FolderTree className="h-5 w-5 text-amber-700" />
                          )}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {category.name}
                          </p>

                          <p className="mt-1 max-w-sm truncate text-sm text-slate-500">
                            {category.description || "No description"}
                          </p>
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
                          <Star className="h-3.5 w-3.5" />
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
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingCategory(category)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                        >
                          <Edit3 className="h-4 w-4" />
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
                                <Archive className="h-4 w-4" />
                                Archive
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                Activate
                              </>
                            )}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
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
        <CategoryForm
          action={createCategory}
          submitLabel="Create category"
        />
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
    </>
  );
}

interface CategoryFormProps {
  category?: Category;
  submitLabel: string;
  action: (formData: FormData) => Promise<void>;
}

function CategoryForm({
  category,
  submitLabel,
  action,
}: CategoryFormProps) {
  return (
    <form action={action} className="space-y-5">
      {category && (
        <input type="hidden" name="id" value={category.id} />
      )}

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