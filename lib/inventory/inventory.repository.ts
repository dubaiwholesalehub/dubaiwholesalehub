export type InventoryTransactionType =
    | "goods_receipt"
    | "sales_issue"
    | "transfer_out"
    | "transfer_in"
    | "adjustment_in"
    | "adjustment_out"
    | "customer_return"
    | "supplier_return"
    | "opening_balance"
    | "stock_count";

export type InventoryTransactionStatus =
    | "draft"
    | "posted"
    | "reversed"
    | "cancelled";

export interface WarehouseStock {
    id: string;

    warehouse_id: string;
    product_id: string;

    quantity_on_hand: number;
    quantity_reserved: number;
    quantity_available: number;

    average_unit_cost: number;

    last_transaction_at: string | null;
    last_counted_at: string | null;

    created_at: string;
    updated_at: string;
}

export interface InventoryTransaction {
    id: string;

    transaction_number: string;

    transaction_type: InventoryTransactionType;

    status: InventoryTransactionStatus;

    warehouse_id: string;

    related_warehouse_id: string | null;

    transaction_date: string;

    reference_type: string | null;
    reference_id: string | null;
    reference_number: string | null;

    description: string | null;
    internal_notes: string | null;

    posted_at: string | null;
    reversed_at: string | null;
    cancelled_at: string | null;

    created_by: string | null;
    posted_by: string | null;
    reversed_by: string | null;
    cancelled_by: string | null;

    created_at: string;
    updated_at: string;
}

export interface InventoryTransactionItem {
    id: string;

    inventory_transaction_id: string;

    warehouse_id: string;

    product_id: string;

    line_number: number;

    quantity_change: number;

    unit_cost: number;

    total_cost: number;

    source_document_item_id: string | null;

    batch_number: string | null;
    lot_number: string | null;
    serial_number: string | null;

    manufacturing_date: string | null;
    expiry_date: string | null;

    notes: string | null;

    created_at: string;
}

export interface InventoryDashboardSummary {
    totalProducts: number;

    totalStockQuantity: number;
    totalAvailableQuantity: number;
    totalReservedQuantity: number;

    inventoryValue: number;

    lowStockProducts: number;
    outOfStockProducts: number;

    activeWarehouses: number;
}