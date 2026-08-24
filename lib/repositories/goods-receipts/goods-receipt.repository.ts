export type GoodsReceiptStatus =
  | "draft"
  | "receiving"
  | "partially_received"
  | "received"
  | "inspected"
  | "completed"
  | "cancelled";

export type InspectionStatus =
  | "pending"
  | "accepted"
  | "partially_accepted"
  | "rejected";

  export interface GoodsReceiptHeader {
  id: string;

  receipt_number: string;

  purchase_order_id: string;

  supplier_id: string;

  warehouse_id: string;

  status: GoodsReceiptStatus;

  supplier_delivery_note_number: string | null;
  supplier_invoice_number: string | null;

  carrier_name: string | null;
  vehicle_number: string | null;
  tracking_number: string | null;

  received_date: string | null;

  received_at: string | null;
  inspected_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;

  internal_notes: string | null;
  supplier_notes: string | null;

  created_by: string | null;
  received_by: string | null;
  inspected_by: string | null;
  completed_by: string | null;
  cancelled_by: string | null;

  created_at: string;
  updated_at: string;
}

export interface GoodsReceiptItem {
  id: string;

  goods_receipt_id: string;

  purchase_order_item_id: string;

  product_id: string;

  line_number: number;

  ordered_quantity: number;

  previously_received_quantity: number;

  receiving_quantity: number;

  accepted_quantity: number;

  rejected_quantity: number;

  damaged_quantity: number;

  unit_cost: number;

  batch_number: string | null;
  lot_number: string | null;
  serial_number: string | null;

  manufacturing_date: string | null;
  expiry_date: string | null;

  inspection_status: InspectionStatus;

  rejection_reason: string | null;

  notes: string | null;

  created_at: string;

  updated_at: string;
}

export interface GoodsReceiptSummary {
  total_lines: number;

  ordered_quantity: number;

  previously_received_quantity: number;

  receiving_quantity: number;

  accepted_quantity: number;

  rejected_quantity: number;

  damaged_quantity: number;
}