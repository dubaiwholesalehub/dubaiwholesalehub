"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Edit3,
  ExternalLink,
  ImageIcon,
  Plus,
  Search,
  Star,
  Tags,
} from "lucide-react";

import EmptyState from "@/components/admin/ui/EmptyState";
import SlideOver from "@/components/admin/ui/SlideOver";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import type { Database } from "@/types/database";

import {
  createBrand,
  toggleBrandStatus,
  updateBrand,
} from "@/app/admin/(protected)/brands/actions";

type BrandRow = Database["public"]["Tables"]["brands"]["Row"];

type Brand = BrandRow & {
  country: {
    id: string;
    name: string;
    iso2: string | null;
  } | null;
};

type CountryOption = {
  id: string;
  name: string;
  iso2: string | null;
};

interface BrandManagerProps {
  brands: Brand[];
  countries: CountryOption[];
}

export default function BrandManager({
  brands,
  countries,
}: BrandManagerProps) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingBrand, setEditingBrand] =
    useState<Brand | null>(null);

  const filteredBrands = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return brands;
    }

    return brands.filter((brand) =>
      [
        brand.name,
        brand.slug,
        brand.description ?? "",
        brand.country?.name ?? "",
      ].some((value) => value.toLowerCase().includes(term)),
    );
  }, [brands, search]);

  return (
    <>
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search brands..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            <Plus className="h-5 w-5" />
            New brand
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <p className="text-sm text-slate-500">
            {filteredBrands.length} of {brands.length} brands
          </p>

          <Tags className="h-5 w-5 text-slate-400" />
        </div>

        {filteredBrands.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="No brands found"
            description="Try another search or create a new brand for your product catalog."
            action={
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
              >
                <Plus className="h-4 w-4" />
                Create brand
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Brand</th>
                  <th className="px-6 py-4 font-semibold">Slug</th>
                  <th className="px-6 py-4 font-semibold">Country</th>
                  <th className="px-6 py-4 font-semibold">Featured</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredBrands.map((brand) => (
                  <tr
                    key={brand.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {brand.logo_url ? (
                            // A normal img is used because admin-entered
                            // domains are not known to Next Image config.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={brand.logo_url}
                              alt={`${brand.name} logo`}
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-400" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {brand.name}
                            </p>

                            {brand.website && (
                              <a
                                href={brand.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 transition hover:text-amber-600"
                                aria-label={`Open ${brand.name} website`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>

                          <p className="mt-1 max-w-sm truncate text-sm text-slate-500">
                            {brand.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {brand.slug}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {brand.country?.name || "Not specified"}
                    </td>

                    <td className="px-6 py-4">
                      {brand.is_featured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          <Star className="h-3.5 w-3.5" />
                          Featured
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">
                          No
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge active={brand.is_active ?? false} />
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingBrand(brand)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>

                        <form action={toggleBrandStatus}>
                          <input
                            type="hidden"
                            name="id"
                            value={brand.id}
                          />

                          <input
                            type="hidden"
                            name="nextStatus"
                            value={String(!brand.is_active)}
                          />

                          <button
                            type="submit"
                            className={[
                              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                              brand.is_active
                                ? "border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                : "border-green-200 text-green-700 hover:bg-green-50",
                            ].join(" ")}
                          >
                            {brand.is_active ? (
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
        title="Create brand"
        description="Add a product brand to the wholesale catalog."
        onClose={() => setCreateOpen(false)}
      >
        <BrandForm
          action={createBrand}
          countries={countries}
          submitLabel="Create brand"
        />
      </SlideOver>

      <SlideOver
        open={Boolean(editingBrand)}
        title="Edit brand"
        description="Update brand details and catalog visibility."
        onClose={() => setEditingBrand(null)}
      >
        {editingBrand && (
          <BrandForm
            action={updateBrand}
            brand={editingBrand}
            countries={countries}
            submitLabel="Save changes"
          />
        )}
      </SlideOver>
    </>
  );
}

interface BrandFormProps {
  brand?: Brand;
  countries: CountryOption[];
  submitLabel: string;
  action: (formData: FormData) => Promise<void>;
}

function BrandForm({
  brand,
  countries,
  submitLabel,
  action,
}: BrandFormProps) {
  const fieldSuffix = brand?.id ?? "new";

  return (
    <form action={action} className="space-y-5">
      {brand && <input type="hidden" name="id" value={brand.id} />}

      <div>
        <label
          htmlFor={`brand-name-${fieldSuffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Brand name
        </label>

        <input
          id={`brand-name-${fieldSuffix}`}
          name="name"
          required
          maxLength={120}
          defaultValue={brand?.name ?? ""}
          placeholder="Example: Philips"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`brand-slug-${fieldSuffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          URL slug
        </label>

        <input
          id={`brand-slug-${fieldSuffix}`}
          name="slug"
          maxLength={140}
          defaultValue={brand?.slug ?? ""}
          placeholder="Generated automatically if empty"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`brand-country-${fieldSuffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Country of origin
        </label>

        <select
          id={`brand-country-${fieldSuffix}`}
          name="countryId"
          defaultValue={brand?.country_id ?? ""}
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        >
          <option value="">Not specified</option>

          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
              {country.iso2 ? ` (${country.iso2})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`brand-website-${fieldSuffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Website
        </label>

        <input
          id={`brand-website-${fieldSuffix}`}
          name="website"
          type="url"
          maxLength={255}
          defaultValue={brand?.website ?? ""}
          placeholder="https://example.com"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`brand-logo-${fieldSuffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Logo URL
        </label>

        <input
          id={`brand-logo-${fieldSuffix}`}
          name="logoUrl"
          type="url"
          maxLength={500}
          defaultValue={brand?.logo_url ?? ""}
          placeholder="https://example.com/logo.png"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />

        <p className="mt-2 text-xs text-slate-500">
          Direct image upload will be added with the media module.
        </p>
      </div>

      <div>
        <label
          htmlFor={`brand-description-${fieldSuffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Description
        </label>

        <textarea
          id={`brand-description-${fieldSuffix}`}
          name="description"
          rows={5}
          maxLength={1000}
          defaultValue={brand?.description ?? ""}
          placeholder="Short information about this brand"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
        <input
          type="checkbox"
          name="isFeatured"
          defaultChecked={brand?.is_featured ?? false}
          className="h-4 w-4 accent-amber-500"
        />

        <span>
          <span className="block text-sm font-semibold text-slate-700">
            Featured brand
          </span>

          <span className="text-xs text-slate-500">
            Highlight this brand on catalog and marketing pages.
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