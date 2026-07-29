import { createClient } from "@/lib/supabase/server";

import type { WarehouseStock } from "./inventory.repository";

export interface WarehouseStockDetail extends WarehouseStock {
  warehouse: {
    id: string;
    code: string;
    name: string;
  };

  product: {
    id: string;
    sku: string;
    name: string;
  };
}

export async function getWarehouseStock(): Promise<
  WarehouseStockDetail[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_stock")
    .select(`
      *,
      warehouse:warehouses (
        id,
        code,
        name
      ),
      product:products (
        id,
        sku,
        name
      )
    `)
    .order("warehouse(name)")
    .order("product(name)");

  if (error) {
    throw new Error(
      `Failed to load warehouse stock: ${error.message}`,
    );
  }

  return (data ?? []) as WarehouseStockDetail[];
}

export async function getWarehouseStockByProduct(
  warehouseId: string,
  productId: string,
): Promise<WarehouseStock | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_stock")
    .select("*")
    .eq("warehouse_id", warehouseId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load warehouse stock: ${error.message}`,
    );
  }

  return data as WarehouseStock | null;
}

export async function getWarehouseProducts(
  warehouseId: string,
): Promise<WarehouseStockDetail[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_stock")
    .select(`
      *,
      warehouse:warehouses (
        id,
        code,
        name
      ),
      product:products (
        id,
        sku,
        name
      )
    `)
    .eq("warehouse_id", warehouseId)
    .order("product(name)");

  if (error) {
    throw new Error(
      `Failed to load warehouse products: ${error.message}`,
    );
  }

  return (data ?? []) as WarehouseStockDetail[];
}

export async function getProductStockAcrossWarehouses(
  productId: string,
): Promise<WarehouseStockDetail[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_stock")
    .select(`
      *,
      warehouse:warehouses (
        id,
        code,
        name
      ),
      product:products (
        id,
        sku,
        name
      )
    `)
    .eq("product_id", productId)
    .order("warehouse(name)");

  if (error) {
    throw new Error(
      `Failed to load product stock: ${error.message}`,
    );
  }

  return (data ?? []) as WarehouseStockDetail[];
}