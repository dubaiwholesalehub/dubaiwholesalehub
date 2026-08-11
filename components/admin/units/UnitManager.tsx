"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  Archive,
  CheckCircle2,
  Edit3,
  Plus,
  Ruler,
  Search,
} from "lucide-react";

import {
  createUnit,
  toggleUnitStatus,
  updateUnit,
} from "@/app/admin/(protected)/units/actions";
import EmptyState from "@/components/admin/ui/EmptyState";
import SlideOver from "@/components/admin/ui/SlideOver";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import type {
  Unit,
} from "@/lib/repositories/unit.repository";

interface UnitManagerProps {
  units: Unit[];
}

export default function UnitManager({
  units,
}: UnitManagerProps) {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);

  const [
    editingUnit,
    setEditingUnit,
  ] = useState<Unit | null>(
    null,
  );

  const filteredUnits =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      if (!term) {
        return units;
      }

      return units.filter(
        (unit) =>
          unit.name
            .toLowerCase()
            .includes(term) ||
          unit.short_name
            .toLowerCase()
            .includes(term),
      );
    }, [search, units]);

  return (
    <>
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search units..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              setCreateOpen(true)
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            <Plus className="size-5" />
            New unit
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <p className="text-sm text-slate-500">
            {filteredUnits.length} of{" "}
            {units.length} units
          </p>

          <Ruler className="size-5 text-slate-400" />
        </div>

        {filteredUnits.length ===
        0 ? (
          <EmptyState
            icon={Ruler}
            title="No units found"
            description="Try another search or create a unit for product, sales, purchase and inventory quantities."
            action={
              <button
                type="button"
                onClick={() =>
                  setCreateOpen(true)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
              >
                <Plus className="size-4" />
                Create unit
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">
                    Unit
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Short Name
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredUnits.map(
                  (unit) => (
                    <tr
                      key={unit.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-500">
                            <Ruler className="size-4" />
                          </div>

                          <p className="font-semibold text-slate-900">
                            {unit.name}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm font-semibold text-slate-700">
                          {unit.short_name}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge
                          active={
                            unit.is_active ??
                            false
                          }
                        />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingUnit(
                                unit,
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                          >
                            <Edit3 className="size-4" />
                            Edit
                          </button>

                          <form
                            action={
                              toggleUnitStatus
                            }
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={unit.id}
                            />

                            <input
                              type="hidden"
                              name="nextStatus"
                              value={String(
                                !unit.is_active,
                              )}
                            />

                            <button
                              type="submit"
                              className={[
                                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                                unit.is_active
                                  ? "border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                  : "border-green-200 text-green-700 hover:bg-green-50",
                              ].join(
                                " ",
                              )}
                            >
                              {unit.is_active ? (
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
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SlideOver
        open={createOpen}
        title="Create unit"
        description="Add a measurement or packaging unit used by products, quotations, orders and inventory."
        onClose={() =>
          setCreateOpen(false)
        }
      >
        <UnitForm
          action={createUnit}
          submitLabel="Create unit"
        />
      </SlideOver>

      <SlideOver
        open={Boolean(
          editingUnit,
        )}
        title="Edit unit"
        description="Update the unit name and short code."
        onClose={() =>
          setEditingUnit(null)
        }
      >
        {editingUnit ? (
          <UnitForm
            unit={editingUnit}
            action={updateUnit}
            submitLabel="Save changes"
          />
        ) : null}
      </SlideOver>
    </>
  );
}

interface UnitFormProps {
  unit?: Unit;
  submitLabel: string;
  action: (
    formData: FormData,
  ) => Promise<void>;
}

function UnitForm({
  unit,
  submitLabel,
  action,
}: UnitFormProps) {
  const suffix =
    unit?.id ?? "new";

  return (
    <form
      action={action}
      className="space-y-5"
    >
      {unit ? (
        <input
          type="hidden"
          name="id"
          value={unit.id}
        />
      ) : null}

      <div>
        <label
          htmlFor={`unit-name-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Unit name
        </label>

        <input
          id={`unit-name-${suffix}`}
          name="name"
          required
          maxLength={100}
          defaultValue={
            unit?.name ?? ""
          }
          placeholder="Example: Piece"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
      </div>

      <div>
        <label
          htmlFor={`unit-short-name-${suffix}`}
          className="text-sm font-semibold text-slate-700"
        >
          Short name
        </label>

        <input
          id={`unit-short-name-${suffix}`}
          name="shortName"
          required
          maxLength={20}
          defaultValue={
            unit?.short_name ?? ""
          }
          placeholder="Example: PCS"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 uppercase outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />

        <p className="mt-2 text-xs text-slate-500">
          Used in product quantities,
          documents and stock records.
          It will be saved in uppercase.
        </p>
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