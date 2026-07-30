"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, ArrowRight, Building2 } from "lucide-react";

import {
  createInventoryTransferAction,
  type CreateInventoryTransferActionState,
} from "@/app/admin/inventory/transfers/new/actions";

import { SaveInventoryTransferButton } from "./SaveInventoryTransferButton";

interface WarehouseOption {
  id: string;
  name: string;
}

interface InventoryTransferFormProps {
  warehouses: WarehouseOption[];
  defaultTransferDate: string;
}
const initialCreateInventoryTransferState: CreateInventoryTransferActionState =
  {
    error: null,
    fieldErrors: {},
  };
export function InventoryTransferForm({
  warehouses,
  defaultTransferDate,
}: InventoryTransferFormProps) {
  const [state, formAction] = useActionState(
    createInventoryTransferAction,
    initialCreateInventoryTransferState,
  );
  const fieldErrors = state?.fieldErrors ?? {};
  const formError = state?.error ?? null;
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");

  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");

  const hasEnoughWarehouses = warehouses.length >= 2;

  const warehousesAreEqual =
    Boolean(sourceWarehouseId) && sourceWarehouseId === destinationWarehouseId;

  const selectedSourceWarehouse = warehouses.find(
    (warehouse) => warehouse.id === sourceWarehouseId,
  );

  const selectedDestinationWarehouse = warehouses.find(
    (warehouse) => warehouse.id === destinationWarehouseId,
  );

  return (
    <form action={formAction} className="space-y-6">
      {!hasEnoughWarehouses && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />

          <div>
            <h2 className="font-semibold">A second warehouse is required</h2>

            <p className="mt-1 text-sm text-amber-800">
              Inventory transfers move stock from one warehouse to another. Add
              at least two active warehouses before creating a transfer.
            </p>

            <Link
              href="/admin/warehouses"
              className="mt-3 inline-flex text-sm font-semibold underline underline-offset-4"
            >
              Manage Warehouses
            </Link>
          </div>
        </div>
      )}

      {formError && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" />

          <p className="text-sm font-medium">{formError}</p>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Building2 className="size-5" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-950">
                Transfer Information
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Select the warehouse movement and transfer dates.
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
            <FormField
              label="Source Warehouse"
              htmlFor="sourceWarehouseId"
              required
              error={fieldErrors.sourceWarehouseId}
            >
              <select
                id="sourceWarehouseId"
                name="sourceWarehouseId"
                value={sourceWarehouseId}
                onChange={(event) => setSourceWarehouseId(event.target.value)}
                disabled={!hasEnoughWarehouses}
                aria-invalid={Boolean(fieldErrors.sourceWarehouseId)}
                className={getInputClassName(
                  Boolean(fieldErrors.sourceWarehouseId),
                )}
              >
                <option value="">Select source warehouse</option>

                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="hidden pt-8 lg:flex lg:justify-center">
              <div className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400">
                <ArrowRight className="size-4" />
              </div>
            </div>

            <FormField
              label="Destination Warehouse"
              htmlFor="destinationWarehouseId"
              required
              error={
                fieldErrors.destinationWarehouseId ??
                (warehousesAreEqual
                  ? "The destination must be different from the source warehouse."
                  : undefined)
              }
            >
              <select
                id="destinationWarehouseId"
                name="destinationWarehouseId"
                value={destinationWarehouseId}
                onChange={(event) =>
                  setDestinationWarehouseId(event.target.value)
                }
                disabled={!hasEnoughWarehouses}
                aria-invalid={
                  Boolean(fieldErrors.destinationWarehouseId) ||
                  warehousesAreEqual
                }
                className={getInputClassName(
                  Boolean(fieldErrors.destinationWarehouseId) ||
                    warehousesAreEqual,
                )}
              >
                <option value="">Select destination warehouse</option>

                {warehouses.map((warehouse) => (
                  <option
                    key={warehouse.id}
                    value={warehouse.id}
                    disabled={warehouse.id === sourceWarehouseId}
                  >
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {selectedSourceWarehouse &&
            selectedDestinationWarehouse &&
            !warehousesAreEqual && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="font-medium text-slate-800">
                  {selectedSourceWarehouse.name}
                </span>

                <ArrowRight className="size-4 text-amber-600" />

                <span className="font-medium text-slate-800">
                  {selectedDestinationWarehouse.name}
                </span>
              </div>
            )}

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Transfer Date"
              htmlFor="transferDate"
              required
              error={fieldErrors.transferDate}
            >
              <input
                id="transferDate"
                name="transferDate"
                type="date"
                defaultValue={defaultTransferDate}
                aria-invalid={Boolean(fieldErrors.transferDate)}
                className={getInputClassName(
                  Boolean(fieldErrors.transferDate),
                )}
              />
            </FormField>

            <FormField
              label="Expected Arrival"
              htmlFor="expectedArrivalDate"
              error={fieldErrors.expectedArrivalDate}
            >
              <input
                id="expectedArrivalDate"
                name="expectedArrivalDate"
                type="date"
                aria-invalid={Boolean(fieldErrors.expectedArrivalDate)}
                className={getInputClassName(
                  Boolean(fieldErrors.expectedArrivalDate),
                )}
              />
            </FormField>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Reference Number"
              htmlFor="referenceNumber"
              hint="Optional external or internal reference."
            >
              <input
                id="referenceNumber"
                name="referenceNumber"
                type="text"
                maxLength={100}
                placeholder="Example: WH-2026-001"
                className={getInputClassName()}
              />
            </FormField>

            <FormField
              label="Reason"
              htmlFor="reason"
              hint="Why is this inventory being moved?"
            >
              <input
                id="reason"
                name="reason"
                type="text"
                maxLength={250}
                placeholder="Example: Branch restocking"
                className={getInputClassName()}
              />
            </FormField>
          </div>

          <FormField
            label="Internal Notes"
            htmlFor="internalNotes"
            hint="Visible only to authorised internal users."
          >
            <textarea
              id="internalNotes"
              name="internalNotes"
              rows={4}
              maxLength={2000}
              placeholder="Add handling instructions or other internal information..."
              className={[
                getInputClassName(),
                "h-auto min-h-28 resize-y py-3",
              ].join(" ")}
            />
          </FormField>
        </div>
      </section>

      <footer className="flex flex-col-reverse gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/admin/inventory/transfers"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>

        <SaveInventoryTransferButton
          disabled={!hasEnoughWarehouses || warehousesAreEqual}
        />
      </footer>
    </form>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-semibold text-slate-700"
      >
        {label}

        {required && (
          <span aria-hidden="true" className="ml-1 text-red-600">
            *
          </span>
        )}
      </label>

      {children}

      {error ? (
        <p
          id={`${htmlFor}-error`}
          className="mt-1.5 text-xs font-medium text-red-600"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function getInputClassName(hasError = false): string {
  return [
    "h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none transition",
    "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100",
  ].join(" ");
}
