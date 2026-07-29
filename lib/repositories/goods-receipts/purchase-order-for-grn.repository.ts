import { createClient } from "@/lib/supabase/server";

import type {
  PurchaseOrderStatus,
} from "@/lib/repositories/purchase-orders";

const ELIGIBLE_PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = [
  "sent",
  "partially_received",
];

export interface EligiblePurchaseOrderForGrn {
  id: string;
  po_number: string;
  status: PurchaseOrderStatus;

  supplier_id: string;
  supplier_name: string;

  order_date: string;
  expected_delivery_date: string | null;

  currency_code: string;
  total_amount: number;

  remaining_item_count: number;
  remaining_quantity: number;
}

export interface PurchaseOrderForGrnItem {
  id: string;
  line_number: number;

  product_id: string;
  product_sku: string | null;
  product_name: string;

  unit_id: string | null;
  unit_name: string | null;

  ordered_quantity: number;
  previously_received_quantity: number;
  remaining_quantity: number;

  unit_price: number;
}

export interface PurchaseOrderForGrn {
  id: string;
  po_number: string;
  status: PurchaseOrderStatus;

  supplier_id: string;
  supplier: {
    id: string;
    company_name: string;
    contact_name: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
  };

  order_date: string;
  expected_delivery_date: string | null;

  currency_code: string;
  total_amount: number;

  items: PurchaseOrderForGrnItem[];

  summary: {
    total_lines: number;
    ordered_quantity: number;
    previously_received_quantity: number;
    remaining_quantity: number;
  };
}

interface EligiblePurchaseOrderRow {
  id: string;
  po_number: string;
  status: PurchaseOrderStatus;

  supplier_id: string;
  order_date: string;
  expected_delivery_date: string | null;

  currency_code: string;
  total_amount: number;

  supplier:
    | {
        company_name: string;
      }
    | {
        company_name: string;
      }[]
    | null;
}

interface PurchaseOrderItemRow {
  id: string;
  line_number: number;

  product_id: string | null;
  item_name: string;
  product_sku: string | null;

  unit_id: string | null;

  ordered_quantity: number;
  received_quantity: number;
  unit_price: number;

  product:
    | {
        sku: string | null;
        name: string;
      }
    | {
        sku: string | null;
        name: string;
      }[]
    | null;

  unit:
    | {
        name: string;
      }
    | {
        name: string;
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

function getSingleRelation<T>(
  relation: T | T[] | null,
): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function toNumber(value: number | string | null): number {
  const result = Number(value ?? 0);

  return Number.isFinite(result) ? result : 0;
}

/**
 * Returns Purchase Orders that can still be received.
 *
 * Eligible statuses:
 * - sent
 * - partially_received
 *
 * Purchase Orders with no remaining quantities are excluded.
 */
export async function getEligiblePurchaseOrdersForGrn(): Promise<
  EligiblePurchaseOrderForGrn[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchase_orders")
    .select(`
      id,
      po_number,
      status,
      supplier_id,
      order_date,
      expected_delivery_date,
      currency_code,
      total_amount,

      supplier:suppliers!purchase_orders_supplier_id_fkey (
        company_name
      )
    `)
    .in("status", ELIGIBLE_PURCHASE_ORDER_STATUSES)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Unable to load eligible Purchase Orders: ${error.message}`,
    );
  }

  const purchaseOrders =
    (data ?? []) as EligiblePurchaseOrderRow[];

  if (purchaseOrders.length === 0) {
    return [];
  }

  const purchaseOrderIds = purchaseOrders.map(
    (purchaseOrder) => purchaseOrder.id,
  );

  const { data: itemData, error: itemError } =
    await supabase
      .from("purchase_order_items")
      .select(`
        purchase_order_id,
        ordered_quantity,
        received_quantity
      `)
      .in("purchase_order_id", purchaseOrderIds);

  if (itemError) {
    throw new Error(
      `Unable to load Purchase Order quantities: ${itemError.message}`,
    );
  }

  const quantitiesByPurchaseOrder = new Map<
    string,
    {
      remainingItemCount: number;
      remainingQuantity: number;
    }
  >();

  for (const item of itemData ?? []) {
    const orderedQuantity = toNumber(
      item.ordered_quantity,
    );

    const receivedQuantity = toNumber(
      item.received_quantity,
    );

    const remainingQuantity = Math.max(
      orderedQuantity - receivedQuantity,
      0,
    );

    if (remainingQuantity <= 0) {
      continue;
    }

    const current = quantitiesByPurchaseOrder.get(
      item.purchase_order_id,
    ) ?? {
      remainingItemCount: 0,
      remainingQuantity: 0,
    };

    current.remainingItemCount += 1;
    current.remainingQuantity += remainingQuantity;

    quantitiesByPurchaseOrder.set(
      item.purchase_order_id,
      current,
    );
  }

  return purchaseOrders
    .map((purchaseOrder) => {
      const supplier = getSingleRelation(
        purchaseOrder.supplier,
      );

      const quantities =
        quantitiesByPurchaseOrder.get(
          purchaseOrder.id,
        );

      return {
        id: purchaseOrder.id,
        po_number: purchaseOrder.po_number,
        status: purchaseOrder.status,

        supplier_id: purchaseOrder.supplier_id,
        supplier_name:
          supplier?.company_name ?? "Unknown supplier",

        order_date: purchaseOrder.order_date,
        expected_delivery_date:
          purchaseOrder.expected_delivery_date,

        currency_code: purchaseOrder.currency_code,
        total_amount: toNumber(
          purchaseOrder.total_amount,
        ),

        remaining_item_count:
          quantities?.remainingItemCount ?? 0,

        remaining_quantity:
          quantities?.remainingQuantity ?? 0,
      };
    })
    .filter(
      (purchaseOrder) =>
        purchaseOrder.remaining_quantity > 0,
    );
}

/**
 * Returns one eligible Purchase Order with only the
 * line items that still have quantities available to
 * receive.
 */
export async function getPurchaseOrderForGrn(
  purchaseOrderId: string,
): Promise<PurchaseOrderForGrn | null> {
  const id = requireId(
    purchaseOrderId,
    "Purchase Order ID",
  );

  const supabase = await createClient();

  const { data: purchaseOrder, error } =
    await supabase
      .from("purchase_orders")
      .select(`
        id,
        po_number,
        status,
        supplier_id,
        order_date,
        expected_delivery_date,
        currency_code,
        total_amount,

        supplier:suppliers!purchase_orders_supplier_id_fkey (
          id,
          company_name,
          contact_name,
          phone,
          whatsapp,
          email
        )
      `)
      .eq("id", id)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load Purchase Order for Goods Receipt: ${error.message}`,
    );
  }

