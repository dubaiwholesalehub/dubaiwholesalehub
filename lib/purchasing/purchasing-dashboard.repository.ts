import { createClient } from "@/lib/supabase/server";

export interface PurchasingDashboardSummary {
  totalPurchaseOrders: number;

  draftPurchaseOrders: number;
  openPurchaseOrders: number;
  partiallyReceivedPurchaseOrders: number;
  receivedPurchaseOrders: number;

  pendingGoodsReceipts: number;

  purchaseValueThisMonth: number;

  overduePurchaseOrders: number;

  suppliersWithOpenOrders: number;
}

function getMonthStart(): string {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1,
    ),
  )
    .toISOString()
    .slice(0, 10);
}

export async function getPurchasingDashboard():
  Promise<PurchasingDashboardSummary> {
  const supabase =
    await createClient();

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const monthStart =
    getMonthStart();

  const [
    purchaseOrdersResult,
    goodsReceiptsResult,
  ] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select(`
        id,
        supplier_id,
        status,
        order_date,
        expected_delivery_date,
        total_amount
      `),

    supabase
      .from("goods_receipts")
      .select(`
        id,
        status
      `),
  ]);

  const firstError =
    purchaseOrdersResult.error ??
    goodsReceiptsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load purchasing dashboard: ${firstError.message}`,
    );
  }

  const purchaseOrders =
    purchaseOrdersResult.data ??
    [];

  const goodsReceipts =
    goodsReceiptsResult.data ??
    [];

  const openStatuses =
    new Set([
      "draft",
      "pending_approval",
      "approved",
      "sent",
      "partially_received",
    ]);

  const openPurchaseOrders =
    purchaseOrders.filter(
      (order) =>
        openStatuses.has(
          String(order.status),
        ),
    );

  const suppliersWithOpenOrders =
    new Set(
      openPurchaseOrders
        .map(
          (order) =>
            order.supplier_id,
        )
        .filter(Boolean),
    ).size;

  const purchaseValueThisMonth =
    purchaseOrders.reduce(
      (
        total,
        order,
      ) => {
        if (
          order.order_date <
          monthStart
        ) {
          return total;
        }

        return (
          total +
          Number(
            order.total_amount ??
              0,
          )
        );
      },
      0,
    );

  const overduePurchaseOrders =
    purchaseOrders.filter(
      (order) => {
        if (
          !order
            .expected_delivery_date
        ) {
          return false;
        }

        if (
          order
            .expected_delivery_date >=
          today
        ) {
          return false;
        }

        return openStatuses.has(
          String(order.status),
        );
      },
    ).length;

  return {
    totalPurchaseOrders:
      purchaseOrders.length,

    draftPurchaseOrders:
      purchaseOrders.filter(
        (order) =>
          order.status ===
          "draft",
      ).length,

    openPurchaseOrders:
      openPurchaseOrders.length,

    partiallyReceivedPurchaseOrders:
      purchaseOrders.filter(
        (order) =>
          order.status ===
          "partially_received",
      ).length,

    receivedPurchaseOrders:
      purchaseOrders.filter(
        (order) =>
          order.status ===
          "received",
      ).length,

    pendingGoodsReceipts:
      goodsReceipts.filter(
        (receipt) =>
          receipt.status !==
            "completed" &&
          receipt.status !==
            "cancelled",
      ).length,

    purchaseValueThisMonth,

    overduePurchaseOrders,

    suppliersWithOpenOrders,
  };
}