import { z } from "zod";

export const openingStockItemSchema =
  z.object({
    productId: z
      .string()
      .uuid(
        "Please select a valid product.",
      ),

    quantity: z.coerce
      .number()
      .positive(
        "Opening quantity must be greater than zero.",
      )
      .max(
        999999999,
        "Opening quantity is too large.",
      ),

    unitCost: z.coerce
      .number()
      .min(
        0,
        "Unit cost cannot be negative.",
      )
      .max(
        999999999,
        "Unit cost is too large.",
      ),

    notes: z
      .string()
      .trim()
      .max(
        500,
        "Line notes cannot exceed 500 characters.",
      )
      .optional(),
  });

export const openingStockSchema =
  z.object({
    warehouseId: z
      .string()
      .uuid(
        "Please select a warehouse.",
      ),

    transactionDate: z
      .string()
      .min(
        1,
        "Opening stock date is required.",
      ),

    referenceNumber: z
      .string()
      .trim()
      .max(
        100,
        "Reference cannot exceed 100 characters.",
      )
      .optional(),

    description: z
      .string()
      .trim()
      .max(
        250,
        "Description cannot exceed 250 characters.",
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
        openingStockItemSchema,
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

      const uniqueIds =
        new Set(productIds);

      if (
        uniqueIds.size !==
        productIds.length
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

export type OpeningStockInput =
  z.infer<
    typeof openingStockSchema
  >;