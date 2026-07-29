import { createClient } from "@/lib/supabase/server";

import type { InventoryDashboardSummary } from "./inventory.repository";

interface InventoryDashboardRpcResult {
  total_products: unknown;

  total_stock_quantity: unknown;
  total_available_quantity: unknown;
  total_reserved_quantity: unknown;

  inventory_value: unknown;

  low_stock_products: unknown;
  out_of_stock_products: unknown;

  active_warehouses: unknown;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

function isDashboardResult(
  value: unknown,
): value is InventoryDashboardRpcResult {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function getInventoryDashboard(): Promise<InventoryDashboardSummary> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_inventory_dashboard_summary",
  );

  if (error) {
    throw new Error(
      `Failed to load inventory dashboard: ${error.message}`,
    );
  }

  if (!isDashboardResult(data)) {
    throw new Error(
      "Inventory dashboard returned an invalid response.",
    );
  }

  return {
    totalProducts: toNumber(data.total_products),

    totalStockQuantity: toNumber(
      data.total_stock_quantity,
    ),

    totalAvailableQuantity: toNumber(
      data.total_available_quantity,
    ),

    totalReservedQuantity: toNumber(
      data.total_reserved_quantity,
    ),

    inventoryValue: toNumber(data.inventory_value),

    lowStockProducts: toNumber(
      data.low_stock_products,
    ),

    outOfStockProducts: toNumber(
      data.out_of_stock_products,
    ),

    activeWarehouses: toNumber(
      data.active_warehouses,
    ),
  };
}