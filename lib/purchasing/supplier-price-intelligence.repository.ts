import { createClient } from "@/lib/supabase/server";

/* =========================================================
 * Types
 * ========================================================= */

export interface SupplierProductPriceHistoryPoint {
  purchaseOrderId: string;
  orderDate: string;

  productId: string;
  productName: string;
  sku: string | null;

  quantity: number;
  unitPrice: number;
  lineTotal: number;

  currencyCode: string;
}

export interface SupplierProductPriceIntelligence {
  productId: string;
  productName: string;
  sku: string | null;

  purchaseCount: number;

  firstPurchaseDate: string | null;
  lastPurchaseDate: string | null;

  firstUnitPrice: number | null;
  previousUnitPrice: number | null;
  latestUnitPrice: number | null;

  lowestUnitPrice: number | null;
  highestUnitPrice: number | null;

  averageUnitPrice: number | null;
  weightedAverageUnitPrice: number | null;

  latestPriceChangePercent: number | null;

  totalOrderedQuantity: number;
  totalPurchaseValue: number;

  priceVolatilityPercent: number | null;
  priceStabilityScore: number | null;

  currencyCode: string;

  history:
    SupplierProductPriceHistoryPoint[];
}

export interface SupplierPriceIntelligenceSummary {
  supplierId: string;
  supplierName: string;

  productsWithPriceHistory: number;

  productsWithStablePrices: number;
  productsWithRisingPrices: number;
  productsWithFallingPrices: number;

  averagePriceVolatilityPercent: number | null;

  overallPriceStabilityScore: number | null;
}

export interface SupplierPriceIntelligenceResult {
  summary:
    SupplierPriceIntelligenceSummary;

