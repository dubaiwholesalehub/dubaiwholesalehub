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

export type WarehouseStockStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock";

export type WarehouseStockSort =
  | "product_name"
  | "sku"
  | "warehouse_name"
  | "quantity_on_hand"
  | "quantity_available"
  | "average_unit_cost"
  | "stock_value";

export type SortDirection = "asc" | "desc";

export interface WarehouseStockListItem {
  id: string;

  warehouse_id: string;
  product_id: string;

  warehouse_code: string;
  warehouse_name: string;

  sku: string;
  barcode: string | null;
  product_name: string;

  category_id: string | null;
  category_name: string | null;

  brand_id: string | null;
  brand_name: string | null;

  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;

  average_unit_cost: number;
  stock_value: number;

  stock_status: WarehouseStockStatus;

  last_transaction_at: string | null;
  updated_at: string;
}

export interface WarehouseStockPage {
  items: WarehouseStockListItem[];

  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface WarehouseStockFilters {
  search?: string;
  warehouseId?: string;
  categoryId?: string;
  brandId?: string;
  stockStatus?: WarehouseStockStatus;
  sortBy?: WarehouseStockSort;
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
}

export type InventoryTransactionSort =
  | "transaction_number"
  | "transaction_date"
  | "warehouse_name"
  | "total_value";

export type InventoryTransactionSortDirection = "asc" | "desc";

export interface InventoryTransactionListItem {
  id: string;

  transaction_number: string;
  transaction_type: InventoryTransactionType;
  status: InventoryTransactionStatus;
  transaction_date: string;

  warehouse_id: string;
  warehouse_name: string;

  reference_type: string | null;
  reference_number: string | null;
  description: string | null;

  line_count: number;
  total_quantity: number;
  total_value: number;

  created_at: string;
}

export interface InventoryTransactionPage {
  items: InventoryTransactionListItem[];

  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface InventoryTransactionFilters {
  search?: string;
  transactionType?: InventoryTransactionType;
  warehouseId?: string;
  status?: InventoryTransactionStatus;

  fromDate?: string;
  toDate?: string;

  sortBy?: InventoryTransactionSort;
  sortDirection?: InventoryTransactionSortDirection;

  page?: number;
  pageSize?: number;
}

export interface InventoryTransactionWarehouse {
  id: string;
  name: string;
}

export interface InventoryTransactionDetailHeader {
  id: string;
  transaction_number: string;
  transaction_type: InventoryTransactionType;
  status: InventoryTransactionStatus;
  transaction_date: string;

  warehouse: InventoryTransactionWarehouse;
  related_warehouse: InventoryTransactionWarehouse | null;

  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;

  description: string | null;
  internal_notes: string | null;

  line_count: number;
  total_quantity: number;
  total_value: number;

  created_at: string;
  updated_at: string;

  posted_at: string | null;
  reversed_at: string | null;
  cancelled_at: string | null;

  created_by: string | null;
  posted_by: string | null;
  reversed_by: string | null;
  cancelled_by: string | null;
}

export interface InventoryTransactionDetailItem {
  id: string;
  line_number: number;

  product_id: string;
  sku: string | null;
  product_name: string;

  quantity: number;
  unit_cost: number;
  total_cost: number;

  batch_number: string | null;
  lot_number: string | null;
  serial_number: string | null;

  manufacturing_date: string | null;
  expiry_date: string | null;

  notes: string | null;
  source_document_item_id: string | null;
}

export interface InventoryTransactionDetail {
  transaction: InventoryTransactionDetailHeader;
  items: InventoryTransactionDetailItem[];
}