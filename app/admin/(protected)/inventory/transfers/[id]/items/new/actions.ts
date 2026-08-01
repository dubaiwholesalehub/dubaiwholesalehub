"use server";

import { redirect } from "next/navigation";

import {
    createInventoryTransferItem,
    getInventoryTransferById,
} from "@/lib/repositories/inventory-transfer.repository";

export async function addTransferItem(
    transferId: string,
    formData: FormData,
) {
    const productId = String(
        formData.get("productId") ?? "",
    ).trim();

    const requestedQuantity = Number(
        formData.get("requestedQuantity"),
    );

    const unitCost = Number(
        formData.get("unitCost"),
    );

    const lineNotes = String(
        formData.get("lineNotes") ?? "",
    );

    const transfer =
        await getInventoryTransferById(
            transferId,
        );

    if (!transfer) {
        throw new Error(
            "Inventory transfer not found.",
        );
    }

    if (transfer.status !== "draft") {
        throw new Error(
            "Only draft transfers can be edited.",
        );
    }

    const nextLineNumber =
        Math.max(
            0,
            ...transfer.items.map(
                (item) => item.line_number,
            ),
        ) + 1;

    await createInventoryTransferItem({
        inventory_transfer_id:
            transfer.id,

        product_id: productId,

        line_number: nextLineNumber,

        requested_quantity:
            requestedQuantity,

        unit_cost: unitCost,

        line_notes:
            lineNotes || null,
    });

    redirect(
        `/admin/inventory/transfers/${transfer.id}`,
    );
}