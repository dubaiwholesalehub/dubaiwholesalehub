import { createClient } from "@/lib/supabase/server";

import type {
  ProductHealthStatus,
} from "@/lib/inventory/inventory-product-health.repository";

/* =========================================================
 * Product Intelligence Types
 * ========================================================= */

export interface ProductSalesMetrics {
  sold30Days: number;
  sold90Days: number;
  sold180Days: number;

  lastSaleDate: string | null;
}

export interface ProductHealthIntelligence {
  status: ProductHealthStatus;

  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;

  inventoryValue: number;

  sold30Days: number;
  sold90Days: number;
  sold180Days: number;

  lastSaleDate: string | null;
  lastInventoryMovementAt: string | null;
}

export interface ProductInventoryTimelineItem {
  id: string;

  transactionId: string;
  transactionNumber: string;
  transactionType: string;
  transactionDate: string;

  warehouseId: string;
  warehouseName: string;
  warehouseCode: string | null;

  quantityChange: number;
  unitCost: number;
  totalCost: number;

  referenceNumber: string | null;
  description: string | null;

  notes: string | null;

  createdAt: string;
}

export interface ProductIntelligence {
  sales: ProductSalesMetrics;

  health: ProductHealthIntelligence;

  recentTransactions:
    ProductInventoryTimelineItem[];
}

/* =========================================================
 * Helpers
 * ========================================================= */

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

