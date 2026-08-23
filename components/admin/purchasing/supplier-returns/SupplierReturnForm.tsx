"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  Loader2,
  RotateCcw,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  toast,
} from "sonner";

import {
  createSupplierReturnAction,
  loadSupplierReturnItemsAction,
} from "@/app/admin/(protected)/purchasing/returns/new/actions";

import type {
  SupplierReturnEligibleItem,
  SupplierReturnEligiblePurchase,
} from "@/lib/repositories/supplier-return.repository";


interface SupplierReturnFormProps {
  purchases:
    SupplierReturnEligiblePurchase[];
}


type ReturnLineState = {
  selected: boolean;
  quantity: string;
  reason: string;
  notes: string;
};


function localDateString(): string {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      now.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}


function money(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-AE",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}


export default function SupplierReturnForm({
  purchases,
}: SupplierReturnFormProps) {
  const router =
    useRouter();

  const [
    isLoading,
    startLoading,
  ] =
    useTransition();

  const [
    isCreating,
    startCreating,
  ] =
    useTransition();

  const [
    quickPurchaseId,
    setQuickPurchaseId,
  ] =
    useState("");

  const [
    returnDate,
    setReturnDate,
  ] =
    useState(
      localDateString(),
    );

  const [
    postingDate,
    setPostingDate,
  ] =
    useState(
      localDateString(),
    );

  const [
    reason,
    setReason,
  ] =
    useState("");

  const [
    notes,
    setNotes,
  ] =
    useState("");

  const [
    eligibleItems,
    setEligibleItems,
  ] =
    useState<
      SupplierReturnEligibleItem[]
    >([]);

  const [
    lineState,
    setLineState,
  ] =
    useState<
      Record<
        string,
        ReturnLineState
      >
    >({});


  const selectedPurchase =
    useMemo(
      () =>
        purchases.find(
          (purchase) =>
            purchase.id ===
            quickPurchaseId,
        ) ??
        null,
      [
        purchases,
        quickPurchaseId,
      ],
    );


  const selectedLines =
    useMemo(
      () =>
        eligibleItems
          .filter(
            (item) =>
              lineState[
                item.quickPurchaseItemId
              ]?.selected,
          )
          .map(
            (item) => {
              const state =
                lineState[
                  item.quickPurchaseItemId
                ];

              const quantity =
                Number(
                  state?.quantity ??
                  0,
                );

              const ratio =
                item.purchasedQuantity >
                0
                  ? quantity /
                    item.purchasedQuantity
                  : 0;

              return {
                item,
                state,
                quantity,

                subtotal:
                  item.lineSubtotal *
                  ratio,

                tax:
                  item.taxAmount *
                  ratio,

                total:
                  item.lineTotal *
                  ratio,

                inventoryCost:
                  item.originalInventoryUnitCost *
                  quantity,
              };
            },
          ),
      [
        eligibleItems,
        lineState,
      ],
    );


  const totals =
    useMemo(
      () =>
        selectedLines.reduce(
          (
            result,
            line,
          ) => ({
            quantity:
              result.quantity +
              line.quantity,

            subtotal:
              result.subtotal +
              line.subtotal,

            tax:
              result.tax +
              line.tax,

            total:
              result.total +
              line.total,

            inventoryCost:
              result.inventoryCost +
              line.inventoryCost,
          }),
          {
            quantity: 0,
            subtotal: 0,
            tax: 0,
            total: 0,
            inventoryCost: 0,
          },
        ),
      [
        selectedLines,
      ],
    );


  function updateLine(
    itemId: string,
    patch:
      Partial<ReturnLineState>,
  ) {
    setLineState(
      (current) => ({
        ...current,

        [itemId]: {
          ...current[
            itemId
          ],

          ...patch,
        },
      }),
    );
  }


  function handlePurchaseChange(
    nextPurchaseId: string,
  ) {
    setQuickPurchaseId(
      nextPurchaseId,
    );

    setEligibleItems(
      [],
    );

    setLineState(
      {},
    );

    if (!nextPurchaseId) {
      return;
    }

    startLoading(
      async () => {
        try {
          const items =
            await loadSupplierReturnItemsAction(
              nextPurchaseId,
            );

          setEligibleItems(
            items,
          );

          const initialState:
            Record<
              string,
              ReturnLineState
            > = {};

          for (
            const item of items
          ) {
            initialState[
              item.quickPurchaseItemId
            ] = {
              selected:
                false,

              quantity:
                "",

              reason:
                "",

              notes:
                "",
            };
          }

          setLineState(
            initialState,
          );

          if (
            items.length === 0
          ) {
            toast.error(
              "This Quick Purchase has no remaining returnable items.",
            );
          }
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load returnable items.",
          );
        }
      },
    );
  }


  function handleSubmit() {
    if (!quickPurchaseId) {
      toast.error(
        "Select a Quick Purchase.",
      );

      return;
    }

    if (!returnDate) {
      toast.error(
        "Return date is required.",
      );

      return;
    }

    if (!postingDate) {
      toast.error(
        "Posting date is required.",
      );

      return;
    }

    if (
      reason.trim().length <
      3
    ) {
      toast.error(
        "Enter a meaningful return reason.",
      );

      return;
    }

    if (
      selectedLines.length ===
      0
    ) {
      toast.error(
        "Select at least one item to return.",
      );

      return;
    }

    const invalidLine =
      selectedLines.find(
        (line) =>
          !Number.isFinite(
            line.quantity,
          ) ||
          line.quantity <=
            0 ||
          line.quantity >
            line.item
              .quantityReturnable,
      );

    if (invalidLine) {
      toast.error(
        `Enter a valid quantity for line ${invalidLine.item.lineNumber}. Maximum returnable quantity is ${invalidLine.item.quantityReturnable}.`,
      );

      return;
    }

    startCreating(
      async () => {
        try {
          const id =
            await createSupplierReturnAction(
              {
                quickPurchaseId,

                returnDate,

                postingDate,

                reason:
                  reason.trim(),

                notes:
                  notes.trim() ||
                  undefined,

                items:
                  selectedLines.map(
                    (
                      line,
                    ) => ({
                      quickPurchaseItemId:
                        line.item
                          .quickPurchaseItemId,

                      quantityReturned:
                        line.quantity,

                      reason:
                        line.state
                          ?.reason
                          .trim() ||
                        null,

                      notes:
                        line.state
                          ?.notes
                          .trim() ||
                        null,
                    }),
                  ),
              },
            );

          toast.success(
            "Supplier Return created.",
          );

          router.push(
            `/admin/purchasing/returns/${id}`,
          );

          router.refresh();
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to create Supplier Return.",
          );
        }
      },
    );
  }


  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
            <RotateCcw className="size-4" />
          </div>

          <div>
            <h2 className="font-semibold">
              Return Information
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Select the original Quick Purchase and enter the Supplier Return details.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm font-medium">
              Quick Purchase
            </span>

            <select
              value={
                quickPurchaseId
              }
              onChange={(
                event,
              ) =>
                handlePurchaseChange(
                  event
                    .target
                    .value,
                )
              }
              disabled={
                isLoading ||
                isCreating
              }
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">
                Select a Quick Purchase...
              </option>

              {purchases.map(
                (purchase) => (
                  <option
                    key={
                      purchase.id
                    }
                    value={
                      purchase.id
                    }
                  >
                    {
                      purchase.purchaseNumber
                    }
                    {" — "}
                    {
                      purchase.supplierName
                    }
                    {" — "}
                    {
                      purchase.currencyCode
                    }{" "}
                    {money(
                      purchase.grandTotal,
                    )}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">
              Return Date
            </span>

            <input
              type="date"
              value={
                returnDate
              }
              onChange={(
                event,
              ) =>
                setReturnDate(
                  event
                    .target
                    .value,
                )
              }
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">
              Posting Date
            </span>

            <input
              type="date"
              value={
                postingDate
              }
              onChange={(
                event,
              ) =>
                setPostingDate(
                  event
                    .target
                    .value,
                )
              }
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm font-medium">
              Return Reason
            </span>

            <input
              type="text"
              value={reason}
              onChange={(
                event,
              ) =>
                setReason(
                  event
                    .target
                    .value,
                )
              }
              placeholder="Example: Damaged shipment or incorrect item"
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm font-medium">
              Notes
            </span>

            <textarea
              value={notes}
              onChange={(
                event,
              ) =>
                setNotes(
                  event
                    .target
                    .value,
                )
              }
              rows={3}
              placeholder="Optional internal notes"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      {selectedPurchase ? (
        <section className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2 xl:grid-cols-5">
          <InfoValue
            label="Quick Purchase"
            value={
              selectedPurchase.purchaseNumber
            }
          />

          <InfoValue
            label="Supplier"
            value={
              selectedPurchase.supplierName
            }
          />

          <InfoValue
            label="Purchase Date"
            value={
              selectedPurchase.purchaseDate
            }
          />

          <InfoValue
            label="Warehouse"
            value={
              selectedPurchase.warehouseName
            }
          />

          <InfoValue
            label="Tax Treatment"
            value={
              selectedPurchase.taxTreatment
                .replace(
                  /_/g,
                  " ",
                )
            }
          />
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">
            Return Items
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Select only quantities that are being returned to the supplier.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />

            Loading returnable items...
          </div>
        ) : !quickPurchaseId ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Select a Quick Purchase to view its returnable items.
          </div>
        ) : eligibleItems.length ===
          0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No returnable quantities remain on this Quick Purchase.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">
                    Return
                  </th>

                  <th className="px-4 py-3">
                    Item
                  </th>

                  <th className="px-4 py-3 text-right">
                    Purchased
                  </th>

                  <th className="px-4 py-3 text-right">
                    Returned
                  </th>

                  <th className="px-4 py-3 text-right">
                    Available
                  </th>

                  <th className="px-4 py-3">
                    Qty
                  </th>

                  <th className="px-4 py-3">
                    Reason
                  </th>

                  <th className="px-4 py-3">
                    Notes
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {eligibleItems.map(
                  (item) => {
                    const state =
                      lineState[
                        item.quickPurchaseItemId
                      ];

                    return (
                      <tr
                        key={
                          item.quickPurchaseItemId
                        }
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={
                              state
                                ?.selected ??
                              false
                            }
                            onChange={(
                              event,
                            ) =>
                              updateLine(
                                item.quickPurchaseItemId,
                                {
                                  selected:
                                    event
                                      .target
                                      .checked,

                                  quantity:
                                    event
                                      .target
                                      .checked &&
                                    !state
                                      ?.quantity
                                      ? String(
                                          item.quantityReturnable,
                                        )
                                      : state
                                          ?.quantity ??
                                        "",
                                },
                              )
                            }
                            className="size-4"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-medium">
                            {
                              item.productName
                            }
                          </p>

                          {item.productSku ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {
                                item.productSku
                              }
                            </p>
                          ) : null}

                          <p className="mt-1 text-xs text-muted-foreground">
                            Original cost: AED{" "}
                            {money(
                              item.originalInventoryUnitCost,
                            )}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-right">
                          {
                            item.purchasedQuantity
                          }
                        </td>

                        <td className="px-4 py-4 text-right">
                          {
                            item.quantityAlreadyReturned
                          }
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-emerald-700">
                          {
                            item.quantityReturnable
                          }
                        </td>

                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            max={
                              item.quantityReturnable
                            }
                            step="0.0001"
                            disabled={
                              !state?.selected
                            }
                            value={
                              state
                                ?.quantity ??
                              ""
                            }
                            onChange={(
                              event,
                            ) =>
                              updateLine(
                                item.quickPurchaseItemId,
                                {
                                  quantity:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                            className="h-10 w-28 rounded-md border bg-background px-3 text-sm disabled:bg-muted"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <input
                            type="text"
                            disabled={
                              !state?.selected
                            }
                            value={
                              state
                                ?.reason ??
                              ""
                            }
                            onChange={(
                              event,
                            ) =>
                              updateLine(
                                item.quickPurchaseItemId,
                                {
                                  reason:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                            placeholder="Optional line reason"
                            className="h-10 w-48 rounded-md border bg-background px-3 text-sm disabled:bg-muted"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <input
                            type="text"
                            disabled={
                              !state?.selected
                            }
                            value={
                              state
                                ?.notes ??
                              ""
                            }
                            onChange={(
                              event,
                            ) =>
                              updateLine(
                                item.quickPurchaseItemId,
                                {
                                  notes:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                            placeholder="Optional notes"
                            className="h-10 w-48 rounded-md border bg-background px-3 text-sm disabled:bg-muted"
                          />
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-medium">
            {selectedLines.length} line
            {selectedLines.length ===
            1
              ? ""
              : "s"}{" "}
            selected
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Total return quantity:{" "}
            {totals.quantity}
          </p>
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-4 sm:gap-6">
          <TotalValue
            label="Subtotal"
            value={`AED ${money(
              totals.subtotal,
            )}`}
          />

          <TotalValue
            label="VAT"
            value={`AED ${money(
              totals.tax,
            )}`}
          />

          <TotalValue
            label="Return Value"
            value={`AED ${money(
              totals.total,
            )}`}
          />

          <TotalValue
            label="Inventory Cost"
            value={`AED ${money(
              totals.inventoryCost,
            )}`}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/purchasing/returns",
              )
            }
            disabled={isCreating}
            className="h-10 rounded-md border px-4 text-sm font-medium"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              handleSubmit
            }
            disabled={
              isCreating ||
              isLoading ||
              selectedLines.length ===
                0
            }
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}

            Create Supplier Return
          </button>
        </div>
      </section>
    </div>
  );
}


function InfoValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  );
}


function TotalValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  );
}