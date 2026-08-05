"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import {
  Barcode,
  Check,
  ChevronsUpDown,
  PackageSearch,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SalesQuotationItemProductOption } from "@/lib/repositories/sales-quotation.repository";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

export interface SmartProductPickerHandle {
  focus: () => void;
}

interface SmartProductPickerProps {
  products: SalesQuotationItemProductOption[];

  value: string;

  disabled?: boolean;

  rowNumber?: number;

  onChange: (productId: string) => void;

  onProductSelected?: (product: SalesQuotationItemProductOption | null) => void;
}

const MAX_VISIBLE_RESULTS = 30;

const SmartProductPicker = forwardRef<
  SmartProductPickerHandle,
  SmartProductPickerProps
>(function SmartProductPicker(
  { products, value, disabled = false, rowNumber, onChange, onProductSelected },
  forwardedRef,
) {
  const containerRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");

  const [isOpen, setIsOpen] = useState(false);

  const [activeIndex, setActiveIndex] = useState(0);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === value) ?? null,
    [products, value],
  );

  useImperativeHandle(
    forwardedRef,
    () => ({
      focus() {
        inputRef.current?.focus();
      },
    }),
    [],
  );

  const [isMounted, setIsMounted] = useState(false);

  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 420,
    maxHeight: 320,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);

    if (!normalizedQuery) {
      return products.slice(0, MAX_VISIBLE_RESULTS);
    }

    const exactBarcodeMatches: SalesQuotationItemProductOption[] = [];

    const normalMatches: SalesQuotationItemProductOption[] = [];

    for (const product of products) {
      const normalizedBarcode = normalizeSearchValue(product.barcode ?? "");

      if (normalizedBarcode && normalizedBarcode === normalizedQuery) {
        exactBarcodeMatches.push(product);

        continue;
      }

      const searchableText = normalizeSearchValue(
        [product.name, product.sku, product.barcode].filter(Boolean).join(" "),
      );

      if (searchableText.includes(normalizedQuery)) {
        normalMatches.push(product);
      }

      if (
        exactBarcodeMatches.length + normalMatches.length >=
        MAX_VISIBLE_RESULTS
      ) {
        break;
      }
    }

    return [...exactBarcodeMatches, ...normalMatches].slice(
      0,
      MAX_VISIBLE_RESULTS,
    );
  }, [products, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      const clickedInsideInput =
        containerRef.current?.contains(target) ?? false;

      const clickedInsideDropdown =
        dropdownRef.current?.contains(target) ?? false;

      if (!clickedInsideInput && !clickedInsideDropdown) {
        setIsOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex]);

  function selectProduct(product: SalesQuotationItemProductOption | null) {
    onChange(product?.id ?? "");

    onProductSelected?.(product);

    setQuery("");
    setIsOpen(false);
    setActiveIndex(0);
  }

  function updateDropdownPosition() {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();

    const viewportPadding = 12;
    const gap = 6;

    const minimumWidth = Math.max(rect.width, 420);

    const availableBelow =
      window.innerHeight - rect.bottom - viewportPadding - gap;

    const availableAbove = rect.top - viewportPadding - gap;

    const openAbove = availableBelow < 240 && availableAbove > availableBelow;

    const maxHeight = Math.max(
      180,
      Math.min(420, openAbove ? availableAbove : availableBelow),
    );

    const requestedLeft = rect.left;

    const maximumLeft = window.innerWidth - minimumWidth - viewportPadding;

    const left = Math.max(
      viewportPadding,
      Math.min(requestedLeft, maximumLeft),
    );

    setDropdownPosition({
      top: openAbove ? rect.top - gap : rect.bottom + gap,

      left,

      width: minimumWidth,
      maxHeight,
    });
  }

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updateDropdownPosition();

    function handlePositionChange() {
      updateDropdownPosition();
    }

    window.addEventListener("resize", handlePositionChange);

    window.addEventListener("scroll", handlePositionChange, true);

    return () => {
      window.removeEventListener("resize", handlePositionChange);

      window.removeEventListener("scroll", handlePositionChange, true);
    };
  }, [isOpen]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      setActiveIndex((current) =>
        Math.min(current + 1, filteredProducts.length - 1),
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveIndex((current) => Math.max(current - 1, 0));

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      const activeProduct = filteredProducts[activeIndex];

      if (activeProduct) {
        selectProduct(activeProduct);
      }

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      setIsOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          ref={inputRef}
          value={
            isOpen
              ? query
              : selectedProduct
                ? getProductDisplayName(selectedProduct)
                : query
          }
          disabled={disabled}
          autoComplete="off"
          aria-expanded={isOpen}
          aria-controls={`product-picker-results-${rowNumber ?? "default"}`}
          aria-label={
            rowNumber ? `Search product row ${rowNumber}` : "Search product"
          }
          placeholder="Search name, SKU or barcode..."
          className="pl-8 pr-16"
          onFocus={() => {
            setIsOpen(true);

            if (selectedProduct && !query) {
              setQuery("");
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value);

            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />

        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
          {selectedProduct ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              aria-label="Clear selected product"
              onClick={() => selectProduct(null)}
            >
              <X className="size-3.5" />
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            aria-label="Open product search"
            onClick={() => {
              setIsOpen((current) => !current);

              requestAnimationFrame(() => inputRef.current?.focus());
            }}
          >
            <ChevronsUpDown className="size-3.5" />
          </Button>
        </div>
      </div>

      {isOpen && isMounted
        ? createPortal(
            <div
              ref={dropdownRef}
              id={`product-picker-results-${rowNumber ?? "default"}`}
              role="listbox"
              style={{
                position: "fixed",

                top: dropdownPosition.top,

                left: dropdownPosition.left,

                width: dropdownPosition.width,

                maxHeight: dropdownPosition.maxHeight,

                transform:
                  dropdownPosition.top <
                  (containerRef.current?.getBoundingClientRect().top ?? 0)
                    ? "translateY(-100%)"
                    : undefined,
              }}
              className="z-[9999] overflow-y-auto rounded-xl border bg-popover p-1 shadow-2xl"
            >
              <button
                type="button"
                role="option"
                aria-selected={!selectedProduct}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectProduct(null)}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <PackageSearch className="size-4" />
                </div>

                <div>
                  <p className="font-medium">Custom item</p>

                  <p className="text-xs text-muted-foreground">
                    Add an item without linking a product
                  </p>
                </div>
              </button>

              <div className="my-1 border-t" />

              {filteredProducts.length > 0 ? (
                filteredProducts.map((product, index) => (
                  <button
                    key={product.id}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    role="option"
                    aria-selected={product.id === value}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      index === activeIndex ? "bg-muted" : "hover:bg-muted/70",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectProduct(product)}
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {product.barcode &&
                      normalizeSearchValue(query) ===
                        normalizeSearchValue(product.barcode) ? (
                        <Barcode className="size-4" />
                      ) : (
                        <PackageSearch className="size-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium leading-5">{product.name}</p>

                        {product.id === value ? (
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        ) : null}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>SKU: {product.sku ?? "—"}</span>

                        {product.barcode ? (
                          <span>Barcode: {product.barcode}</span>
                        ) : null}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <FulfilmentBadge method={product.fulfilment_method} />

                        {product.procurement_lead_time_days > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {product.procurement_lead_time_days} day lead time
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center">
                  <PackageSearch className="mx-auto size-7 text-muted-foreground" />

                  <p className="mt-3 text-sm font-medium">No products found</p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Try another name, SKU, or barcode.
                  </p>
                </div>
              )}

              <div className="sticky bottom-0 mt-1 border-t bg-popover px-3 py-2 text-xs text-muted-foreground">
                ↑ ↓ Navigate · Enter select · Esc close
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
});

export default SmartProductPicker;

function getProductDisplayName(
  product: SalesQuotationItemProductOption,
): string {
  return product.sku ? `${product.sku} — ${product.name}` : product.name;
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function FulfilmentBadge({
  method,
}: {
  method: SalesQuotationItemProductOption["fulfilment_method"];
}) {
  const labels: Record<
    SalesQuotationItemProductOption["fulfilment_method"],
    string
  > = {
    stock: "Stock Item",
    local_purchase: "Local Purchase",
    import_on_demand: "Import on Demand",
    dropship: "Drop Ship",
    service: "Service",
  };

  return (
    <span className="inline-flex rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {labels[method]}
    </span>
  );
}
