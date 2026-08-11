import { createClient } from "@/lib/supabase/server";
import {
  getSupplierPerformance,
} from "@/lib/purchasing/supplier-performance.repository";

/* =========================================================
 * Types
 * ========================================================= */

export interface SupplierComparisonItem {
  supplierId: string;
  supplierName: string;

  costPrice: number | null;
  lastPurchasePrice: number | null;
  effectiveCost: number | null;

  currencyCode: string;

  moq: number;
  leadTimeDays: number;

  supplierPriority: number;

  isPreferred: boolean;
  historicalPerformanceScore: number | null;

  onTimeDeliveryRate: number | null;

  fillRate: number | null;

  actualLeadTimeDays: number | null;

  qualityScore: number | null;

  acceptanceRate: number | null;

  rejectionRate: number | null;

  damageRate: number | null;

  completedGoodsReceipts: number;

  priceStabilityScore: number | null;

  hasPerformanceEvidence: boolean;

  comparisonConfidence:
  | "high"
  | "medium"
  | "limited";

  requiredQuantity: number;

  purchaseQuantity: number;

  estimatedPurchaseValue: number | null;

  priceScore: number;
  leadTimeScore: number;
  moqScore: number;
  preferredScore: number;

  overallScore: number;

  priceRank: number | null;
  leadTimeRank: number;
  overallRank: number;

  recommendation:
  | "best_overall"
  | "lowest_price"
  | "fastest"
  | "alternative";

  reasons: string[];
}

export interface SupplierComparisonResult {
  productId: string;
  productName: string;
  sku: string | null;

  requiredQuantity: number;

  suppliers: SupplierComparisonItem[];

  bestSupplier: SupplierComparisonItem | null;

  lowestPriceSupplier: SupplierComparisonItem | null;

  fastestSupplier: SupplierComparisonItem | null;
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

function nullableNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    toNumber(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function getSupplierName(
  supplier:
    | {
      company_name: string;
    }
    | {
      company_name: string;
    }[]
    | null,
): string {
  if (!supplier) {
    return "Unknown supplier";
  }

  if (
    Array.isArray(
      supplier,
    )
  ) {
    return (
      supplier[0]?.company_name ??
      "Unknown supplier"
    );
  }

  return (
    supplier.company_name ??
    "Unknown supplier"
  );
}

function roundUpToMultiple(
  quantity: number,
  multiple: number,
): number {
  if (
    quantity <= 0
  ) {
    return 0;
  }

  const safeMultiple =
    multiple > 0
      ? multiple
      : 1;

  return (
    Math.ceil(
      quantity /
      safeMultiple,
    ) *
    safeMultiple
  );
}

function clampScore(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      value,
    ),
  );
}

function roundScore(
  value: number,
): number {
  return Math.round(
    clampScore(value) *
    10,
  ) / 10;
}

/* =========================================================
 * Supplier Comparison Engine
 * ========================================================= */

