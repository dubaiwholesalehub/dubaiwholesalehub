import { createClient } from "@/lib/supabase/server";

import type {
  InventoryTransaction,
  InventoryTransactionItem,
} from "./inventory.repository";

export interface InventoryTransactionDetail
  extends InventoryTransaction {
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
}

export async function getInventoryTransactions(): Promise<
  InventoryTransactionDetail[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select(`
      *,
      warehouse:warehouses!inventory_transactions_warehouse_id_fkey (
        id,
        code,
        name
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Failed to load inventory transactions: ${error.message}`,
    );
  }

  return (data ?? []) as InventoryTransactionDetail[];
}

export async function getInventoryTransactionById(
  id: string,
): Promise<InventoryTransactionDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select(`
      *,
      warehouse:warehouses!inventory_transactions_warehouse_id_fkey (
        id,
        code,
        name
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load inventory transaction: ${error.message}`,
    );
  }

  return data as InventoryTransactionDetail | null;
}

export async function getInventoryTransactionItems(
  transactionId: string,
): Promise<InventoryTransactionItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inventory_transaction_items")
    .select("*")
    .eq("inventory_transaction_id", transactionId)
    .order("line_number");

  if (error) {
    throw new Error(
      `Failed to load inventory transaction items: ${error.message}`,
    );
  }

  return (data ?? []) as InventoryTransactionItem[];
}