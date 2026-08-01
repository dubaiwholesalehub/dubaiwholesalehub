"use client";

import { ProductLookupOption } from "@/lib/repositories/product.repository";

interface ProductComboboxProps {
  products: ProductLookupOption[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  disabled?: boolean;
}

export function ProductCombobox({
  products,
  value,
  onChange,
  name,
  disabled,
}: ProductComboboxProps) {
  return (
    <select
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    >
      <option value="">Select a product</option>

      {products.map((product) => (
        <option key={product.id} value={product.id}>
          {product.sku ? `${product.sku} - ${product.name}` : product.name}
        </option>
      ))}
    </select>
  );
}