  if (!purchaseOrder) {
    return null;
  }

  const status =
    purchaseOrder.status as PurchaseOrderStatus;

  if (
    !ELIGIBLE_PURCHASE_ORDER_STATUSES.includes(status)
  ) {
    throw new Error(
      `Purchase Order ${purchaseOrder.po_number} cannot be received because its current status is "${status.replaceAll(
        "_",
        " ",
      )}".`,
    );
  }

  const { data: itemData, error: itemError } =
    await supabase
      .from("purchase_order_items")
      .select(`
        id,
        line_number,
        product_id,
        item_name,
        product_sku,
        unit_id,
        ordered_quantity,
        received_quantity,
        unit_price,

        product:products (
          sku,
          name
        ),

        unit:units (
          name
        )
      `)
      .eq("purchase_order_id", id)
      .order("line_number", {
        ascending: true,
      });

  if (itemError) {
    throw new Error(
      `Unable to load Purchase Order items for Goods Receipt: ${itemError.message}`,
    );
  }

  const rows =
    (itemData ?? []) as PurchaseOrderItemRow[];

  const items: PurchaseOrderForGrnItem[] = [];

  for (const item of rows) {
    const orderedQuantity = toNumber(
      item.ordered_quantity,
    );

    const previouslyReceivedQuantity = toNumber(
      item.received_quantity,
    );

    const remainingQuantity = Math.max(
      orderedQuantity -
        previouslyReceivedQuantity,
      0,
    );

    if (remainingQuantity <= 0) {
      continue;
    }

    if (!item.product_id) {
      throw new Error(
        `Purchase Order line ${item.line_number} does not have a product assigned. Assign a product before creating the Goods Receipt.`,
      );
    }

    const product = getSingleRelation(item.product);
    const unit = getSingleRelation(item.unit);

    items.push({
      id: item.id,
      line_number: item.line_number,

      product_id: item.product_id,
      product_sku:
        product?.sku ?? item.product_sku,
      product_name:
        product?.name ??
        item.item_name ??
        "Unknown product",

      unit_id: item.unit_id,
      unit_name: unit?.name ?? null,

      ordered_quantity: orderedQuantity,
      previously_received_quantity:
        previouslyReceivedQuantity,
      remaining_quantity: remainingQuantity,

      unit_price: toNumber(item.unit_price),
    });
  }

  if (items.length === 0) {
    throw new Error(
      `Purchase Order ${purchaseOrder.po_number} has no remaining quantities to receive.`,
    );
  }

  const supplier = getSingleRelation(
    purchaseOrder.supplier,
  );

  if (!supplier) {
    throw new Error(
      "The supplier connected to this Purchase Order could not be found.",
    );
  }

  const summary = items.reduce(
    (result, item) => {
      result.total_lines += 1;
      result.ordered_quantity +=
        item.ordered_quantity;
      result.previously_received_quantity +=
        item.previously_received_quantity;
      result.remaining_quantity +=
        item.remaining_quantity;

      return result;
    },
    {
      total_lines: 0,
      ordered_quantity: 0,
      previously_received_quantity: 0,
      remaining_quantity: 0,
    },
  );

  return {
    id: purchaseOrder.id,
    po_number: purchaseOrder.po_number,
    status,

    supplier_id: purchaseOrder.supplier_id,
    supplier,

    order_date: purchaseOrder.order_date,
    expected_delivery_date:
      purchaseOrder.expected_delivery_date,

    currency_code: purchaseOrder.currency_code,
    total_amount: toNumber(
      purchaseOrder.total_amount,
    ),

    items,
    summary,
  };
}