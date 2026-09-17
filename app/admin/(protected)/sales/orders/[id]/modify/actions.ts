"use server";

import type { Json } from "@/lib/database.types";

import { revalidatePath } from "next/cache";

import {
  isManagementRole,
  requireSalesAccess,
} from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export type SalesOrderModificationType =
  | "entry_correction"
  | "commercial_adjustment"
  | "exchange_adjustment";

export interface SalesOrderModificationSnapshotItem {
  id: string | null;
  product_id: string | null;
  unit_id: string | null;
  warehouse_id: string | null;
  sku: string | null;
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_percentage: number;
  fulfilment_method: string;
  line_notes: string | null;
}

export interface SalesOrderModificationSnapshot {
  header: {
    invoice_discount_amount: number;
    shipping_amount: number;
    round_off_amount: number;
    customer_notes: string | null;
    internal_notes: string | null;
  };
  items: SalesOrderModificationSnapshotItem[];
}

export interface SalesOrderModificationRequest {
  salesOrderId: string;
  modificationType: SalesOrderModificationType;
  reason: string;
  notes?: string | null;
  afterSnapshot: SalesOrderModificationSnapshot;
}

async function requireModificationAccess() {
  const auth = await requireSalesAccess();

  if (!isManagementRole(auth.profile.role)) {
    throw new Error(
      "Management access is required to modify a posted sales order.",
    );
  }

  return auth;
}

function validateRequest(
  input: SalesOrderModificationRequest,
): SalesOrderModificationRequest {
  const salesOrderId = input.salesOrderId?.trim();
  const reason = input.reason?.trim();

  if (!salesOrderId) {
    throw new Error("Sales Order ID is required.");
  }

  if (!reason || reason.length < 3) {
    throw new Error(
      "Please enter a clear modification reason of at least 3 characters.",
    );
  }

  if (
    ![
      "entry_correction",
      "commercial_adjustment",
      "exchange_adjustment",
    ].includes(input.modificationType)
  ) {
    throw new Error("Invalid modification type.");
  }

  if (
    !input.afterSnapshot ||
    !Array.isArray(input.afterSnapshot.items) ||
    input.afterSnapshot.items.length === 0
  ) {
    throw new Error(
      "The revised sales order must contain at least one active item.",
    );
  }

  return {
    ...input,
    salesOrderId,
    reason,
    notes: input.notes?.trim() || null,
  };
}

export async function previewSalesOrderModificationAction(
  input: SalesOrderModificationRequest,
) {
  await requireModificationAccess();

  const validated = validateRequest(input);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "preview_sales_order_modification",
    {
      p_sales_order_id: validated.salesOrderId,
      p_after_snapshot: validated.afterSnapshot as unknown as Json,
      p_modification_type: validated.modificationType,
      p_reason: validated.reason,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
        "Unable to preview the Sales Order modification.",
    );
  }

  return data;
}

export async function applySalesOrderModificationAction(
  input: SalesOrderModificationRequest & {
    idempotencyKey: string;
  },
) {
  await requireModificationAccess();

  const validated = validateRequest(input);

  const idempotencyKey =
    input.idempotencyKey?.trim();

  if (!idempotencyKey) {
    throw new Error(
      "Modification idempotency key is required.",
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "apply_sales_order_modification",
    {
      p_sales_order_id: validated.salesOrderId,
      p_after_snapshot: validated.afterSnapshot as unknown as Json,
      p_modification_type: validated.modificationType,
      p_reason: validated.reason,
      p_notes: validated.notes ?? undefined,
      p_idempotency_key: idempotencyKey,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
        "Unable to apply the Sales Order modification.",
    );
  }

  revalidatePath("/admin/sales/orders");
  revalidatePath(
    `/admin/sales/orders/${validated.salesOrderId}`,
  );
  revalidatePath(
    `/admin/sales/orders/${validated.salesOrderId}/invoice`,
  );
  revalidatePath(
    `/admin/sales/orders/${validated.salesOrderId}/modify`,
  );

  return data;
}
