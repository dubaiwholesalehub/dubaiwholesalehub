import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

/* =========================================================
 * Database Types
 * ========================================================= */

type WarehouseRow =
    Database["public"]["Tables"]["warehouses"]["Row"];

/* =========================================================
 * Warehouse Models
 * ========================================================= */

export interface Warehouse {
    id: string;

    code: string;
    name: string;

    address_line_1: string | null;
    address_line_2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;

    contact_person: string | null;
    phone: string | null;
    email: string | null;

    is_active: boolean;
    is_default: boolean;

    created_at: string;
    updated_at: string;
}

/* =========================================================
 * Create and Update Inputs
 * ========================================================= */

export interface CreateWarehouseInput {
    code: string;
    name: string;

    address_line_1?: string | null;
    address_line_2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postal_code?: string | null;

    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;

    is_active?: boolean;
    is_default?: boolean;
}

export interface WarehouseLookupOption {
    id: string;
    code: string;
    name: string;
}

export type UpdateWarehouseInput =
    Partial<CreateWarehouseInput>;

/* =========================================================
 * Warehouse List Input and Result
 * ========================================================= */

export interface GetWarehousesInput {
    search?: string;

    isActive?: boolean | "all";

    page?: number;

    pageSize?: number;
}

export interface GetWarehousesResult {
    data: Warehouse[];

    count: number;

    page: number;

    pageSize: number;

    totalPages: number;
}

export interface WarehouseSummary {
    total: number;
    active: number;
    inactive: number;
    defaultWarehouse: WarehouseLookupOption | null;
}

/* =========================================================
 * Validation Helpers
 * ========================================================= */

function validateWarehouseCode(
    code: string,
): void {
    if (!code.trim()) {
        throw new Error(
            "Warehouse code is required.",
        );
    }
}

function validateWarehouseName(
    name: string,
): void {
    if (!name.trim()) {
        throw new Error(
            "Warehouse name is required.",
        );
    }
}

/* =========================================================
 * Pagination Helpers
 * ========================================================= */

function normalizePage(
    value: number | undefined,
): number {
    if (
        value === undefined ||
        !Number.isFinite(value)
    ) {
        return 1;
    }

    return Math.max(
        Math.floor(value),
        1,
    );
}

function normalizePageSize(
    value: number | undefined,
): number {
    if (
        value === undefined ||
        !Number.isFinite(value)
    ) {
        return 25;
    }

    return Math.min(
        Math.max(
            Math.floor(value),
            1,
        ),
        100,
    );
}

function sanitizeSearchTerm(
    value: string,
): string {
    return value
        .trim()
        .replaceAll(",", " ")
        .replaceAll("(", " ")
        .replaceAll(")", " ")
        .replaceAll('"', " ")
        .replace(/\s+/g, " ");
}

/* =========================================================
 * Data Mapping
 * ========================================================= */

function mapWarehouseRow(
    row: WarehouseRow,
): Warehouse {
    return {
        id: row.id,

        code: row.code,
        name: row.name,

        address_line_1:
            row.address_line_1,

        address_line_2:
            row.address_line_2,

        city: row.city,
        state: row.state,
        country: row.country,

        postal_code:
            row.postal_code,

        contact_person:
            row.contact_person,

        phone: row.phone,
        email: row.email,

        is_active:
            row.is_active,

        is_default:
            row.is_default,

        created_at:
            row.created_at,

        updated_at:
            row.updated_at,
    };
}

/* =========================================================
 * Get All Warehouses
 * ========================================================= */

export async function getWarehouses(): Promise<
    Warehouse[]
> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("code", {
            ascending: true,
        });

    if (error) {
        throw new Error(
            `Unable to load warehouses: ${error.message}`,
        );
    }

    const rows =
        (data ?? []) as WarehouseRow[];

    return rows.map(mapWarehouseRow);
}

/* =========================================================
 * Get Active Warehouses
 * ========================================================= */

export async function getActiveWarehouses(): Promise<
    Warehouse[]
> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("is_active", true)
        .order("is_default", {
            ascending: false,
        })
        .order("name", {
            ascending: true,
        });

    if (error) {
        throw new Error(
            `Unable to load active warehouses: ${error.message}`,
        );
    }

    const rows =
        (data ?? []) as WarehouseRow[];

    return rows.map(mapWarehouseRow);
}

/* =========================================================
 * Get Warehouse Page
 * ========================================================= */

