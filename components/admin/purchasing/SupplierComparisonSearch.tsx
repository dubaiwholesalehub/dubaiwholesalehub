"use client";

import {
  Search,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

export interface SupplierComparisonProductOption {
  id: string;
  name: string;
  sku: string | null;
}

interface SupplierComparisonSearchProps {
  products:
    SupplierComparisonProductOption[];
}

export default function SupplierComparisonSearch({
  products,
}: SupplierComparisonSearchProps) {
  const router =
    useRouter();

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedProductId,
    setSelectedProductId,
  ] = useState("");

  const [
    quantity,
    setQuantity,
  ] = useState("1");

  const filteredProducts =
    useMemo(
      () => {
        const value =
          search
            .trim()
            .toLowerCase();

        if (!value) {
          return products.slice(
            0,
            20,
          );
        }

        return products
          .filter(
            (product) => {
              const name =
                product.name
                  .toLowerCase();

              const sku =
                product.sku
                  ?.toLowerCase() ??
                "";

              return (
                name.includes(
                  value,
                ) ||
                sku.includes(
                  value,
                )
              );
            },
          )
          .slice(
            0,
            20,
          );
      },
      [
        products,
        search,
      ],
    );

  const selectedProduct =
    useMemo(
      () =>
        products.find(
          (product) =>
            product.id ===
            selectedProductId,
        ) ??
        null,
      [
        products,
        selectedProductId,
      ],
    );

  function handleCompare() {
    if (
      !selectedProductId
    ) {
      return;
    }

    const parsedQuantity =
      Number(
        quantity,
      );

    const safeQuantity =
      Number.isFinite(
        parsedQuantity,
      ) &&
      parsedQuantity >
        0
        ? parsedQuantity
        : 1;

    router.push(
      `/admin/purchasing/supplier-comparison/${selectedProductId}?quantity=${encodeURIComponent(
        String(
          safeQuantity,
        ),
      )}`,
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
        <div>
          <label className="text-sm font-semibold text-neutral-700">
            Search Product
          </label>

          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />

            <input
              type="text"
              value={search}
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder="Search by product name or SKU..."
              className="h-11 w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-neutral-700">
            Required Quantity
          </label>

          <input
            type="number"
            min="0.001"
            step="0.001"
            value={quantity}
            onChange={(
              event,
            ) =>
              setQuantity(
                event.target
                  .value,
              )
            }
            className="mt-2 h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {filteredProducts.length ===
        0 ? (
          <div className="px-5 py-8 text-center">
            <p className="font-medium text-neutral-700">
              No matching products
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              Try another product name or SKU.
            </p>
          </div>
        ) : (
          <div className="max-h-[420px] divide-y divide-neutral-100 overflow-y-auto">
            {filteredProducts.map(
              (product) => {
                const selected =
                  selectedProductId ===
                  product.id;

                return (
                  <button
                    key={
                      product.id
                    }
                    type="button"
                    onClick={() =>
                      setSelectedProductId(
                        product.id,
                      )
                    }
                    className={[
                      "flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition",
                      selected
                        ? "bg-orange-50"
                        : "hover:bg-neutral-50",
                    ].join(
                      " ",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-neutral-950">
                        {
                          product.name
                        }
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        {product.sku
                          ? `SKU: ${product.sku}`
                          : "No SKU"}
                      </p>
                    </div>

                    <div
                      className={[
                        "size-4 shrink-0 rounded-full border",
                        selected
                          ? "border-orange-600 bg-orange-600"
                          : "border-neutral-300 bg-white",
                      ].join(
                        " ",
                      )}
                    />
                  </button>
                );
              },
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Selected Product
          </p>

          <p className="mt-1 font-semibold text-neutral-950">
            {selectedProduct
              ? selectedProduct
                  .name
              : "None selected"}
          </p>

          {selectedProduct
            ?.sku ? (
              <p className="mt-1 text-xs text-neutral-500">
                SKU:{" "}
                {
                  selectedProduct
                    .sku
                }
              </p>
            ) : null}
        </div>

        <button
          type="button"
          onClick={
            handleCompare
          }
          disabled={
            !selectedProductId
          }
          className="inline-flex h-11 items-center justify-center rounded-lg bg-orange-600 px-5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Compare Suppliers
        </button>
      </div>
    </div>
  );
}