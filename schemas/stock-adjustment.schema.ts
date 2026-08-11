import { z } from "zod";

export const stockAdjustmentReasons = [
  "correction",
  "damage",
  "lost",
  "found",
  "expired",
  "sample",
  "other",
] as const;

export const stockAdjustmentReasonSchema =
  z.enum(stockAdjustmentReasons);

export const stockAdjustmentItemSchema =
  z.object({
    productId: z
      .string()
      .uuid(
        "Please select a valid product.",
      ),

    quantity: z.coerce
      .number()
      .positive(
        "Adjustment quantity must be greater than zero.",
      )
      .max(
        999999999,
        "Adjustment quantity is too large.",
      ),

    unitCost: z
      .union([
        z.coerce
          .number()
          .min(
            0,
            "Unit cost cannot be negative.",
          )
          .max(
            999999999,
            "Unit cost is too large.",
          ),

        z.literal(""),
        z.undefined(),
      ])
      .optional(),

    notes: z
      .string()
      .trim()
      .max(
        500,
        "Line notes cannot exceed 500 characters.",
      )
      .optional(),
  });

export const stockAdjustmentSchema =
  z
    .object({
      adjustmentType: z.enum([
        "adjustment_in",
        "adjustment_out",
      ]),

      warehouseId: z
        .string()
        .uuid(
          "Please select a warehouse.",
        ),

      transactionDate: z
        .string()
        .min(
          1,
          "Adjustment date is required.",
        ),

      reason:
        stockAdjustmentReasonSchema,

      referenceNumber: z
        .string()
        .trim()
        .max(
          100,
          "Reference cannot exceed 100 characters.",
        )
        .optional(),

      internalNotes: z
        .string()
        .trim()
        .max(
          2000,
          "Internal notes cannot exceed 2000 characters.",
        )
        .optional(),

      items: z
        .array(
          stockAdjustmentItemSchema,
        )
        .min(
          1,
          "Add at least one product.",
        ),
    })
    .superRefine(
      (value, context) => {
        const productIds =
          value.items.map(
            (item) =>
              item.productId,
          );

        if (
          new Set(productIds)
            .size !==
          productIds.length
        ) {
          context.addIssue({
            code: "custom",
            path: ["items"],
            message:
              "The same product cannot be added more than once.",
          });
        }

        /*
         * Adjustment In requires a cost because
         * we're introducing new inventory value.
         *
         * Adjustment Out uses the warehouse's
         * existing average cost automatically.
         */
        if (
          value.adjustmentType ===
          "adjustment_in"
        ) {
          value.items.forEach(
            (item, index) => {
              if (
                item.unitCost ===
                  undefined ||
                item.unitCost ===
                  ""
              ) {
                context.addIssue({
                  code: "custom",
                  path: [
                    "items",
                    index,
                    "unitCost",
                  ],
                  message:
                    "Unit cost is required for stock increases.",
                });
              }
            },
          );
        }
      },
    );

export type StockAdjustmentInput =
  z.infer<
    typeof stockAdjustmentSchema
  >;

export type StockAdjustmentReason =
  z.infer<
    typeof stockAdjustmentReasonSchema
  >;