export async function compareSuppliersForProduct(
  productId: string,
  requiredQuantity = 1,
): Promise<SupplierComparisonResult> {
  const id =
    productId.trim();

  if (!id) {
    throw new Error(
      "Product ID is required.",
    );
  }

  if (
    !Number.isFinite(
      requiredQuantity,
    ) ||
    requiredQuantity <= 0
  ) {
    throw new Error(
      "Required quantity must be greater than zero.",
    );
  }

  const supabase =
    await createClient();

  /* =======================================================
   * Product
   * ======================================================= */

  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .select(`
      id,
      name,
      sku,
      moq,
      procurement_lead_time_days
    `)
    .eq(
      "id",
      id,
    )
    .maybeSingle();

  if (productError) {
    throw new Error(
      `Unable to load product: ${productError.message}`,
    );
  }

  if (!product) {
    throw new Error(
      "Product was not found.",
    );
  }

  /* =======================================================
   * Product Suppliers
   * ======================================================= */

  const {
    data: mappings,
    error: mappingError,
  } = await supabase
    .from(
      "product_suppliers",
    )
    .select(`
      product_id,
      supplier_id,

      cost_price,
      last_purchase_price,

      currency_code,

      moq,
      lead_time_days,

      priority,

      is_preferred,
      is_active,

      supplier:suppliers (
        id,
        company_name,
        is_active
      )
    `)
    .eq(
      "product_id",
      id,
    )
    .eq(
      "is_active",
      true,
    );

  if (mappingError) {
    throw new Error(
      `Unable to load supplier comparison: ${mappingError.message}`,
    );
  }

  /* =======================================================
   * Normalize Supplier Data
   * ======================================================= */

  const normalized =
    (mappings ?? [])
      .filter(
        (mapping) => {
          if (
            !mapping.supplier
          ) {
            return false;
          }

          if (
            Array.isArray(
              mapping.supplier,
            )
          ) {
            return (
              mapping.supplier[0]
                ?.is_active !==
              false
            );
          }

          return (
            mapping.supplier
              .is_active !==
            false
          );
        },
      )
      .map(
        (mapping) => {
          const costPrice =
            nullableNumber(
              mapping.cost_price,
            );

          const lastPurchasePrice =
            nullableNumber(
              mapping
                .last_purchase_price,
            );

          /*
           * Prefer last actual purchase price because
           * it reflects what we most recently paid.
           *
           * Fall back to supplier mapping cost price.
           */
          const effectiveCost =
            lastPurchasePrice ??
            costPrice;

          const supplierMoq =
            toNumber(
              mapping.moq,
            );

          const productMoq =
            toNumber(
              product.moq,
            );

          const moq =
            supplierMoq > 0
              ? supplierMoq
              : productMoq > 0
                ? productMoq
                : 1;

          const supplierLeadTime =
            toNumber(
              mapping
                .lead_time_days,
            );

          const productLeadTime =
            toNumber(
              product
                .procurement_lead_time_days,
            );

          const leadTimeDays =
            supplierLeadTime > 0
              ? supplierLeadTime
              : productLeadTime;

          const purchaseQuantity =
            roundUpToMultiple(
              requiredQuantity,
              moq,
            );

          return {
            supplierId:
              mapping.supplier_id,

            supplierName:
              getSupplierName(
                mapping.supplier,
              ),

            costPrice,

            lastPurchasePrice,

            effectiveCost,

            currencyCode:
              mapping.currency_code ||
              "AED",

            moq,

            leadTimeDays,

            supplierPriority:
              toNumber(
                mapping.priority,
              ),

            isPreferred:
              Boolean(
                mapping.is_preferred,
              ),

            requiredQuantity,

            purchaseQuantity,

            estimatedPurchaseValue:
              effectiveCost !==
                null
                ? effectiveCost *
                purchaseQuantity
                : null,
          };
        },
      );

  if (
    normalized.length ===
    0
  ) {
    return {
      productId:
        product.id,

      productName:
        product.name,

      sku:
        product.sku,

      requiredQuantity,

      suppliers: [],

      bestSupplier:
        null,

      lowestPriceSupplier:
        null,

      fastestSupplier:
        null,
    };
  }

  /* =======================================================
   * Comparison Baselines
   * ======================================================= */

  const pricedSuppliers =
    normalized.filter(
      (supplier) =>
        supplier.effectiveCost !==
        null &&
        supplier.effectiveCost >
        0,
    );

  const lowestCost =
    pricedSuppliers.length >
      0
      ? Math.min(
        ...pricedSuppliers.map(
          (supplier) =>
            supplier.effectiveCost ??
            Number.POSITIVE_INFINITY,
        ),
      )
      : null;

  const fastestLeadTime =
    Math.min(
      ...normalized.map(
        (supplier) =>
          Math.max(
            supplier.leadTimeDays,
            0,
          ),
      ),
    );

  const lowestMoq =
    Math.min(
      ...normalized.map(
        (supplier) =>
          Math.max(
            supplier.moq,
            1,
          ),
      ),
    );


  /* =======================================================
* Historical Supplier Performance
* ======================================================= */

  const performanceResults =
    await Promise.all(
      normalized.map(
        async (supplier) => {
          const result =
            await getSupplierPerformance(
              supplier.supplierId,
            );

          return {
            supplierId:
              supplier.supplierId,

            metrics:
              result.metrics,
          };
        },
      ),
    );

  const performanceBySupplier =
    new Map(
      performanceResults.map(
        (result) => [
          result.supplierId,
          result.metrics,
        ],
      ),
    );

  /*
 * Supplier Comparison v2
 *
 * Current Commercial Factors
 *
 * Price                    30%
 * Configured Lead Time     15%
 * MOQ                      10%
 * Preferred Supplier        5%
 *
 * Historical Performance  40%
 *
 *
 * Historical performance itself already
 * includes evidence-backed:
 *
 * - delivery reliability
 * - actual lead-time performance
 * - fill rate
 * - receiving quality
 * - price stability
 *
 * Receiving quality is intentionally not
 * given another direct comparison weight,
 * because it is already included inside
 * historicalPerformanceScore.
 *
 * Missing historical evidence does NOT
 * automatically punish a supplier.
 *
 * Available weights are normalized.
 */
  const scored =
    normalized.map(
      (supplier) => {
        const priceScore =
          supplier.effectiveCost !==
            null &&
            lowestCost !==
            null &&
            supplier.effectiveCost >
            0
            ? (
              lowestCost /
              supplier.effectiveCost
            ) *
            100
            : 0;

        const leadTimeScore =
          supplier.leadTimeDays <=
            0
            ? fastestLeadTime <=
              0
              ? 100
              : 0
            : fastestLeadTime <=
              0
              ? 100
              : (
                fastestLeadTime /
                supplier.leadTimeDays
              ) *
              100;

        const moqScore =
          supplier.moq <=
            0
            ? 100
            : (
              lowestMoq /
              supplier.moq
            ) *
            100;

        const preferredScore =
          supplier.isPreferred
            ? 100
            : 0;

        const performance =
          performanceBySupplier.get(
            supplier.supplierId,
          );

        /*
         * Determine whether enough historical
         * evidence exists to use performance
         * scoring.
         */

        const hasPerformanceEvidence =
          Boolean(
            performance &&
            (
              performance.completedOrdersWithDeliveryData >
              0 ||
              performance.orderedQuantity >
              0 ||
              performance.completedGoodsReceipts >
              0 ||
              performance.averagePriceVariance !==
              null
            ),
          );

        const historicalPerformanceScore =
          hasPerformanceEvidence &&
            performance
            ? performance.overallScore
            : null;

        /*
         * Use only available evidence.
         *
         * A supplier with no historical data
         * should not automatically receive zero.
         */

        const scoreParts: {
          score: number;
          weight: number;
        }[] = [];

        if (
          supplier.effectiveCost !==
          null
        ) {
          scoreParts.push({
            score:
              priceScore,

            weight:
              0.3,
          });
        }

        scoreParts.push({
          score:
            leadTimeScore,

          weight:
            0.15,
        });

        scoreParts.push({
          score:
            moqScore,

          weight:
            0.1,
        });

        scoreParts.push({
          score:
            preferredScore,

          weight:
            0.05,
        });

        if (
          historicalPerformanceScore !==
          null
        ) {
          scoreParts.push({
            score:
              historicalPerformanceScore,

            weight:
              0.4,
          });
        }

        const totalWeight =
          scoreParts.reduce(
            (
              total,
              part,
            ) =>
              total +
              part.weight,
            0,
          );

        const overallScore =
          totalWeight >
            0
            ? scoreParts.reduce(
              (
                total,
                part,
              ) =>
                total +
                part.score *
                part.weight,
              0,
            ) /
            totalWeight
            : 0;

        /*
         * Comparison confidence indicates how
         * much evidence HM ERP has behind the
         * recommendation.
         */

        let comparisonConfidence:
          | "high"
          | "medium"
          | "limited" =
          "limited";

        if (
          performance &&
          performance.completedOrdersWithDeliveryData >=
          3 &&
          performance.orderedQuantity >
          0 &&
          performance.averagePriceVariance !==
          null
        ) {
          comparisonConfidence =
            "high";
        } else if (
          hasPerformanceEvidence
        ) {
          comparisonConfidence =
            "medium";
        }

        return {
          ...supplier,

          priceScore:
            roundScore(
              priceScore,
            ),

          leadTimeScore:
            roundScore(
              leadTimeScore,
            ),

          moqScore:
            roundScore(
              moqScore,
            ),

          preferredScore,

          historicalPerformanceScore:
            historicalPerformanceScore !==
              null
              ? roundScore(
                historicalPerformanceScore,
              )
              : null,

          onTimeDeliveryRate:
            hasPerformanceEvidence &&
              performance
              ? performance.onTimeDeliveryRate
              : null,

          fillRate:
            hasPerformanceEvidence &&
              performance
              ? performance.fillRate
              : null,

          actualLeadTimeDays:
            performance
              ?.averageActualLeadTime ??
            null,

          qualityScore:
            performance &&
              performance.completedGoodsReceipts >
              0
              ? performance.qualityScore
              : null,

          acceptanceRate:
            performance &&
              performance.completedGoodsReceipts >
              0
              ? performance.acceptanceRate
              : null,

          rejectionRate:
            performance &&
              performance.completedGoodsReceipts >
              0
              ? performance.rejectionRate
              : null,

          damageRate:
            performance &&
              performance.completedGoodsReceipts >
              0
              ? performance.damageRate
              : null,

          completedGoodsReceipts:
            performance
              ?.completedGoodsReceipts ??
            0,

          priceStabilityScore:
            performance
              ?.averagePriceVariance !==
              null &&
              performance
                ?.averagePriceVariance !==
              undefined
              ? performance.priceStabilityScore
              : null,
          hasPerformanceEvidence,

          comparisonConfidence,

          overallScore:
            roundScore(
              overallScore,
            ),

          priceRank:
            null as
            | number
            | null,

          leadTimeRank:
            0,

          overallRank:
            0,

          recommendation:
            "alternative" as
            SupplierComparisonItem["recommendation"],

          reasons:
            [] as string[],
        };
      },
    );

  /* =======================================================
   * Ranking
   * ======================================================= */

  const priceRanking =
    [...scored]
      .filter(
        (supplier) =>
          supplier.effectiveCost !==
          null,
      )
      .sort(
        (
          first,
          second,
        ) =>
          (
            first.effectiveCost ??
            Number.POSITIVE_INFINITY
          ) -
          (
            second.effectiveCost ??
            Number.POSITIVE_INFINITY
          ),
      );

  priceRanking.forEach(
    (
      supplier,
      index,
    ) => {
      supplier.priceRank =
        index + 1;
    },
  );

  const leadTimeRanking =
    [...scored].sort(
      (
        first,
        second,
      ) =>
        first.leadTimeDays -
        second.leadTimeDays,
    );

  leadTimeRanking.forEach(
    (
      supplier,
      index,
    ) => {
      supplier.leadTimeRank =
        index + 1;
    },
  );

  const overallRanking =
    [...scored].sort(
      (
        first,
        second,
      ) => {
        const scoreDifference =
          second.overallScore -
          first.overallScore;

        if (
          scoreDifference !==
          0
        ) {
          return scoreDifference;
        }

        /*
         * Tie breaker:
         * lower estimated order value wins.
         */

        return (
          first
            .estimatedPurchaseValue ??
          Number.POSITIVE_INFINITY
        ) -
          (
            second
              .estimatedPurchaseValue ??
            Number.POSITIVE_INFINITY
          );
      },
    );

  overallRanking.forEach(
    (
      supplier,
      index,
    ) => {
      supplier.overallRank =
        index + 1;
    },
  );

  const bestSupplier =
    overallRanking[0] ??
    null;

  const lowestPriceSupplier =
    priceRanking[0] ??
    null;

  const fastestSupplier =
    leadTimeRanking[0] ??
    null;

  /* =======================================================
   * Recommendation Labels + Explanations
   * ======================================================= */

  for (
    const supplier of
    scored
  ) {
    const reasons:
      string[] = [];

    if (
      supplier.supplierId ===
      bestSupplier
        ?.supplierId
    ) {
      supplier.recommendation =
        "best_overall";

      reasons.push(
        "Highest overall supplier comparison score.",
      );
    } else if (
      supplier.supplierId ===
      lowestPriceSupplier
        ?.supplierId
    ) {
      supplier.recommendation =
        "lowest_price";
    } else if (
      supplier.supplierId ===
      fastestSupplier
        ?.supplierId
    ) {
      supplier.recommendation =
        "fastest";
    }

    if (
      supplier.priceRank ===
      1
    ) {
      reasons.push(
        "Lowest available purchase cost.",
      );
    }

    if (
      supplier.leadTimeRank ===
      1
    ) {
      reasons.push(
        "Fastest mapped lead time.",
      );
    }

    if (
      supplier.moq ===
      lowestMoq
    ) {
      reasons.push(
        "Lowest MOQ among mapped suppliers.",
      );
    }

    if (
      supplier.isPreferred
    ) {
      reasons.push(
        "Marked as preferred supplier.",
      );
    }

    if (
      supplier.historicalPerformanceScore !==
      null
    ) {
      reasons.push(
        `Historical supplier performance score: ${supplier.historicalPerformanceScore}/100.`,
      );
    }

    if (
      supplier.onTimeDeliveryRate !==
      null
    ) {
      reasons.push(
        `Historical on-time delivery: ${supplier.onTimeDeliveryRate.toFixed(
          1,
        )}%.`,
      );
    }

    if (
      supplier.fillRate !==
      null
    ) {
      reasons.push(
        `Historical fill rate: ${supplier.fillRate.toFixed(
          1,
        )}%.`,
      );
    }

    if (
      supplier.qualityScore !==
      null
    ) {
      reasons.push(
        `Receiving quality score: ${supplier.qualityScore.toFixed(
          1,
        )}/100.`,
      );
    }

    if (
      supplier.acceptanceRate !==
      null
    ) {
      reasons.push(
        `Historical acceptance rate: ${supplier.acceptanceRate.toFixed(
          1,
        )}%.`,
      );
    }

    if (
      supplier.rejectionRate !==
      null &&
      supplier.rejectionRate >
      0
    ) {
      reasons.push(
        `Historical rejection rate: ${supplier.rejectionRate.toFixed(
          1,
        )}%.`,
      );
    }

    if (
      supplier.damageRate !==
      null &&
      supplier.damageRate >
      0
    ) {
      reasons.push(
        `Historical damage rate: ${supplier.damageRate.toFixed(
          1,
        )}%.`,
      );
    }

    if (
      supplier.comparisonConfidence ===
      "limited"
    ) {
      reasons.push(
        "Limited historical purchasing evidence is available for this supplier.",
      );
    }

    if (
      supplier
        .lastPurchasePrice !==
      null
    ) {
      reasons.push(
        "Comparison uses the latest recorded purchase price.",
      );
    }

    if (
      supplier.effectiveCost ===
      null
    ) {
      reasons.push(
        "Purchase price is unavailable.",
      );
    }

    supplier.reasons =
      reasons;
  }

  return {
    productId:
      product.id,

    productName:
      product.name,

    sku:
      product.sku,

    requiredQuantity,

    suppliers:
      overallRanking,

    bestSupplier,

    lowestPriceSupplier,

    fastestSupplier,
  };
}