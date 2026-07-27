import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type PurchaseOrder =
  Database["public"]["Tables"]["purchase_orders"]["Row"];

export type PurchaseOrderStatus =
  Database["public"]["Enums"]["purchase_order_status"];

export type PurchaseOrderSource =
  Database["public"]["Enums"]["purchase_order_source"];

export interface PurchaseOrderListItem {
  id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  source: PurchaseOrderSource;
  supplier_id: string;
  supplier_name: string;
  order_date: string;
  expected_delivery_date: string | null;
  currency_code: string;
  total_amount: number;
  created_at: string;
}

export interface GetPurchaseOrdersInput {
  search?: string;
  status?: PurchaseOrderStatus | "all";
  page?: number;
  pageSize?: number;
}

export interface GetPurchaseOrdersResult {
  data: PurchaseOrderListItem[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PurchaseOrderSupplier {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
}

export interface PurchaseOrderHeader
  extends PurchaseOrder {
  supplier: PurchaseOrderSupplier;
}

export interface PurchaseOrderDetailSummary {
  itemCount: number;
  totalOrderedQuantity: number;
  totalReceivedQuantity: number;
  remainingQuantity: number;
}

interface PurchaseOrderListQueryRow {
  id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  source: PurchaseOrderSource;
  supplier_id: string;
  order_date: string;
  expected_delivery_date: string | null;
  currency_code: string;
  total_amount: number;
  created_at: string;
  suppliers:
    | {
        company_name: string;
      }
    | {
        company_name: string;
      }[]
    | null;
}

function requireId(
  value: string,
  fieldName: string,
): string {
  const id = value.trim();

  if (!id) {
    throw new Error(`${fieldName} is required.`);
  }

  return id;
}

function normalizePage(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(Math.floor(value), 1);
}

function normalizePageSize(
  value: number | undefined,
): number {
  if (!value || !Number.isFinite(value)) {
    return 20;
  }

  return Math.min(Math.max(Math.floor(value), 1), 100);
}

/**
 * Removes characters that can break a PostgREST filter expression.
 */
function sanitizeSearchTerm(value: string): string {
  return value
    .trim()
    .replaceAll(",", " ")
    .replaceAll("(", " ")
    .replaceAll(")", " ")
    .replaceAll('"', " ")
    .replace(/\s+/g, " ");
}

function getSupplierName(
  supplier:
    | {
        company_name: string;
      }
    | {
        company_name: string;
      }[]
    | null,
): string {
  if (!supplier) {
    return "Unknown supplier";
  }

  if (Array.isArray(supplier)) {
    return supplier[0]?.company_name ?? "Unknown supplier";
  }

  return supplier.company_name;
}

/**
 * Returns paginated Purchase Orders with supplier information.
 */
export async function getPurchaseOrders({
  search,
  status,
  page,
  pageSize,
}: GetPurchaseOrdersInput = {}): Promise<GetPurchaseOrdersResult> {
  const supabase = await createClient();

  const currentPage = normalizePage(page);
  const currentPageSize = normalizePageSize(pageSize);

  const rangeStart =
    (currentPage - 1) * currentPageSize;

  const rangeEnd =
    rangeStart + currentPageSize - 1;

  const searchTerm = sanitizeSearchTerm(search ?? "");

  let matchingSupplierIds: string[] = [];

  if (searchTerm) {
    const { data: suppliers, error: supplierError } =
      await supabase
        .from("suppliers")
        .select("id")
        .ilike("company_name", `%${searchTerm}%`)
        .limit(100);

    if (supplierError) {
      throw new Error(
        `Unable to search suppliers: ${supplierError.message}`,
      );
    }

    matchingSupplierIds =
      suppliers?.map((supplier) => supplier.id) ?? [];
  }

  let query = supabase
    .from("purchase_orders")
    .select(
      `
        id,
        po_number,
        status,
        source,
        supplier_id,
        order_date,
        expected_delivery_date,
        currency_code,
        total_amount,
        created_at,
        suppliers!purchase_orders_supplier_id_fkey (
          company_name
        )
      `,
      {
        count: "exact",
      },
    );

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (searchTerm) {
    const filters = [
      `po_number.ilike.%${searchTerm}%`,
    ];

    if (matchingSupplierIds.length > 0) {
      filters.push(
        `supplier_id.in.(${matchingSupplierIds.join(",")})`,
      );
    }

    query = query.or(filters.join(","));
  }

  const {
    data,
    error,
    count,
  } = await query
    .order("created_at", {
      ascending: false,
    })
    .range(rangeStart, rangeEnd);

  if (error) {
    throw new Error(
      `Unable to load Purchase Orders: ${error.message}`,
    );
  }

  const rows =
    (data ?? []) as PurchaseOrderListQueryRow[];

  const purchaseOrders: PurchaseOrderListItem[] =
    rows.map((purchaseOrder) => ({
      id: purchaseOrder.id,
      po_number: purchaseOrder.po_number,
      status: purchaseOrder.status,
      source: purchaseOrder.source,
      supplier_id: purchaseOrder.supplier_id,
      supplier_name: getSupplierName(
        purchaseOrder.suppliers,
      ),
      order_date: purchaseOrder.order_date,
      expected_delivery_date:
        purchaseOrder.expected_delivery_date,
      currency_code: purchaseOrder.currency_code,
      total_amount: purchaseOrder.total_amount,
      created_at: purchaseOrder.created_at,
    }));

  const totalCount = count ?? 0;

  return {
    data: purchaseOrders,
    count: totalCount,
    page: currentPage,
    pageSize: currentPageSize,
    totalPages: Math.max(
      Math.ceil(totalCount / currentPageSize),
      1,
    ),
  };
}

/**
 * Returns one Purchase Order by ID.
 */
export async function getPurchaseOrderById(
  purchaseOrderId: string,
): Promise<PurchaseOrder> {
  const id = requireId(
    purchaseOrderId,
    "Purchase Order ID",
  );

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(
      `Unable to load Purchase Order: ${error.message}`,
    );
  }

  return data;
}

/**
 * Returns a Purchase Order header together with its supplier.
 */

/**
 * Returns quantity and item summary information for a
 * Purchase Order.
 */

/**
 * Creates a draft Purchase Order from the quotation
 * awarded to an RFQ.
 */
export async function createPurchaseOrderFromAward(
  rfqId: string,
): Promise<PurchaseOrder> {
  const id = requireId(rfqId, "RFQ ID");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "create_purchase_order_from_award",
    {
      target_rfq_id: id,
    },
  );

  if (error) {
    throw new Error(
      `Unable to create Purchase Order: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The Purchase Order was not created.",
    );
  }

  return data;
}