"use client";

import {
  useActionState,
  useEffect,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  useRouter,
} from "next/navigation";

import {
  Save,
} from "lucide-react";

import {
  updateGoodsReceiptItemsAction,
  type UpdateGoodsReceiptItemsState,
} from "@/app/admin/actions/goods-receipts/update-items";

import type {
  GoodsReceiptItemDetail,
} from "@/lib/repositories/goods-receipts";

interface GoodsReceiptItemEditorProps {
  goodsReceiptId: string;

  items:
    GoodsReceiptItemDetail[];
}

const initialState:
  UpdateGoodsReceiptItemsState =
  {
    status: "idle",
    message: "",
  };

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits:
        3,
    },
  ).format(value);
}

export default function GoodsReceiptItemEditor({
  goodsReceiptId,
  items,
}: GoodsReceiptItemEditorProps) {
  const router =
    useRouter();

  const [
    state,
    formAction,
  ] = useActionState(
    updateGoodsReceiptItemsAction,
    initialState,
  );

  useEffect(() => {
    if (
      state.status ===
      "success"
    ) {
      router.refresh();
    }
  }, [
    router,
    state.status,
  ]);

  return (
    <form
      action={
        formAction
      }
      className="space-y-4"
    >
      <input
        type="hidden"
        name="goodsReceiptId"
        value={
          goodsReceiptId
        }
      />

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="font-semibold text-neutral-950">
            Receiving & Inspection
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Enter the actual received quantity. Accepted, rejected and damaged quantities are optional unless inspection is required.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1450px] w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <Heading>
                  Product
                </Heading>

                <Heading align="right">
                  Ordered
                </Heading>

                <Heading align="right">
                  Previous
                </Heading>

                <Heading align="right">
                  Remaining
                </Heading>

                <Heading align="right">
                  Receiving
                </Heading>

                <Heading align="right">
                  Accepted
                </Heading>

                <Heading align="right">
                  Rejected
                </Heading>

                <Heading align="right">
                  Damaged
                </Heading>

                <Heading>
                  Rejection Reason
                </Heading>

                <Heading>
                  Notes
                </Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {items.map(
                (item) => {
                  const remaining =
                    Math.max(
                      Number(
                        item.ordered_quantity,
                      ) -
                        Number(
                          item.previously_received_quantity,
                        ),
                      0,
                    );

                  return (
                    <tr
                      key={
                        item.id
                      }
                      className="align-top"
                    >
                      <td className="px-4 py-4">
                        <input
                          type="hidden"
                          name="itemId"
                          value={
                            item.id
                          }
                        />

                        <p className="min-w-48 font-medium text-neutral-950">
                          {
                            item
                              .product
                              .name
                          }
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {
                            item
                              .product
                              .sku
                          }
                        </p>
                      </td>

                      <NumberCell
                        value={
                          item.ordered_quantity
                        }
                      />

                      <NumberCell
                        value={
                          item.previously_received_quantity
                        }
                      />

                      <td className="px-4 py-4 text-right text-sm font-semibold text-orange-700">
                        {formatNumber(
                          remaining,
                        )}
                      </td>

                      <InputCell
                        name={`receiving:${item.id}`}
                        defaultValue={
                          item.receiving_quantity
                        }
                        max={
                          remaining
                        }
                      />

                      <InputCell
                        name={`accepted:${item.id}`}
                        defaultValue={
                          item.accepted_quantity
                        }
                        max={
                          remaining
                        }
                      />

                      <InputCell
                        name={`rejected:${item.id}`}
                        defaultValue={
                          item.rejected_quantity
                        }
                        max={
                          remaining
                        }
                      />

                      <InputCell
                        name={`damaged:${item.id}`}
                        defaultValue={
                          item.damaged_quantity
                        }
                        max={
                          remaining
                        }
                      />

                      <td className="px-4 py-4">
                        <input
                          type="text"
                          name={`rejectionReason:${item.id}`}
                          defaultValue={
                            item.rejection_reason ??
                            ""
                          }
                          placeholder="If rejected"
                          className="h-10 w-48 rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="text"
                          name={`notes:${item.id}`}
                          defaultValue={
                            item.notes ??
                            ""
                          }
                          placeholder="Optional notes"
                          className="h-10 w-56 rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-neutral-600">
            Leave Accepted / Rejected / Damaged at zero to automatically accept the Receiving quantity when the GRN is completed.
          </div>

          <SaveButton />
        </div>
      </section>

      {state.status ===
      "error" ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </div>
      ) : null}

      {state.status ===
      "success" ? (
        <div
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {state.message}
        </div>
      ) : null}
    </form>
  );
}

function Heading({
  children,
  align = "left",
}: {
  children:
    React.ReactNode;

  align?:
    | "left"
    | "right";
}) {
  return (
    <th
      className={[
        "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600",
        align ===
        "right"
          ? "text-right"
          : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function NumberCell({
  value,
}: {
  value: number;
}) {
  return (
    <td className="px-4 py-4 text-right text-sm text-neutral-700">
      {formatNumber(
        value,
      )}
    </td>
  );
}

function InputCell({
  name,
  defaultValue,
  max,
}: {
  name: string;

  defaultValue:
    number;

  max: number;
}) {
  return (
    <td className="px-4 py-4 text-right">
      <input
        type="number"
        name={
          name
        }
        min="0"
        max={
          max
        }
        step="0.001"
        defaultValue={
          defaultValue
        }
        className="h-10 w-28 rounded-md border border-neutral-300 bg-white px-3 text-right text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
      />
    </td>
  );
}

function SaveButton() {
  const {
    pending,
  } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        pending
      }
      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-orange-600 px-5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Save className="size-4" />

      {pending
        ? "Saving..."
        : "Save Receiving"}
    </button>
  );
}