import { notFound } from "next/navigation";

import { getInventoryTransferById } from "@/lib/repositories/inventory-transfer.repository";
import { getProductLookupOptions } from "@/lib/repositories/product.repository";

import { AddTransferItemForm } from "./AddTransferItemForm";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AddTransferItemPage({
  params,
}: PageProps) {
  const { id } = await params;

  const [transfer, products] = await Promise.all([
    getInventoryTransferById(id),
    getProductLookupOptions(),
  ]);

  if (!transfer) {
    notFound();
  }

  if (transfer.status !== "draft") {
    throw new Error(
      "Items can only be added while the transfer is in Draft status.",
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Add Transfer Item
        </h1>

        <p className="text-sm text-muted-foreground">
          Transfer {transfer.transfer_number}
        </p>
      </div>

      <AddTransferItemForm
        transfer={transfer}
        products={products}
      />
    </div>
  );
}