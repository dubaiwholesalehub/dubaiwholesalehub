"use client";

import { useState } from "react";
import Link from "next/link";

import type { InventoryTransferDetails } from "@/lib/repositories/inventory-transfer.repository";

import type { ProductLookupOption } from "@/lib/repositories/product.repository";

import { ProductCombobox } from "@/components/admin/products/ProductCombobox";
import { addTransferItem } from "./actions";

interface AddTransferItemFormProps {
  transfer: InventoryTransferDetails;
  products: ProductLookupOption[];
}

export function AddTransferItemForm({
  transfer,
  products,
}: AddTransferItemFormProps) {
  const [productId, setProductId] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [lineNotes, setLineNotes] = useState("");
  const formAction = addTransferItem.bind(null, transfer.id);

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium">Product</label>

          <ProductCombobox
            name="productId"
            products={products}
            value={productId}
            onChange={setProductId}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Requested Quantity
            </label>

            <input
              name="requestedQuantity"
              type="number"
              min={1}
              value={requestedQuantity}
              onChange={(e) => setRequestedQuantity(Number(e.target.value))}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Unit Cost (AED)
            </label>

            <input
              name="unitCost"
              type="number"
              min={0}
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value))}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Notes</label>

          <textarea
            name="lineNotes"
            rows={4}
            value={lineNotes}
            onChange={(e) => setLineNotes(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link
          href={`/admin/inventory/transfers/${transfer.id}`}
          className="rounded-md border px-4 py-2"
        >
          Cancel
        </Link>

        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Add Item
        </button>
      </div>
    </form>
  );
}
