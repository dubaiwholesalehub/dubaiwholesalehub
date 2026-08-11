import {
  getInventoryTransactionPage,
} from "@/lib/inventory/inventory-transaction.repository";
import { createClient } from "@/lib/supabase/server";

export interface InventoryTodayActivity {
  receivedQuantity: number;
  receivedValue: number;

  issuedQuantity: number;
  issuedValue: number;

  localPurchaseQuantity: number;
  localPurchaseValue: number;

  adjustmentInQuantity: number;
  adjustmentOutQuantity: number;

  stockCountTransactions: number;

  transactionCount: number;
}

export interface InventoryAttentionSummary {
  pendingTransfers: number;
}

export interface InventoryIntelligence {
  today: InventoryTodayActivity;

  attention: InventoryAttentionSummary;

  recentTransactions:
    Awaited<
      ReturnType<
        typeof getInventoryTransactionPage
      >
    >["items"];
}

/* =========================================================
 * Helpers
 * ========================================================= */

function getTodayDate(): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
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

/* =========================================================
 * Inventory Intelligence
 * ========================================================= */

export async function getInventoryIntelligence():
  Promise<InventoryIntelligence> {
  const supabase =
    await createClient();

  const today =
    getTodayDate();

  const [
    transactionsResult,
    transfersResult,
    recentPage,
  ] = await Promise.all([
    supabase
      .from(
        "inventory_transactions",
      )
      .select(`
        id,
        transaction_type,
        inventory_transaction_items (
          quantity_change,
          unit_cost,
          total_cost
        )
      `)
      .eq(
        "status",
        "posted",
      )
      .eq(
        "transaction_date",
        today,
      ),

    supabase
      .from(
        "inventory_transfers",
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        },
      )
      .in(
        "status",
        [
          "draft",
          "confirmed",
          "in_transit",
        ],
      ),

    getInventoryTransactionPage({
      page: 1,
      pageSize: 8,
      sortBy:
        "transaction_date",
      sortDirection:
        "desc",
    }),
  ]);

  const firstError =
    transactionsResult.error ??
    transfersResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load inventory intelligence: ${firstError.message}`,
    );
  }

  const activity:
    InventoryTodayActivity = {
      receivedQuantity: 0,
      receivedValue: 0,

      issuedQuantity: 0,
      issuedValue: 0,

      localPurchaseQuantity: 0,
      localPurchaseValue: 0,

      adjustmentInQuantity: 0,
      adjustmentOutQuantity: 0,

      stockCountTransactions: 0,

      transactionCount: 0,
    };

  for (
    const transaction of
    transactionsResult.data ??
    []
  ) {
    activity.transactionCount +=
      1;

    const items =
      transaction
        .inventory_transaction_items ??
      [];

    const quantity =
      items.reduce(
        (total, item) =>
          total +
          Math.abs(
            toNumber(
              item.quantity_change,
            ),
          ),
        0,
      );

    const value =
      items.reduce(
        (total, item) =>
          total +
          Math.abs(
            toNumber(
              item.total_cost,
            ),
          ),
        0,
      );

    switch (
      transaction.transaction_type
    ) {
      case "goods_receipt":
        activity.receivedQuantity +=
          quantity;

        activity.receivedValue +=
          value;
        break;

      case "local_purchase":
        activity.receivedQuantity +=
          quantity;

        activity.receivedValue +=
          value;

        activity.localPurchaseQuantity +=
          quantity;

        activity.localPurchaseValue +=
          value;
        break;

      case "customer_return":
      case "transfer_in":
      case "opening_balance":
        activity.receivedQuantity +=
          quantity;

        activity.receivedValue +=
          value;
        break;

      case "sales_issue":
      case "supplier_return":
      case "transfer_out":
        activity.issuedQuantity +=
          quantity;

        activity.issuedValue +=
          value;
        break;

      case "adjustment_in":
        activity.adjustmentInQuantity +=
          quantity;
        break;

      case "adjustment_out":
        activity.adjustmentOutQuantity +=
          quantity;
        break;

      case "stock_count":
        activity.stockCountTransactions +=
          1;
        break;
    }
  }

  return {
    today: activity,

    attention: {
      pendingTransfers:
        transfersResult.count ??
        0,
    },

    recentTransactions:
      recentPage.items,
  };
}