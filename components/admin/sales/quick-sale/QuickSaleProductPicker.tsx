"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, Search } from "lucide-react";

import type { QuickSaleOptions } from "./quick-sale-types";

export type QuickSaleProductPickerHandle = {
  focus: () => void;
};

type QuickSaleProductPickerProps = {
  products: QuickSaleOptions["products"];
  value: string;
  onChange: (productId: string) => void;
  placeholder?: string;
};

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

export const QuickSaleProductPicker = forwardRef<
  QuickSaleProductPickerHandle,
  QuickSaleProductPickerProps
>(function QuickSaleProductPicker(
  {
    products,
    value,
    onChange,
    placeholder = "Type product name or SKU...",
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] =
    useState(0);

  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition>({
      top: 0,
      left: 0,
      width: 420,
    });

  const selectedProduct =
    products.find((product) => product.id === value) ?? null;

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLowerCase();

    if (!normalizedQuery) {
      return products.slice(0, 50);
    }

    return products
      .filter((product) => {
        const searchableText = [
          product.name,
          product.sku,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(
          normalizedQuery,
        );
      })
      .slice(0, 50);
  }, [products, query]);

  function updateDropdownPosition() {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    const rect = input.getBoundingClientRect();

    const viewportPadding = 16;

    const desiredWidth = Math.max(
      rect.width,
      420,
    );

    const availableWidth =
      window.innerWidth -
      viewportPadding * 2;

    const width = Math.min(
      desiredWidth,
      availableWidth,
    );

    let left = rect.left;

    if (
      left + width >
      window.innerWidth - viewportPadding
    ) {
      left =
        window.innerWidth -
        viewportPadding -
        width;
    }

    left = Math.max(
      viewportPadding,
      left,
    );

    const estimatedDropdownHeight = 330;

    const roomBelow =
      window.innerHeight - rect.bottom;

    const roomAbove = rect.top;

    const openAbove =
      roomBelow < estimatedDropdownHeight &&
      roomAbove > roomBelow;

    const top = openAbove
      ? Math.max(
          viewportPadding,
          rect.top -
            estimatedDropdownHeight -
            4,
        )
      : rect.bottom + 4;

    setDropdownPosition({
      top,
      left,
      width,
    });
  }

  function openPicker(
    selectCurrentText = false,
  ) {
    updateDropdownPosition();

    setHighlightedIndex(0);
    setOpen(true);

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();

      if (selectCurrentText) {
        inputRef.current?.select();
      }
    });
  }

  function closePicker() {
    setOpen(false);
    setHighlightedIndex(0);
  }

  function selectProduct(
    productId: string,
  ) {
    const product =
      products.find(
        (option) =>
          option.id === productId,
      ) ?? null;

    onChange(productId);

    setQuery(product?.name ?? "");
    setOpen(false);
    setHighlightedIndex(0);
  }

  function clearSelectionForSearch(
    nextQuery: string,
  ) {
    setQuery(nextQuery);

    if (value) {
      onChange("");
    }

    setHighlightedIndex(0);

    if (!open) {
      openPicker();
    }
  }

  useEffect(() => {
    if (open) {
      return;
    }

    setQuery(
      selectedProduct?.name ?? "",
    );
  }, [
    open,
    selectedProduct?.id,
    selectedProduct?.name,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleViewportChange() {
      updateDropdownPosition();
    }

    window.addEventListener(
      "resize",
      handleViewportChange,
    );

    window.addEventListener(
      "scroll",
      handleViewportChange,
      true,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleViewportChange,
      );

      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true,
      );
    };
  }, [open]);

  useEffect(() => {
    if (
      highlightedIndex <
      filteredProducts.length
    ) {
      return;
    }

    setHighlightedIndex(0);
  }, [
    filteredProducts.length,
    highlightedIndex,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        setQuery("");

        window.requestAnimationFrame(() => {
          openPicker();
        });
      },
    }),
    [],
  );

  const dropdown =
    open &&
    typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close product search"
              className="fixed inset-0 z-[90] cursor-default"
              onMouseDown={(event) => {
                event.preventDefault();
                closePicker();
              }}
            />

            <div
              className="fixed z-[100] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                maxWidth:
                  "calc(100vw - 32px)",
              }}
            >
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                  <Search className="h-3.5 w-3.5" />
                  Search results
                </div>
              </div>

              <div className="max-h-[280px] overflow-y-auto overscroll-contain p-1">
                {filteredProducts.length ===
                0 ? (
                  <div className="px-3 py-8 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      No products found
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Search by product name or
                      SKU.
                    </p>
                  </div>
                ) : (
                  filteredProducts.map(
                    (product, index) => {
                      const active =
                        index ===
                        highlightedIndex;

                      return (
                        <button
                          key={product.id}
                          type="button"
                          onMouseEnter={() =>
                            setHighlightedIndex(
                              index,
                            )
                          }
                          onMouseDown={(
                            event,
                          ) => {
                            event.preventDefault();

                            selectProduct(
                              product.id,
                            );
                          }}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left outline-none transition ${
                            active
                              ? "bg-amber-50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-900">
                              {product.name}
                            </span>

                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              {product.sku
                                ? `SKU: ${product.sku}`
                                : "No SKU"}
                              {" · "}
                              {product.unitShortName ??
                                product.unitName ??
                                "PCS"}
                            </span>
                          </span>

                          {value ===
                          product.id ? (
                            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : null}
                        </button>
                      );
                    },
                  )
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
                <span>
                  ↑ ↓ Navigate · Enter Select
                </span>

                {products.length > 50 &&
                !query.trim() ? (
                  <span>
                    Showing first 50
                  </span>
                ) : null}
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => {
            if (!open) {
              openPicker();
            }
          }}
          onClick={() => {
            if (!open) {
              openPicker();
            }
          }}
          onChange={(event) => {
            clearSelectionForSearch(
              event.target.value,
            );
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();

              closePicker();

              if (selectedProduct) {
                setQuery(
                  selectedProduct.name,
                );
              }

              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();

              if (!open) {
                openPicker();
                return;
              }

              setHighlightedIndex(
                (current) =>
                  filteredProducts.length ===
                  0
                    ? 0
                    : (current + 1) %
                      filteredProducts.length,
              );

              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();

              if (!open) {
                openPicker();
                return;
              }

              setHighlightedIndex(
                (current) =>
                  filteredProducts.length ===
                  0
                    ? 0
                    : (current -
                        1 +
                        filteredProducts.length) %
                      filteredProducts.length,
              );

              return;
            }

            if (event.key === "Enter") {
              if (
                !open ||
                filteredProducts.length === 0
              ) {
                return;
              }

              event.preventDefault();

              const product =
                filteredProducts[
                  highlightedIndex
                ] ??
                filteredProducts[0];

              if (product) {
                selectProduct(product.id);
              }
            }
          }}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        />
      </div>

      {dropdown}
    </>
  );
});