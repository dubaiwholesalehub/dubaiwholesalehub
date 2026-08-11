import { z } from "zod";

export const stockCountItemSchema =
  z.object({
    productId: z
      .string()
      .uuid(
        "Please select a valid product.",
      ),

    countedQuantity: z.coerce
      .number()
      .min(
        0,
        "Physical count cannot be negative.",
      )
      .max(
        999999999,
        "Physical count is too large.",
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

export const stockCountSchema =
  z
    .object({
      warehouseId: z
        .string()
        .uuid(
          "Please select a warehouse.",
        ),

      transactionDate: z
        .string()
        .min(
          1,
          "Stock count date is required.",
        ),

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
          stockCountItemSchema,
        )
        .min(
          1,
          "Add at least one product.",
        ),
    })
    .superRefine(
      (value, context) => {
        const ids =
          value.items.map(
            (item) =>
              item.productId,
          );

        if (
          new Set(ids).size !==
          ids.length
        ) {
          context.addIssue({
            code: "custom",
            path: ["items"],
            message:
              "The same product cannot be added more than once.",
          });
        }
      },
    );

export type StockCountInput =
  z.infer<
    typeof stockCountSchema
  >;