function requiredString(
  value: unknown,
): string {
  return typeof value ===
    "string"
    ? value
    : "";
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

function dateDaysAgo(
  days: number,
): string {
  const date =
    new Date();

  date.setDate(
    date.getDate() -
      days,
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function determineHealthStatus({
  quantityOnHand,
  sold30Days,
  sold90Days,
  sold180Days,
  lastSaleDate,
}: {
  quantityOnHand: number;
  sold30Days: number;
  sold90Days: number;
  sold180Days: number;
  lastSaleDate: string | null;
}): ProductHealthStatus {
  /*
   * Keep these rules aligned with
   * get_inventory_product_health().
   */

  if (
    quantityOnHand <= 0
  ) {
    return "out_of_stock";
  }

  if (
    quantityOnHand <= 10
  ) {
    return "low_stock";
  }

  if (
    sold30Days > 0 &&
    sold30Days >=
      quantityOnHand * 0.5
  ) {
    return "fast_moving";
  }

  if (!lastSaleDate) {
    return "no_sales";
  }

  const lastSale =
    new Date(
      `${lastSaleDate}T00:00:00`,
    );

  const deadStockDate =
    new Date();

  deadStockDate.setDate(
    deadStockDate.getDate() -
      180,
  );

  if (
    !Number.isNaN(
      lastSale.getTime(),
    ) &&
    lastSale <
      deadStockDate
  ) {
    return "dead_stock";
  }

  if (
    sold180Days > 0 &&
    sold90Days === 0
  ) {
    return "slow_moving";
  }

  return "healthy";
}

/* =========================================================
 * Product Intelligence
 * ========================================================= */

export async function getProductIntelligence(
  productId: string,
): Promise<ProductIntelligence> {
  const id =
    productId.trim();

  if (!id) {
    throw new Error(
      "Product ID is required to load product intelligence.",
    );
  }

  const supabase =
    await createClient();

  const date30 =
    dateDaysAgo(30);

  const date90 =
    dateDaysAgo(90);

  const date180 =
    dateDaysAgo(180);

  const [
    stockResult,
    salesResult,
    timelineResult,
  ] = await Promise.all([
    /*
     * Current inventory position
     * across every warehouse.
     */
    supabase
      .from(
        "warehouse_stock",
      )
      .select(`
        quantity_on_hand,
        quantity_reserved,
        quantity_available,
        average_unit_cost,
        last_transaction_at
      `)
      .eq(
        "product_id",
        id,
      ),

    /*
     * Actual customer sales movements.
     *
     * We deliberately use posted
     * sales_issue inventory transactions,
     * not quotations or Sales Orders.
     */
    supabase
      .from(
        "inventory_transaction_items",
      )
      .select(`
        quantity_change,

        transaction:inventory_transactions!inner (
          id,
          transaction_date,
          transaction_type,
          status
        )
      `)
      .eq(
        "product_id",
        id,
      )
      .eq(
        "transaction.status",
        "posted",
      )
      .eq(
        "transaction.transaction_type",
        "sales_issue",
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),

    /*
     * Latest inventory movements for
     * the Product Workspace timeline.
     */
    supabase
      .from(
        "inventory_transaction_items",
      )
      .select(`
        id,
        inventory_transaction_id,
        warehouse_id,
        quantity_change,
        unit_cost,
        total_cost,
        notes,
        created_at,

        transaction:inventory_transactions!inner (
          id,
          transaction_number,
          transaction_type,
          transaction_date,
          status,
          reference_number,
          description
        ),

        warehouse:warehouses (
          id,
          name,
          code
        )
      `)
      .eq(
        "product_id",
        id,
      )
      .eq(
        "transaction.status",
        "posted",
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(12),
  ]);

  const firstError =
    stockResult.error ??
    salesResult.error ??
    timelineResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load product intelligence: ${firstError.message}`,
    );
  }

  /* =======================================================
   * Current Inventory
   * ======================================================= */

  let quantityOnHand = 0;
  let quantityReserved = 0;
  let quantityAvailable = 0;
  let inventoryValue = 0;

  let lastInventoryMovementAt:
    string | null = null;

  for (
    const stock of
    stockResult.data ?? []
  ) {
    const onHand =
      toNumber(
        stock.quantity_on_hand,
      );

    const reserved =
      toNumber(
        stock.quantity_reserved,
      );

    const available =
      toNumber(
        stock.quantity_available,
      );

    const cost =
      toNumber(
        stock.average_unit_cost,
      );

    quantityOnHand +=
      onHand;

    quantityReserved +=
      reserved;

    quantityAvailable +=
      available;

    inventoryValue +=
      onHand * cost;

    if (
      stock.last_transaction_at &&
      (
        !lastInventoryMovementAt ||
        new Date(
          stock.last_transaction_at,
        ).getTime() >
          new Date(
            lastInventoryMovementAt,
          ).getTime()
      )
    ) {
      lastInventoryMovementAt =
        stock.last_transaction_at;
    }
  }

  /* =======================================================
   * Sales Movement
   * ======================================================= */

  let sold30Days = 0;
  let sold90Days = 0;
  let sold180Days = 0;

  let lastSaleDate:
    string | null = null;

  for (
    const row of
    salesResult.data ?? []
  ) {
    const transaction =
      row.transaction;

    if (!transaction) {
      continue;
    }

    const transactionDate =
      nullableString(
        transaction.transaction_date,
      );

    if (!transactionDate) {
      continue;
    }

    const soldQuantity =
      Math.abs(
        toNumber(
          row.quantity_change,
        ),
      );

    if (
      transactionDate >=
      date180
    ) {
      sold180Days +=
        soldQuantity;
    }

    if (
      transactionDate >=
      date90
    ) {
      sold90Days +=
        soldQuantity;
    }

    if (
      transactionDate >=
      date30
    ) {
      sold30Days +=
        soldQuantity;
    }

    if (
      !lastSaleDate ||
      transactionDate >
        lastSaleDate
    ) {
      lastSaleDate =
        transactionDate;
    }
  }

  /* =======================================================
   * Product Health
   * ======================================================= */

  const healthStatus =
    determineHealthStatus({
      quantityOnHand,
      sold30Days,
      sold90Days,
      sold180Days,
      lastSaleDate,
    });

  /* =======================================================
   * Inventory Timeline
   * ======================================================= */

  const recentTransactions:
    ProductInventoryTimelineItem[] =
    (
      timelineResult.data ??
      []
    ).map((row) => {
      const transaction =
        row.transaction;

      const warehouse =
        row.warehouse;

      return {
        id:
          requiredString(
            row.id,
          ),

        transactionId:
          requiredString(
            row
              .inventory_transaction_id,
          ),

        transactionNumber:
          requiredString(
            transaction
              ?.transaction_number,
          ),

        transactionType:
          requiredString(
            transaction
              ?.transaction_type,
          ),

        transactionDate:
          requiredString(
            transaction
              ?.transaction_date,
          ),

        warehouseId:
          requiredString(
            row.warehouse_id,
          ),

        warehouseName:
          requiredString(
            warehouse?.name,
          ) ||
          "Unknown Warehouse",

        warehouseCode:
          nullableString(
            warehouse?.code,
          ),

        quantityChange:
          toNumber(
            row.quantity_change,
          ),

        unitCost:
          toNumber(
            row.unit_cost,
          ),

        totalCost:
          toNumber(
            row.total_cost,
          ),

        referenceNumber:
          nullableString(
            transaction
              ?.reference_number,
          ),

        description:
          nullableString(
            transaction
              ?.description,
          ),

        notes:
          nullableString(
            row.notes,
          ),

        createdAt:
          requiredString(
            row.created_at,
          ),
      };
    });

  return {
    sales: {
      sold30Days,
      sold90Days,
      sold180Days,
      lastSaleDate,
    },

    health: {
      status:
        healthStatus,

      quantityOnHand,
      quantityReserved,
      quantityAvailable,

      inventoryValue,

      sold30Days,
      sold90Days,
      sold180Days,

      lastSaleDate,

      lastInventoryMovementAt,
    },

    recentTransactions,
  };
}