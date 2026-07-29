import { createClient } from "@/lib/supabase/server";

export interface InventorySummary {
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
}

export async function getInventorySummary(): Promise<InventorySummary> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_stock")
    .select(`
      quantity_on_hand,
      average_unit_cost
    `);

  if (error) {
    throw new Error(
      `Failed to load inventory summary: ${error.message}`,
    );
  }

  const summary = (data ?? []).reduce(
    (acc, row) => {
      const qty = Number(row.quantity_on_hand);
      const cost = Number(row.average_unit_cost);

      acc.totalProducts += 1;
      acc.totalQuantity += qty;
      acc.totalValue += qty * cost;

      return acc;
    },
    {
      totalProducts: 0,
      totalQuantity: 0,
      totalValue: 0,
    },
  );

  return summary;
}