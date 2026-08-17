"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive,
  Building2,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  BrainCircuit,
} from "lucide-react";

import EmptyState from "@/components/admin/ui/EmptyState";
import SlideOver from "@/components/admin/ui/SlideOver";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import type { Database } from "@/lib/database.types";

import {
  createSupplier,
  toggleSupplierStatus,
  updateSupplier,
} from "@/app/admin/(protected)/suppliers/actions";
import type { SupplierFinancialPosition } from "@/lib/repositories/supplier-statement.repository";

type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];

type Supplier = SupplierRow & {
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
const supplierMoneyFormatter = new Intl.NumberFormat("en-AE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface SupplierManagerProps {
  suppliers: Supplier[];

  countries: CountryOption[];

  financialPositions: Record<string, SupplierFinancialPosition>;
}

export default function SupplierManager({
  suppliers,
  countries,
  financialPositions,
}: SupplierManagerProps) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return suppliers;
    }

    return suppliers.filter((supplier) =>
      [
        supplier.company_name,
        supplier.contact_name ?? "",
        supplier.email ?? "",
        supplier.phone ?? "",
        supplier.whatsapp ?? "",
        supplier.city ?? "",
        supplier.country?.name ?? "",
      ].some((value) => value.toLowerCase().includes(term)),
    );
  }, [search, suppliers]);

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
              placeholder="Search suppliers..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            <Plus className="h-5 w-5" />
            New supplier
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <p className="text-sm text-slate-500">
            {filteredSuppliers.length} of {suppliers.length} suppliers
          </p>

          <Building2 className="h-5 w-5 text-slate-400" />
        </div>

        {filteredSuppliers.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No suppliers found"
            description="Try another search or register a new sourcing partner."
            action={
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
              >
                <Plus className="h-4 w-4" />
                Create supplier
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Supplier</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Payable
                  </th>

                  <th className="px-6 py-4 text-right font-semibold">
                    Advance
                  </th>

                  <th className="px-6 py-4 text-right font-semibold">
                    Net Position
                  </th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                          <Building2 className="h-5 w-5 text-amber-700" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {supplier.company_name}
                            </p>

                            {supplier.website && (
                              <a
                                href={supplier.website}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open ${supplier.company_name} website`}
                                className="text-slate-400 transition hover:text-amber-600"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            {supplier.contact_name || "No contact person"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="space-y-2">
                        {supplier.email ? (
                          <a
                            href={`mailto:${supplier.email}`}
                            className="flex items-center gap-2 transition hover:text-amber-700"
                          >
                            <Mail className="h-4 w-4" />
                            {supplier.email}
                          </a>
                        ) : (
                          <span className="text-slate-400">No email</span>
                        )}

                        {supplier.phone && (
                          <a
                            href={`tel:${supplier.phone}`}
                            className="flex items-center gap-2 transition hover:text-amber-700"
                          >
                            <Phone className="h-4 w-4" />
                            {supplier.phone}
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />

                        <span>
                          {[supplier.city, supplier.country?.name]
                            .filter(Boolean)
                            .join(", ") || "Not specified"}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <SupplierFinancialAmount
                        value={financialPositions[supplier.id]?.payable ?? 0}
                        type="payable"
                      />
                    </td>

                    <td className="px-6 py-4 text-right">
                      <SupplierFinancialAmount
                        value={financialPositions[supplier.id]?.advance ?? 0}
                        type="advance"
                      />
                    </td>

                    <td className="px-6 py-4 text-right">
                      <SupplierNetPosition
                        supplierId={supplier.id}
                        value={
                          financialPositions[supplier.id]?.netPosition ?? 0
                        }
                      />
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge active={supplier.is_active ?? false} />
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/purchasing/supplier-intelligence/${supplier.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
                        >
                          <BrainCircuit className="h-4 w-4" />
                          Intelligence
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditingSupplier(supplier)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>

                        <form action={toggleSupplierStatus}>
                          <input type="hidden" name="id" value={supplier.id} />

                          <input
                            type="hidden"
                            name="nextStatus"
                            value={String(!supplier.is_active)}
                          />

                          <button
                            type="submit"
                            className={[
                              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                              supplier.is_active
                                ? "border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                : "border-green-200 text-green-700 hover:bg-green-50",
                            ].join(" ")}
                          >
                            {supplier.is_active ? (
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
        title="Create supplier"
        description="Register a new sourcing or wholesale supplier."
        onClose={() => setCreateOpen(false)}
      >
        <SupplierForm
          action={createSupplier}
          countries={countries}
          submitLabel="Create supplier"
        />
      </SlideOver>

      <SlideOver
        open={Boolean(editingSupplier)}
        title="Edit supplier"
        description="Update supplier company and contact information."
        onClose={() => setEditingSupplier(null)}
      >
        {editingSupplier && (
          <SupplierForm
            action={updateSupplier}
            supplier={editingSupplier}
            countries={countries}
            submitLabel="Save changes"
          />
        )}
      </SlideOver>
    </>
  );
}

function SupplierFinancialAmount({
  value,
  type,
}: {
  value: number;

  type: "payable" | "advance";
}) {
  if (Math.abs(value) < 0.005) {
    return <span className="text-sm text-slate-400">—</span>;
  }

  return (
    <span
      className={[
        "whitespace-nowrap text-sm font-semibold",
        type === "payable" ? "text-amber-700" : "text-violet-700",
      ].join(" ")}
    >
      AED {supplierMoneyFormatter.format(value)}
    </span>
  );
}

function SupplierNetPosition({
  supplierId,
  value,
}: {
  supplierId: string;
  value: number;
}) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue < 0.005) {
    return (
      <Link
        href={`/admin/purchasing/supplier-statement?supplierId=${supplierId}`}
        className="inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        Settled
      </Link>
    );
  }

  const isPayable = value > 0;

  return (
    <Link
      href={`/admin/purchasing/supplier-statement?supplierId=${supplierId}`}
      className={[
        "inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold transition",
        isPayable
          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
      ].join(" ")}
    >
      AED {supplierMoneyFormatter.format(absoluteValue)}{" "}
      {isPayable ? "Payable" : "Advance"}
    </Link>
  );
}
interface SupplierFormProps {
  supplier?: Supplier;
  countries: CountryOption[];
  submitLabel: string;
  action: (formData: FormData) => Promise<void>;
}

function SupplierForm({
  supplier,
  countries,
  submitLabel,
  action,
}: SupplierFormProps) {
  const suffix = supplier?.id ?? "new";

  return (
    <form action={action} className="space-y-5">
      {supplier && <input type="hidden" name="id" value={supplier.id} />}

      <div>
        <label
          htmlFor={`supplier-company-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Company name
        </label>

        <input
          id={`supplier-company-${suffix}`}
          name="companyName"
          required
          maxLength={180}
          defaultValue={supplier?.company_name ?? ""}
          placeholder="Example: ABC General Trading"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`supplier-contact-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Contact person
        </label>

        <input
          id={`supplier-contact-${suffix}`}
          name="contactName"
          maxLength={150}
          defaultValue={supplier?.contact_name ?? ""}
          placeholder="Contact person's name"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`supplier-email-${suffix}`}
            className="text-sm font-semibold text-slate-700"
          >
            Email
          </label>

          <input
            id={`supplier-email-${suffix}`}
            name="email"
            type="email"
            maxLength={255}
            defaultValue={supplier?.email ?? ""}
            placeholder="supplier@example.com"
            className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />
        </div>

        <div>
          <label
            htmlFor={`supplier-phone-${suffix}`}
            className="text-sm font-semibold text-slate-700"
          >
            Phone
          </label>

          <input
            id={`supplier-phone-${suffix}`}
            name="phone"
            maxLength={50}
            defaultValue={supplier?.phone ?? ""}
            placeholder="+971..."
            className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`supplier-whatsapp-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          WhatsApp number
        </label>

        <input
          id={`supplier-whatsapp-${suffix}`}
          name="whatsapp"
          maxLength={50}
          defaultValue={supplier?.whatsapp ?? ""}
          placeholder="+971..."
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`supplier-country-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Country
        </label>

        <select
          id={`supplier-country-${suffix}`}
          name="countryId"
          defaultValue={supplier?.country_id ?? ""}
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
          htmlFor={`supplier-city-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          City
        </label>

        <input
          id={`supplier-city-${suffix}`}
          name="city"
          maxLength={120}
          defaultValue={supplier?.city ?? ""}
          placeholder="Dubai"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`supplier-address-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Address
        </label>

        <textarea
          id={`supplier-address-${suffix}`}
          name="address"
          rows={3}
          maxLength={500}
          defaultValue={supplier?.address ?? ""}
          placeholder="Supplier address"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`supplier-website-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Website
        </label>

        <input
          id={`supplier-website-${suffix}`}
          name="website"
          type="url"
          maxLength={500}
          defaultValue={supplier?.website ?? ""}
          placeholder="https://example.com"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`supplier-notes-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Internal notes
        </label>

        <textarea
          id={`supplier-notes-${suffix}`}
          name="notes"
          rows={5}
          maxLength={2000}
          defaultValue={supplier?.notes ?? ""}
          placeholder="Payment terms, product specialties, important notes..."
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
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
