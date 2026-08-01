import { createClient } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";

/* =========================================================
 * Status Types
 * ========================================================= */

export type InventoryTransferStatus =
    | "draft"
    | "approved"
    | "dispatched"
    | "in_transit"
    | "received"
    | "completed"
    | "cancelled";

/* =========================================================
 * Inventory Transfer Header
 * ========================================================= */

type InventoryTransferRow =
    Database["public"]["Tables"]["inventory_transfers"]["Row"];

type WarehouseRow =
    Database["public"]["Tables"]["warehouses"]["Row"];

export interface InventoryTransferHeader {
    id: string;

    transfer_number: string;

    source_warehouse_id: string;

    destination_warehouse_id: string;

    transfer_date: string;

    expected_arrival_date: string | null;

    status: InventoryTransferStatus;

    reference_number: string | null;

    reason: string | null;

    internal_notes: string | null;

    approved_at: string | null;

    dispatched_at: string | null;

    received_at: string | null;

    completed_at: string | null;

    cancelled_at: string | null;

    created_by: string | null;

    approved_by: string | null;

    dispatched_by: string | null;

    received_by: string | null;

    completed_by: string | null;

    cancelled_by: string | null;

    cancellation_reason: string | null;

    created_at: string;

    updated_at: string;
}

/* =========================================================
 * Inventory Transfer Item
 * ========================================================= */

export interface InventoryTransferItem {
    id: string;

    inventory_transfer_id: string;

    product_id: string;

    line_number: number;

    requested_quantity: number;

    dispatched_quantity: number;

    received_quantity: number;

    unit_cost: number;

    line_notes: string | null;

    created_at: string;

    updated_at: string;
}

/* =========================================================
 * Related Display Models
 * ========================================================= */

export interface InventoryTransferWarehouse {
    id: string;

    name: string;
}

export interface InventoryTransferProduct {
    id: string;

    name: string;

    sku: string | null;
}

/* =========================================================
 * Inventory Transfer List Row
 * ========================================================= */

export interface InventoryTransferListRow
    extends InventoryTransferHeader {
    source_warehouse: InventoryTransferWarehouse | null;

    destination_warehouse: InventoryTransferWarehouse | null;

    item_count: number;
}

/* =========================================================
 * Inventory Transfer Detail
 * ========================================================= */

export interface InventoryTransferItemDetail
    extends InventoryTransferItem {
    product: InventoryTransferProduct | null;
}

export interface InventoryTransferDetails
    extends InventoryTransferHeader {
    source_warehouse: InventoryTransferWarehouse | null;

    destination_warehouse: InventoryTransferWarehouse | null;

    items: InventoryTransferItemDetail[];
}

/* =========================================================
 * Summary
 * ========================================================= */

export interface InventoryTransferSummary {
    total_lines: number;

    requested_quantity: number;

    dispatched_quantity: number;

    received_quantity: number;

    total_value: number;
}

/* =========================================================
 * Create and Update Inputs
 * ========================================================= */

export interface CreateInventoryTransferInput {
    source_warehouse_id: string;

    destination_warehouse_id: string;

    transfer_date?: string;

    expected_arrival_date?: string | null;

    reference_number?: string | null;

    reason?: string | null;

    internal_notes?: string | null;
}

export interface UpdateInventoryTransferInput
    extends Partial<CreateInventoryTransferInput> {
    status?: InventoryTransferStatus;

    cancellation_reason?: string | null;
}

export interface CreateInventoryTransferItemInput {
    inventory_transfer_id: string;
    product_id: string;
    line_number: number;
    requested_quantity: number;
    unit_cost?: number;
    line_notes?: string | null;
}

export interface UpdateInventoryTransferItemInput {
    product_id?: string;

    line_number?: number;

    requested_quantity?: number;

    dispatched_quantity?: number;

    received_quantity?: number;

    unit_cost?: number;

    line_notes?: string | null;
}

export interface GetInventoryTransfersInput {
    search?: string;
    status?: InventoryTransferStatus | "all";
    sourceWarehouseId?: string;
    destinationWarehouseId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
}

