import { createClient } from "@/lib/supabase/server";

export type ProductHealthStatus =
  | "fast_moving"
  | "slow_moving"
  | "dead_stock"
  | "no_sales"
  | "low_stock"
  | "out_of_stock"
  | "healthy";

export interface ProductHealthSummary {
  totalProducts: number;
  fastMoving: number;
  slowMoving: number;
  deadStock: number;
  noSales: number;
  lowStock: number;
  outOfStock: number;
  healthy: number;
  dormantInventoryValue: number;
}

export interface ProductHealthItem {
  productId: string;
  productName: string;
  sku: string | null;

  healthStatus:
    ProductHealthStatus;

  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;

  inventoryValue: number;

  sold30Days: number;
  sold90Days: number;
  sold180Days: number;

  lastSaleDate: string | null;

  lastInventoryMovementAt:
    string | null;
}

export interface ProductHealthResult {
  summary: ProductHealthSummary;
  items: ProductHealthItem[];
}

function toNumber(
  value: unknown,
): number {
  if (
    typeof value === "number"
  ) {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  return 0;
}

function nullableString(
  value: unknown,
): string | null {
  return typeof value ===
    "string" &&
    value.trim()
    ? value
    : null;
}

function requiredString(
  value: unknown,
): string {
  return typeof value ===
    "string"
    ? value
    : "";
}

function isHealthStatus(
  value: unknown,
): value is ProductHealthStatus {
  return [
    "fast_moving",
    "slow_moving",
    "dead_stock",
    "no_sales",
    "low_stock",
    "out_of_stock",
    "healthy",
  ].includes(
    String(value),
  );
}

export async function getInventoryProductHealth(
  limit = 100,
): Promise<ProductHealthResult> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_inventory_product_health",
    {
      p_limit: limit,
    },
  );

  if (error) {
    throw new Error(
      `Unable to load product health: ${error.message}`,
    );
  }

  const root =
    typeof data === "object" &&
    data !== null
      ? (
          data as Record<
            string,
            unknown
          >
        )
      : {};

  const rawSummary =
    typeof root.summary ===
      "object" &&
    root.summary !== null
      ? (
          root.summary as Record<
            string,
            unknown
          >
        )
      : {};

  const rawItems =
    Array.isArray(root.items)
      ? root.items
      : [];

  return {
    summary: {
      totalProducts:
        toNumber(
          rawSummary.total_products,
        ),

      fastMoving:
        toNumber(
          rawSummary.fast_moving,
        ),

      slowMoving:
        toNumber(
          rawSummary.slow_moving,
        ),

      deadStock:
        toNumber(
          rawSummary.dead_stock,
        ),

      noSales:
        toNumber(
          rawSummary.no_sales,
        ),

      lowStock:
        toNumber(
          rawSummary.low_stock,
        ),

      outOfStock:
        toNumber(
          rawSummary.out_of_stock,
        ),

      healthy:
        toNumber(
          rawSummary.healthy,
        ),

      dormantInventoryValue:
        toNumber(
          rawSummary
            .dormant_inventory_value,
        ),
    },

    items:
      rawItems.map(
        (value) => {
          const row =
            typeof value ===
              "object" &&
            value !== null
              ? (
                  value as Record<
                    string,
                    unknown
                  >
                )
              : {};

          const status =
            isHealthStatus(
              row.health_status,
            )
              ? row.health_status
              : "healthy";

          return {
            productId:
              requiredString(
                row.product_id,
              ),

            productName:
              requiredString(
                row.product_name,
              ),

            sku:
              nullableString(
                row.sku,
              ),

            healthStatus:
              status,

            quantityOnHand:
              toNumber(
                row.quantity_on_hand,
              ),

            quantityReserved:
              toNumber(
                row.quantity_reserved,
              ),

            quantityAvailable:
              toNumber(
                row.quantity_available,
              ),

            inventoryValue:
              toNumber(
                row.inventory_value,
              ),

            sold30Days:
              toNumber(
                row.sold_30_days,
              ),

            sold90Days:
              toNumber(
                row.sold_90_days,
              ),

            sold180Days:
              toNumber(
                row.sold_180_days,
              ),

            lastSaleDate:
              nullableString(
                row.last_sale_date,
              ),

            lastInventoryMovementAt:
              nullableString(
                row
                  .last_inventory_movement_at,
              ),
          };
        },
      ),
  };
}