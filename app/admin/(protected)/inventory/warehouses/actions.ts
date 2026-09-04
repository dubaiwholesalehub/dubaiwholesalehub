"use server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    createWarehouse,
    setWarehouseActiveStatus,
    updateWarehouse,
} from "@/lib/repositories/warehouse.repository";
import {
    warehouseSchema,
    type WarehouseValidatedValues,
} from "@/lib/validation/warehouse.schema";

const WAREHOUSE_LIST_URL =
    "/admin/inventory/warehouses";

function getErrorMessage(
    error: unknown,
    fallback: string,
): string {
    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
    ) {
        return error.message;
    }

    return fallback;
}

export async function createWarehouseAction(
    values: WarehouseValidatedValues,
): Promise<void> {
    await requireAdmin();

    let warehouseId: string;

    try {
        const validated =
            warehouseSchema.parse(values);

        const warehouse =
            await createWarehouse({
                code: validated.code,
                name: validated.name,

                address_line_1:
                    validated.address_line_1 ?? null,

                address_line_2:
                    validated.address_line_2 ?? null,

                city: validated.city ?? null,
                state: validated.state ?? null,
                country: validated.country ?? null,

                postal_code:
                    validated.postal_code ?? null,

                contact_person:
                    validated.contact_person ?? null,

                phone: validated.phone ?? null,
                email: validated.email ?? null,

                is_active: validated.is_active,
                is_default: validated.is_default,
            });

        warehouseId = warehouse.id;
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to create the warehouse.",
            ),
        );
    }

    revalidatePath(WAREHOUSE_LIST_URL);

    redirect(
        `/admin/inventory/warehouses/${warehouseId}`,
    );
}

export async function updateWarehouseAction(
    warehouseId: string,
    values: WarehouseValidatedValues,
): Promise<void> {
    await requireAdmin();

    const id = warehouseId.trim();

    if (!id) {
        throw new Error(
            "Warehouse ID is required.",
        );
    }

    try {
        const validated =
            warehouseSchema.parse(values);

        await updateWarehouse(id, {
            code: validated.code,
            name: validated.name,

            address_line_1:
                validated.address_line_1 ?? null,

            address_line_2:
                validated.address_line_2 ?? null,

            city: validated.city ?? null,
            state: validated.state ?? null,
            country: validated.country ?? null,

            postal_code:
                validated.postal_code ?? null,

            contact_person:
                validated.contact_person ?? null,

            phone: validated.phone ?? null,
            email: validated.email ?? null,

            is_active: validated.is_active,
            is_default: validated.is_default,
        });
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to update the warehouse.",
            ),
        );
    }

    revalidatePath(WAREHOUSE_LIST_URL);

    revalidatePath(
        `/admin/inventory/warehouses/${id}`,
    );

    redirect(
        `/admin/inventory/warehouses/${id}`,
    );
}

export interface WarehouseStatusActionState {
    success: boolean;
    message: string | null;
}

export async function changeWarehouseStatusAction(
    warehouseId: string,
    isActive: boolean,
): Promise<WarehouseStatusActionState> {
    await requireAdmin();

    const id = warehouseId.trim();

    if (!id) {
        return {
            success: false,
            message: "Warehouse ID is required.",
        };
    }

    try {
        const warehouse =
            await setWarehouseActiveStatus(
                id,
                isActive,
            );

        revalidatePath(
            "/admin/inventory/warehouses",
        );

        revalidatePath(
            `/admin/inventory/warehouses/${id}`,
        );

        return {
            success: true,
            message: warehouse.is_active
                ? "Warehouse activated successfully."
                : "Warehouse deactivated successfully.",
        };
    } catch (error) {
        return {
            success: false,
            message: getErrorMessage(
                error,
                "Unable to update warehouse status.",
            ),
        };
    }
}