export interface GetInventoryTransfersResult {
    data: InventoryTransferListRow[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

/* =========================================================
 * Internal Database Result Types
 * ========================================================= */

interface InventoryTransferListDatabaseRow
    extends InventoryTransferHeader {
    source_warehouse:
    | InventoryTransferWarehouse
    | InventoryTransferWarehouse[]
    | null;

    destination_warehouse:
    | InventoryTransferWarehouse
    | InventoryTransferWarehouse[]
    | null;

    inventory_transfer_items:
    | Array<{
        count: number;
    }>
    | null;
}

interface InventoryTransferDetailsDatabaseRow
    extends InventoryTransferHeader {
    source_warehouse:
    | InventoryTransferWarehouse
    | InventoryTransferWarehouse[]
    | null;

    destination_warehouse:
    | InventoryTransferWarehouse
    | InventoryTransferWarehouse[]
    | null;

    inventory_transfer_items:
    | Array<
        InventoryTransferItem & {
            product:
            | InventoryTransferProduct
            | InventoryTransferProduct[]
            | null;
        }
    >
    | null;
}

/* =========================================================
 * Helpers
 * ========================================================= */

function validateUnitCost(unitCost: number): void {
    if (
        !Number.isFinite(unitCost) ||
        unitCost < 0
    ) {
        throw new Error(
            "Unit cost must be zero or greater.",
        );
    }
}
function getSingleRelation<T>(
    relation: T | T[] | null,
): T | null {
    if (Array.isArray(relation)) {
        return relation[0] ?? null;
    }

    return relation;
}

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

function validateWarehouses(
    sourceWarehouseId: string,
    destinationWarehouseId: string,
): void {
    if (!sourceWarehouseId.trim()) {
        throw new Error(
            "A source warehouse is required.",
        );
    }

    if (!destinationWarehouseId.trim()) {
        throw new Error(
            "A destination warehouse is required.",
        );
    }

    if (
        sourceWarehouseId === destinationWarehouseId
    ) {
        throw new Error(
            "The source and destination warehouses must be different.",
        );
    }
}

function validateRequestedQuantity(
    quantity: number,
): void {
    if (
        !Number.isFinite(quantity) ||
        quantity <= 0
    ) {
        throw new Error(
            "Requested quantity must be greater than zero.",
        );
    }
}

function validateLineNumber(
    lineNumber: number,
): void {
    if (
        !Number.isInteger(lineNumber) ||
        lineNumber <= 0
    ) {
        throw new Error(
            "Line number must be a positive integer.",
        );
    }
}

function normalizePage(
    value: number | undefined,
): number {
    if (!value || !Number.isFinite(value)) {
        return 1;
    }

    return Math.max(Math.floor(value), 1);
}

function normalizePageSize(
    value: number | undefined,
): number {
    if (!value || !Number.isFinite(value)) {
        return 25;
    }

    return Math.min(
        Math.max(Math.floor(value), 1),
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
 * Get Inventory Transfers
 * ========================================================= */

export async function getInventoryTransfers():
    Promise<InventoryTransferListRow[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("inventory_transfers")
        .select(`
      *,
      source_warehouse:warehouses!inventory_transfers_source_warehouse_id_fkey (
        id,
        name
      ),
      destination_warehouse:warehouses!inventory_transfers_destination_warehouse_id_fkey (
        id,
        name
      ),
      inventory_transfer_items (
        count
      )
    `)
        .order("transfer_date", {
            ascending: false,
        })
        .order("created_at", {
            ascending: false,
        });

    if (error) {
        throw new Error(
            `Unable to load inventory transfers: ${error.message}`,
        );
    }

    const rows =
        (data ?? []) as unknown as
        InventoryTransferListDatabaseRow[];

    return rows.map((row) => ({
        id: row.id,

        transfer_number: row.transfer_number,

        source_warehouse_id:
            row.source_warehouse_id,

        destination_warehouse_id:
            row.destination_warehouse_id,

        transfer_date: row.transfer_date,

        expected_arrival_date:
            row.expected_arrival_date,

        status: row.status,

        reference_number: row.reference_number,

        reason: row.reason,

        internal_notes: row.internal_notes,

        approved_at: row.approved_at,

        dispatched_at: row.dispatched_at,

        received_at: row.received_at,

        completed_at: row.completed_at,

        cancelled_at: row.cancelled_at,

        created_by: row.created_by,

        approved_by: row.approved_by,

        dispatched_by: row.dispatched_by,

        received_by: row.received_by,

        completed_by: row.completed_by,

        cancelled_by: row.cancelled_by,

        cancellation_reason:
            row.cancellation_reason,

        created_at: row.created_at,

        updated_at: row.updated_at,

        source_warehouse: getSingleRelation(
            row.source_warehouse,
        ),

        destination_warehouse:
            getSingleRelation(
                row.destination_warehouse,
            ),

        item_count:
            row.inventory_transfer_items?.[0]
                ?.count ?? 0,
    }));
}

export async function getInventoryTransferPage({
    search,
    status,
    sourceWarehouseId,
    destinationWarehouseId,
    fromDate,
    toDate,
    page,
    pageSize,
}: GetInventoryTransfersInput = {}): Promise<GetInventoryTransfersResult> {
    const supabase = await createClient();

    const currentPage = normalizePage(page);
    const currentPageSize =
        normalizePageSize(pageSize);

    const rangeStart =
        (currentPage - 1) * currentPageSize;

    const rangeEnd =
        rangeStart + currentPageSize - 1;

    const searchTerm =
        sanitizeSearchTerm(search ?? "");

    let query = supabase
        .from("inventory_transfers")
        .select(
            `
        *,
        source_warehouse:warehouses!inventory_transfers_source_warehouse_id_fkey (
          id,
          name
        ),
        destination_warehouse:warehouses!inventory_transfers_destination_warehouse_id_fkey (
          id,
          name
        ),
        inventory_transfer_items (
          count
        )
      `,
            {
                count: "exact",
            },
        );

    if (status && status !== "all") {
        query = query.eq("status", status);
    }

    if (sourceWarehouseId) {
        query = query.eq(
            "source_warehouse_id",
            sourceWarehouseId,
        );
    }

    if (destinationWarehouseId) {
        query = query.eq(
            "destination_warehouse_id",
            destinationWarehouseId,
        );
    }

    if (fromDate) {
        query = query.gte(
            "transfer_date",
            fromDate,
        );
    }

    if (toDate) {
        query = query.lte(
            "transfer_date",
            toDate,
        );
    }

    if (searchTerm) {
        query = query.or(
            [
                `transfer_number.ilike.%${searchTerm}%`,
                `reference_number.ilike.%${searchTerm}%`,
            ].join(","),
        );
    }

    const {
        data,
        error,
        count,
    } = await query
        .order("transfer_date", {
            ascending: false,
        })
        .order("created_at", {
            ascending: false,
        })
        .range(rangeStart, rangeEnd);

    if (error) {
        throw new Error(
            `Unable to load inventory transfers: ${error.message}`,
        );
    }

    const rows =
        (data ?? []) as unknown as
        InventoryTransferListDatabaseRow[];

    const transfers: InventoryTransferListRow[] =
        rows.map((row) => ({
            id: row.id,
            transfer_number: row.transfer_number,
            source_warehouse_id:
                row.source_warehouse_id,
            destination_warehouse_id:
                row.destination_warehouse_id,
            transfer_date: row.transfer_date,
            expected_arrival_date:
                row.expected_arrival_date,
            status: row.status,
            reference_number: row.reference_number,
            reason: row.reason,
            internal_notes: row.internal_notes,
            approved_at: row.approved_at,
            dispatched_at: row.dispatched_at,
            received_at: row.received_at,
            completed_at: row.completed_at,
            cancelled_at: row.cancelled_at,
            created_by: row.created_by,
            approved_by: row.approved_by,
            dispatched_by: row.dispatched_by,
            received_by: row.received_by,
            completed_by: row.completed_by,
            cancelled_by: row.cancelled_by,
            cancellation_reason:
                row.cancellation_reason,
            created_at: row.created_at,
            updated_at: row.updated_at,

            source_warehouse: getSingleRelation(
                row.source_warehouse,
            ),

            destination_warehouse:
                getSingleRelation(
                    row.destination_warehouse,
                ),

            item_count:
                row.inventory_transfer_items?.[0]
                    ?.count ?? 0,
        }));

    const totalCount = count ?? 0;

    return {
        data: transfers,
        count: totalCount,
        page: currentPage,
        pageSize: currentPageSize,
        totalPages: Math.max(
            Math.ceil(
                totalCount / currentPageSize,
            ),
            1,
        ),
    };
}

/* =========================================================
 * Get Inventory Transfer by ID
 * ========================================================= */

export async function getInventoryTransferById(
    id: string,
): Promise<InventoryTransferDetails | null> {
    if (!id.trim()) {
        throw new Error(
            "Inventory transfer ID is required.",
        );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("inventory_transfers")
        .select(`
      *,
      source_warehouse:warehouses!inventory_transfers_source_warehouse_id_fkey (
        id,
        name
      ),
      destination_warehouse:warehouses!inventory_transfers_destination_warehouse_id_fkey (
        id,
        name
      ),
      inventory_transfer_items (
        id,
        inventory_transfer_id,
        product_id,
        line_number,
        requested_quantity,
        dispatched_quantity,
        received_quantity,
        unit_cost,
        line_notes,
        created_at,
        updated_at,
        product:products (
          id,
          name,
          sku
        )
      )
    `)
        .eq("id", id)
        .order("line_number", {
            referencedTable:
                "inventory_transfer_items",
            ascending: true,
        })
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to load inventory transfer: ${error.message}`,
        );
    }

    if (!data) {
        return null;
    }

    const row =
        data as unknown as
        InventoryTransferDetailsDatabaseRow;

    const items: InventoryTransferItemDetail[] =
        (
            row.inventory_transfer_items ?? []
        ).map((item) => ({
            id: item.id,

            inventory_transfer_id:
                item.inventory_transfer_id,

            product_id: item.product_id,

            line_number: item.line_number,

            requested_quantity:
                Number(item.requested_quantity),

            dispatched_quantity:
                Number(item.dispatched_quantity),

            received_quantity:
                Number(item.received_quantity),

            unit_cost: Number(item.unit_cost),

            line_notes: item.line_notes,

            created_at: item.created_at,

            updated_at: item.updated_at,

            product: getSingleRelation(
                item.product,
            ),
        }));

    return {
        id: row.id,

        transfer_number: row.transfer_number,

        source_warehouse_id:
            row.source_warehouse_id,

        destination_warehouse_id:
            row.destination_warehouse_id,

        transfer_date: row.transfer_date,

        expected_arrival_date:
            row.expected_arrival_date,

        status: row.status,

        reference_number: row.reference_number,

        reason: row.reason,

        internal_notes: row.internal_notes,

        approved_at: row.approved_at,

        dispatched_at: row.dispatched_at,

        received_at: row.received_at,

        completed_at: row.completed_at,

        cancelled_at: row.cancelled_at,

        created_by: row.created_by,

        approved_by: row.approved_by,

        dispatched_by: row.dispatched_by,

        received_by: row.received_by,

        completed_by: row.completed_by,

        cancelled_by: row.cancelled_by,

        cancellation_reason:
            row.cancellation_reason,

        created_at: row.created_at,

        updated_at: row.updated_at,

        source_warehouse: getSingleRelation(
            row.source_warehouse,
        ),

        destination_warehouse:
            getSingleRelation(
                row.destination_warehouse,
            ),

        items,
    };
}

/* =========================================================
 * Create Inventory Transfer
 * ========================================================= */

export async function createInventoryTransfer(
    input: CreateInventoryTransferInput,
): Promise<InventoryTransferHeader> {
    validateWarehouses(
        input.source_warehouse_id,
        input.destination_warehouse_id,
    );

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("inventory_transfers")
        .insert({
            source_warehouse_id:
                input.source_warehouse_id,

            destination_warehouse_id:
                input.destination_warehouse_id,

            transfer_date:
                input.transfer_date ??
                new Date().toISOString().slice(0, 10),

            expected_arrival_date:
                input.expected_arrival_date ?? null,

            reference_number:
                input.reference_number?.trim() ||
                null,

            reason:
                input.reason?.trim() || null,

            internal_notes:
                input.internal_notes?.trim() ||
                null,

            status: "draft",
        })
        .select("*")
        .single();

    if (error) {
        throw new Error(
            `Unable to create inventory transfer: ${error.message}`,
        );
    }

    return data as InventoryTransferHeader;
}

/* =========================================================
 * Update Draft Inventory Transfer
 * ========================================================= */

export async function updateInventoryTransfer(
    id: string,
    input: UpdateInventoryTransferInput,
): Promise<InventoryTransferHeader> {
    if (!id.trim()) {
        throw new Error(
            "Inventory transfer ID is required.",
        );
    }

    if (
        input.source_warehouse_id &&
        input.destination_warehouse_id
    ) {
        validateWarehouses(
            input.source_warehouse_id,
            input.destination_warehouse_id,
        );
    }

    const supabase = await createClient();

    type InventoryTransferUpdate =
        Database["public"]["Tables"]["inventory_transfers"]["Update"];

    const updateData: InventoryTransferUpdate = {};

    if (
        input.source_warehouse_id !== undefined
    ) {
        updateData.source_warehouse_id =
            input.source_warehouse_id;
    }

    if (
        input.destination_warehouse_id !==
        undefined
    ) {
        updateData.destination_warehouse_id =
            input.destination_warehouse_id;
    }

    if (input.transfer_date !== undefined) {
        updateData.transfer_date =
            input.transfer_date;
    }

    if (
        input.expected_arrival_date !==
        undefined
    ) {
        updateData.expected_arrival_date =
            input.expected_arrival_date;
    }

    if (
        input.reference_number !== undefined
    ) {
        updateData.reference_number =
            input.reference_number?.trim() ||
            null;
    }

    if (input.reason !== undefined) {
        updateData.reason =
            input.reason?.trim() || null;
    }

    if (
        input.internal_notes !== undefined
    ) {
        updateData.internal_notes =
            input.internal_notes?.trim() ||
            null;
    }

    if (
        input.cancellation_reason !== undefined
    ) {
        updateData.cancellation_reason =
            input.cancellation_reason?.trim() ||
            null;
    }

    const { data, error } = await supabase
        .from("inventory_transfers")
        .update(updateData)
        .eq("id", id)
        .eq("status", "draft")
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to update inventory transfer: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "The inventory transfer was not found or is no longer in Draft status.",
        );
    }

    return data as InventoryTransferHeader;
}

/* =========================================================
 * Delete Draft Inventory Transfer
 * ========================================================= */

export async function deleteInventoryTransfer(
    id: string,
): Promise<void> {
    if (!id.trim()) {
        throw new Error(
            "Inventory transfer ID is required.",
        );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("inventory_transfers")
        .delete()
        .eq("id", id)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to delete inventory transfer: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "The inventory transfer was not found or cannot be deleted because it is no longer in Draft status.",
        );
    }
}

/* =========================================================
 * Create Inventory Transfer Item
 * ========================================================= */

export async function createInventoryTransferItem(
    input: CreateInventoryTransferItemInput,
): Promise<InventoryTransferItem> {
    if (!input.inventory_transfer_id.trim()) {
        throw new Error(
            "Inventory transfer ID is required.",
        );
    }

    if (!input.product_id.trim()) {
        throw new Error(
            "A product is required.",
        );
    }

    validateLineNumber(input.line_number);

    validateRequestedQuantity(
        input.requested_quantity,
    );

    const supabase = await createClient();
    const unitCost = input.unit_cost ?? 0;

    validateUnitCost(unitCost);

    const { data, error } = await supabase
        .from("inventory_transfer_items")
        .insert({
            inventory_transfer_id:
                input.inventory_transfer_id,

            product_id: input.product_id,

            line_number: input.line_number,

            requested_quantity:
                input.requested_quantity,

            dispatched_quantity: 0,

            received_quantity: 0,

            unit_cost: unitCost,

            line_notes:
                input.line_notes?.trim() || null,
        })
        .select("*")
        .single();

    if (error) {
        throw new Error(
            `Unable to add inventory transfer item: ${error.message}`,
        );
    }

    return {
        ...data,

        requested_quantity: Number(
            data.requested_quantity,
        ),

        dispatched_quantity: Number(
            data.dispatched_quantity,
        ),

        received_quantity: Number(
            data.received_quantity,
        ),

        unit_cost: Number(data.unit_cost),
    } as InventoryTransferItem;
}

/* =========================================================
 * Update Inventory Transfer Item
 * ========================================================= */

export async function updateInventoryTransferItem(
    id: string,
    input: UpdateInventoryTransferItemInput,
): Promise<InventoryTransferItem> {
    if (!id.trim()) {
        throw new Error(
            "Inventory transfer item ID is required.",
        );
    }

    if (
        input.line_number !== undefined
    ) {
        validateLineNumber(
            input.line_number,
        );
    }

    if (
        input.requested_quantity !== undefined
    ) {
        validateRequestedQuantity(
            input.requested_quantity,
        );
    }

    if (input.unit_cost !== undefined) {
        validateUnitCost(input.unit_cost);
    }
    const supabase = await createClient();

    type InventoryTransferItemUpdate =
        Database["public"]["Tables"]["inventory_transfer_items"]["Update"];

    const updateData: InventoryTransferItemUpdate = {};

    if (input.product_id !== undefined) {
        updateData.product_id =
            input.product_id;
    }

    if (input.line_number !== undefined) {
        updateData.line_number =
            input.line_number;
    }

    if (
        input.requested_quantity !== undefined
    ) {
        updateData.requested_quantity =
            input.requested_quantity;
    }

    if (
        input.dispatched_quantity !== undefined
    ) {
        updateData.dispatched_quantity =
            input.dispatched_quantity;
    }

    if (
        input.received_quantity !== undefined
    ) {
        updateData.received_quantity =
            input.received_quantity;
    }

    if (input.unit_cost !== undefined) {
        updateData.unit_cost =
            input.unit_cost;
    }

    if (input.line_notes !== undefined) {
        updateData.line_notes =
            input.line_notes?.trim() || null;
    }

    const { data, error } = await supabase
        .from("inventory_transfer_items")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to update inventory transfer item: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "The inventory transfer item was not found or its transfer is no longer editable.",
        );
    }

    return {
        ...data,

        requested_quantity: Number(
            data.requested_quantity,
        ),

        dispatched_quantity: Number(
            data.dispatched_quantity,
        ),

        received_quantity: Number(
            data.received_quantity,
        ),

        unit_cost: Number(data.unit_cost),
    } as InventoryTransferItem;
}

/* =========================================================
 * Delete Inventory Transfer Item
 * ========================================================= */

export async function deleteInventoryTransferItem(
    id: string,
): Promise<void> {
    if (!id.trim()) {
        throw new Error(
            "Inventory transfer item ID is required.",
        );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("inventory_transfer_items")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to delete inventory transfer item: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "The inventory transfer item was not found or its transfer is no longer editable.",
        );
    }
}

/* =========================================================
 * Get Inventory Transfer Summary
 * ========================================================= */

export function calculateInventoryTransferSummary(
    items: InventoryTransferItem[],
): InventoryTransferSummary {
    return items.reduce<InventoryTransferSummary>(
        (summary, item) => {
            summary.total_lines += 1;

            summary.requested_quantity +=
                Number(item.requested_quantity);

            summary.dispatched_quantity +=
                Number(item.dispatched_quantity);

            summary.received_quantity +=
                Number(item.received_quantity);

            summary.total_value +=
                Number(item.requested_quantity) *
                Number(item.unit_cost);

            return summary;
        },
        {
            total_lines: 0,

            requested_quantity: 0,

            dispatched_quantity: 0,

            received_quantity: 0,

            total_value: 0,
        },
    );
}