export async function getWarehousePage({
    search,
    isActive,
    page,
    pageSize,
}: GetWarehousesInput = {}): Promise<GetWarehousesResult> {
    const supabase = await createClient();

    const currentPage =
        normalizePage(page);

    const currentPageSize =
        normalizePageSize(pageSize);

    const rangeStart =
        (currentPage - 1) *
        currentPageSize;

    const rangeEnd =
        rangeStart +
        currentPageSize -
        1;

    const searchTerm =
        sanitizeSearchTerm(
            search ?? "",
        );

    let query = supabase
        .from("warehouses")
        .select("*", {
            count: "exact",
        });

    if (
        isActive !== undefined &&
        isActive !== "all"
    ) {
        query = query.eq(
            "is_active",
            isActive,
        );
    }

    if (searchTerm) {
        query = query.or(
            [
                `code.ilike.%${searchTerm}%`,
                `name.ilike.%${searchTerm}%`,
                `city.ilike.%${searchTerm}%`,
                `country.ilike.%${searchTerm}%`,
                `contact_person.ilike.%${searchTerm}%`,
            ].join(","),
        );
    }

    const {
        data,
        error,
        count,
    } = await query
        .order("is_default", {
            ascending: false,
        })
        .order("code", {
            ascending: true,
        })
        .range(
            rangeStart,
            rangeEnd,
        );

    if (error) {
        throw new Error(
            `Unable to load warehouses: ${error.message}`,
        );
    }

    const rows =
        (data ?? []) as WarehouseRow[];

    const totalCount =
        count ?? 0;

    return {
        data:
            rows.map(mapWarehouseRow),

        count:
            totalCount,

        page:
            currentPage,

        pageSize:
            currentPageSize,

        totalPages:
            Math.max(
                Math.ceil(
                    totalCount /
                    currentPageSize,
                ),
                1,
            ),
    };
}

export async function getWarehouseLookupOptions(): Promise<
    WarehouseLookupOption[]
> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("warehouses")
        .select("id, code, name")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("code");

    if (error) {
        throw new Error(
            `Unable to load warehouses: ${error.message}`,
        );
    }

    return (data ?? []).map((warehouse) => ({
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
    }));
}

export async function getWarehouseById(
    id: string,
): Promise<Warehouse | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to load warehouse: ${error.message}`,
        );
    }

    if (!data) {
        return null;
    }

    return mapWarehouseRow(data);
}

export async function createWarehouse(
    input: CreateWarehouseInput,
): Promise<Warehouse> {
    validateWarehouseInput(input);

    const supabase = await createClient();

    const payload = {
        ...input,
        code: input.code.trim(),
        name: input.name.trim(),
    };

    const { data, error } = await supabase
        .from("warehouses")
        .insert(payload)
        .select()
        .single();

    if (error) {
        throw new Error(
            `Unable to create warehouse: ${error.message}`,
        );
    }

    return mapWarehouseRow(data);
}

export async function updateWarehouse(
    id: string,
    input: UpdateWarehouseInput,
): Promise<Warehouse> {
    if (input.code !== undefined) {
        validateWarehouseCode(input.code);
    }

    if (input.name !== undefined) {
        validateWarehouseName(input.name);
    }

    const supabase = await createClient();

    const payload = {
        ...input,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from("warehouses")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        throw new Error(
            `Unable to update warehouse: ${error.message}`,
        );
    }

    return mapWarehouseRow(data);
}

export async function setWarehouseActiveStatus(
    id: string,
    isActive: boolean,
): Promise<Warehouse> {
    const warehouseId = id.trim();

    if (!warehouseId) {
        throw new Error(
            "Warehouse ID is required.",
        );
    }

    const supabase = await createClient();

    const existingWarehouse =
        await getWarehouseById(warehouseId);

    if (!existingWarehouse) {
        throw new Error(
            "Warehouse was not found.",
        );
    }

    if (
        !isActive &&
        existingWarehouse.is_default
    ) {
        throw new Error(
            "The default warehouse cannot be deactivated. Set another warehouse as default first.",
        );
    }

    const { data, error } = await supabase
        .from("warehouses")
        .update({
            is_active: isActive,
            updated_at: new Date().toISOString(),
        })
        .eq("id", warehouseId)
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to update warehouse status: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "Warehouse was not found.",
        );
    }

    return mapWarehouseRow(data);
}

export async function deleteWarehouse(
    id: string,
): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("warehouses")
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error(
            `Unable to delete warehouse: ${error.message}`,
        );
    }
}

/* =========================================================
 * Exported Validation
 * ========================================================= */

export function validateWarehouseInput(
    input: Pick<
        CreateWarehouseInput,
        "code" | "name"
    >,
): void {
    validateWarehouseCode(
        input.code,
    );

    validateWarehouseName(
        input.name,
    );
}

export async function getWarehouseSummary(): Promise<
    WarehouseSummary
> {
    const supabase = await createClient();

    const [
        totalResult,
        activeResult,
        inactiveResult,
        defaultResult,
    ] = await Promise.all([
        supabase
            .from("warehouses")
            .select("id", {
                count: "exact",
                head: true,
            }),

        supabase
            .from("warehouses")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("is_active", true),

        supabase
            .from("warehouses")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("is_active", false),

        supabase
            .from("warehouses")
            .select("id, code, name")
            .eq("is_default", true)
            .maybeSingle(),
    ]);

    const firstError =
        totalResult.error ??
        activeResult.error ??
        inactiveResult.error ??
        defaultResult.error;

    if (firstError) {
        throw new Error(
            `Unable to load warehouse summary: ${firstError.message}`,
        );
    }

    return {
        total: totalResult.count ?? 0,
        active: activeResult.count ?? 0,
        inactive: inactiveResult.count ?? 0,
        defaultWarehouse: defaultResult.data
            ? {
                id: defaultResult.data.id,
                code: defaultResult.data.code,
                name: defaultResult.data.name,
            }
            : null,
    };
}