  products:
    SupplierProductPriceIntelligence[];
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

function round(
  value: number,
  decimals = 2,
): number {
  const factor =
    10 ** decimals;

  return (
    Math.round(
      value * factor,
    ) / factor
  );
}

function getProductInfo(
  product:
    | {
        name: string;
        sku: string | null;
      }
    | {
        name: string;
        sku: string | null;
      }[]
    | null,
): {
  name: string;
  sku: string | null;
} {
  if (!product) {
    return {
      name:
        "Unknown product",
      sku:
        null,
    };
  }

  if (
    Array.isArray(
      product,
    )
  ) {
    return {
      name:
        product[0]
          ?.name ??
        "Unknown product",

      sku:
        product[0]
          ?.sku ??
        null,
    };
  }

  return {
    name:
      product.name,

    sku:
      product.sku,
  };
}

function getPurchaseOrderInfo(
  purchaseOrder:
    | {
        id: string;
        supplier_id: string;
        order_date: string;
        currency_code: string;
        status: string;
      }
    | {
        id: string;
        supplier_id: string;
        order_date: string;
        currency_code: string;
        status: string;
      }[]
    | null,
): {
  id: string;
  supplierId: string;
  orderDate: string;
  currencyCode: string;
  status: string;
} | null {
  if (!purchaseOrder) {
    return null;
  }

  const row =
    Array.isArray(
      purchaseOrder,
    )
      ? purchaseOrder[0]
      : purchaseOrder;

  if (!row) {
    return null;
  }

  return {
    id:
      row.id,

    supplierId:
      row.supplier_id,

    orderDate:
      row.order_date,

    currencyCode:
      row.currency_code,

    status:
      row.status,
  };
}

function standardDeviation(
  values: number[],
): number | null {
  if (
    values.length <
    2
  ) {
    return null;
  }

  const mean =
    values.reduce(
      (
        total,
        value,
      ) =>
        total +
        value,
      0,
    ) /
    values.length;

  const variance =
    values.reduce(
      (
        total,
        value,
      ) => {
        const difference =
          value -
          mean;

        return (
          total +
          difference *
            difference
        );
      },
      0,
    ) /
    values.length;

  return Math.sqrt(
    variance,
  );
}

function calculateVolatilityPercent(
  prices: number[],
): number | null {
  if (
    prices.length <
    2
  ) {
    return null;
  }

  const average =
    prices.reduce(
      (
        total,
        price,
      ) =>
        total +
        price,
      0,
    ) /
    prices.length;

  if (
    average <= 0
  ) {
    return null;
  }

  const deviation =
    standardDeviation(
      prices,
    );

  if (
    deviation ===
    null
  ) {
    return null;
  }

  return (
    deviation /
    average
  ) *
    100;
}

function calculatePriceStabilityScore(
  volatilityPercent:
    number | null,
): number | null {
  if (
    volatilityPercent ===
    null
  ) {
    return null;
  }

  /*
   * v1 scoring policy
   *
   * 0% volatility       = 100
   * 5% volatility       = 90
   * 10% volatility      = 80
   * 20% volatility      = 60
   * 30% volatility      = 40
   * 50%+ volatility     = 0
   *
   * Each 1% volatility removes
   * 2 stability points.
   */

  return round(
    Math.max(
      0,
      Math.min(
        100,
        100 -
          volatilityPercent *
            2,
      ),
    ),
    1,
  );
}

/* =========================================================
 * Supplier Price Intelligence
 * ========================================================= */

export async function getSupplierPriceIntelligence(
  supplierId: string,
): Promise<SupplierPriceIntelligenceResult> {
  const id =
    supplierId.trim();

  if (!id) {
    throw new Error(
      "Supplier ID is required.",
    );
  }

  const supabase =
    await createClient();

  const [
    supplierResult,
    itemsResult,
  ] = await Promise.all([
    supabase
      .from(
        "suppliers",
      )
      .select(`
        id,
        company_name
      `)
      .eq(
        "id",
        id,
      )
      .maybeSingle(),

    supabase
      .from(
        "purchase_order_items",
      )
      .select(`
        id,
        purchase_order_id,
        product_id,
        ordered_quantity,
        unit_price,
        line_total,

        product:products (
          name,
          sku
        ),

        purchase_order:purchase_orders!inner (
          id,
          supplier_id,
          order_date,
          currency_code,
          status
        )
      `)
      .eq(
        "purchase_order.supplier_id",
        id,
      ),
  ]);

  const firstError =
    supplierResult.error ??
    itemsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load supplier price intelligence: ${firstError.message}`,
    );
  }

  const supplier =
    supplierResult.data;

  if (!supplier) {
    throw new Error(
      "Supplier was not found.",
    );
  }

  const productMap =
    new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string | null;

        currencyCode: string;

        history:
          SupplierProductPriceHistoryPoint[];
      }
    >();

  for (
    const row of
    itemsResult.data ??
    []
  ) {
    if (
      !row.product_id
    ) {
      continue;
    }

    const po =
      getPurchaseOrderInfo(
        row.purchase_order,
      );

    if (!po) {
      continue;
    }

    /*
     * Ignore cancelled POs because they
     * should not influence historical
     * purchase-price intelligence.
     */

    if (
      po.status ===
      "cancelled"
    ) {
      continue;
    }

    const product =
      getProductInfo(
        row.product,
      );

    const existing =
      productMap.get(
        row.product_id,
      ) ?? {
        productId:
          row.product_id,

        productName:
          product.name,

        sku:
          product.sku,

        currencyCode:
          po.currencyCode ||
          "AED",

        history: [],
      };

    existing.history.push({
      purchaseOrderId:
        po.id,

      orderDate:
        po.orderDate,

      productId:
        row.product_id,

      productName:
        product.name,

      sku:
        product.sku,

      quantity:
        toNumber(
          row.ordered_quantity,
        ),

      unitPrice:
        toNumber(
          row.unit_price,
        ),

      lineTotal:
        toNumber(
          row.line_total,
        ),

      currencyCode:
        po.currencyCode ||
        "AED",
    });

    productMap.set(
      row.product_id,
      existing,
    );
  }

  const products:
    SupplierProductPriceIntelligence[] =
    [];

  for (
    const item of
    productMap.values()
  ) {
    const history =
      [...item.history]
        .sort(
          (
            first,
            second,
          ) =>
            first.orderDate.localeCompare(
              second.orderDate,
            ),
        );

    const validHistory =
      history.filter(
        (point) =>
          point.unitPrice >
          0,
      );

    const prices =
      validHistory.map(
        (point) =>
          point.unitPrice,
      );

    const totalOrderedQuantity =
      history.reduce(
        (
          total,
          point,
        ) =>
          total +
          point.quantity,
        0,
      );

    const totalPurchaseValue =
      history.reduce(
        (
          total,
          point,
        ) =>
          total +
          point.lineTotal,
        0,
      );

    const firstPoint =
      validHistory[0] ??
      null;

    const latestPoint =
      validHistory[
        validHistory.length -
          1
      ] ??
      null;

    const previousPoint =
      validHistory.length >=
      2
        ? validHistory[
            validHistory.length -
              2
          ]
        : null;

    const lowestUnitPrice =
      prices.length >
      0
        ? Math.min(
            ...prices,
          )
        : null;

    const highestUnitPrice =
      prices.length >
      0
        ? Math.max(
            ...prices,
          )
        : null;

    const averageUnitPrice =
      prices.length >
      0
        ? prices.reduce(
            (
              total,
              price,
            ) =>
              total +
              price,
            0,
          ) /
          prices.length
        : null;

    const weightedAverageUnitPrice =
      totalOrderedQuantity >
        0 &&
      totalPurchaseValue >
        0
        ? totalPurchaseValue /
          totalOrderedQuantity
        : null;

    const latestPriceChangePercent =
      latestPoint &&
      previousPoint &&
      previousPoint.unitPrice >
        0
        ? (
            (
              latestPoint.unitPrice -
              previousPoint.unitPrice
            ) /
            previousPoint.unitPrice
          ) *
          100
        : null;

    const priceVolatilityPercent =
      calculateVolatilityPercent(
        prices,
      );

    const priceStabilityScore =
      calculatePriceStabilityScore(
        priceVolatilityPercent,
      );

    products.push({
      productId:
        item.productId,

      productName:
        item.productName,

      sku:
        item.sku,

      purchaseCount:
        history.length,

      firstPurchaseDate:
        history[0]
          ?.orderDate ??
        null,

      lastPurchaseDate:
        history[
          history.length -
            1
        ]
          ?.orderDate ??
        null,

      firstUnitPrice:
        firstPoint
          ?.unitPrice ??
        null,

      previousUnitPrice:
        previousPoint
          ?.unitPrice ??
        null,

      latestUnitPrice:
        latestPoint
          ?.unitPrice ??
        null,

      lowestUnitPrice:
        lowestUnitPrice !==
        null
          ? round(
              lowestUnitPrice,
              4,
            )
          : null,

      highestUnitPrice:
        highestUnitPrice !==
        null
          ? round(
              highestUnitPrice,
              4,
            )
          : null,

      averageUnitPrice:
        averageUnitPrice !==
        null
          ? round(
              averageUnitPrice,
              4,
            )
          : null,

      weightedAverageUnitPrice:
        weightedAverageUnitPrice !==
        null
          ? round(
              weightedAverageUnitPrice,
              4,
            )
          : null,

      latestPriceChangePercent:
        latestPriceChangePercent !==
        null
          ? round(
              latestPriceChangePercent,
              2,
            )
          : null,

      totalOrderedQuantity:
        round(
          totalOrderedQuantity,
          3,
        ),

      totalPurchaseValue:
        round(
          totalPurchaseValue,
          4,
        ),

      priceVolatilityPercent:
        priceVolatilityPercent !==
        null
          ? round(
              priceVolatilityPercent,
              2,
            )
          : null,

      priceStabilityScore,

      currencyCode:
        item.currencyCode,

      history,
    });
  }

  products.sort(
    (
      first,
      second,
    ) =>
      second.totalPurchaseValue -
      first.totalPurchaseValue,
  );

  const productsWithPriceHistory =
    products.filter(
      (product) =>
        product.purchaseCount >=
        2,
    );

  const productsWithStablePrices =
    productsWithPriceHistory.filter(
      (product) =>
        product.priceStabilityScore !==
          null &&
        product.priceStabilityScore >=
          80,
    ).length;

  const productsWithRisingPrices =
    productsWithPriceHistory.filter(
      (product) =>
        product.latestPriceChangePercent !==
          null &&
        product.latestPriceChangePercent >
          0,
    ).length;

  const productsWithFallingPrices =
    productsWithPriceHistory.filter(
      (product) =>
        product.latestPriceChangePercent !==
          null &&
        product.latestPriceChangePercent <
          0,
    ).length;

  const volatilityValues =
    productsWithPriceHistory
      .map(
        (product) =>
          product.priceVolatilityPercent,
      )
      .filter(
        (
          value,
        ): value is number =>
          value !==
          null,
      );

  const stabilityValues =
    productsWithPriceHistory
      .map(
        (product) =>
          product.priceStabilityScore,
      )
      .filter(
        (
          value,
        ): value is number =>
          value !==
          null,
      );

  const averagePriceVolatilityPercent =
    volatilityValues.length >
    0
      ? round(
          volatilityValues.reduce(
            (
              total,
              value,
            ) =>
              total +
              value,
            0,
          ) /
            volatilityValues.length,
          2,
        )
      : null;

  const overallPriceStabilityScore =
    stabilityValues.length >
    0
      ? round(
          stabilityValues.reduce(
            (
              total,
              value,
            ) =>
              total +
              value,
            0,
          ) /
            stabilityValues.length,
          1,
        )
      : null;

  return {
    summary: {
      supplierId:
        id,

      supplierName:
        supplier.company_name,

      productsWithPriceHistory:
        productsWithPriceHistory.length,

      productsWithStablePrices,

      productsWithRisingPrices,

      productsWithFallingPrices,

      averagePriceVolatilityPercent,

      overallPriceStabilityScore,
    },

    products,
  };
}