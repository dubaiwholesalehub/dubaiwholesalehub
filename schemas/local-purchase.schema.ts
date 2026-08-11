import { z } from "zod";

export const localPurchaseItemSchema =
  z.object({
    productId: z
      .string()
      .uuid(
        "Please select a valid product.",
      ),

    quantity: z.coerce
      .number()
      .positive(
        "Quantity must be greater than zero.",
      )
      .max(
        999999999,
        "Quantity is too large.",
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

export const localPurchaseSchema =
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
          "Purchase date is required.",
        ),

      supplierId: z
        .string()
        .optional(),

      storeName: z
        .string()
        .trim()
        .max(
          150,
          "Store name cannot exceed 150 characters.",
        )
        .optional(),

      receiptNumber: z
        .string()
        .trim()
        .max(
          100,
          "Receipt number cannot exceed 100 characters.",
        )
        .optional(),

      paymentMethod: z
        .enum([
          "cash",
          "card",
          "bank_transfer",
          "credit",
          "other",
        ]),

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
          localPurchaseItemSchema,
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

export type LocalPurchaseValidatedInput =
  z.infer<
    typeof localPurchaseSchema
  >;