import { z } from "zod";

/* =========================================================
 * Shared Helpers
 * ========================================================= */

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()
  .optional();

const optionalUuid = z
  .string()
  .trim()
  .uuid("Enter a valid ID.")
  .or(z.literal(""))
  .transform((value) => value || null)
  .nullable()
  .optional();

const requiredUuid = z
  .string()
  .trim()
  .uuid("Enter a valid ID.");

const optionalDate = z
  .string()
  .trim()
  .or(z.literal(""))
  .transform((value) => value || null)
  .nullable()
  .optional();

const salesQuotationStatusSchema = z.enum([
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
  "converted",
]);

const salesQuotationSourceSchema = z.enum([
  "internal",
  "hmshoponline",
  "dubaiwholesalehub",
  "import",
]);

/* =========================================================
 * Sales Quotation Header Base Schema
 * ========================================================= */

const salesQuotationBaseSchema = z.object({
  customer_id: requiredUuid,

  customer_contact_id: optionalUuid,

  billing_address_id: optionalUuid,
  shipping_address_id: optionalUuid,

  warehouse_id: optionalUuid,

  quotation_date: z
    .string()
    .trim()
    .min(
      1,
      "Quotation date is required.",
    ),

  valid_until: optionalDate,

  status:
    salesQuotationStatusSchema.default(
      "draft",
    ),

  source:
    salesQuotationSourceSchema.default(
      "internal",
    ),

  external_reference: optionalText,

  customer_reference: optionalText,

  currency_code: z
    .string()
    .trim()
    .length(
      3,
      "Currency code must contain exactly 3 characters.",
    )
    .transform((value) =>
      value.toUpperCase(),
    )
    .default("AED"),

  exchange_rate: z.coerce
    .number({
      message:
        "Exchange rate must be a valid number.",
    })
    .positive(
      "Exchange rate must be greater than zero.",
    )
    .default(1),

  shipping_amount: z.coerce
    .number({
      message:
        "Shipping amount must be a valid number.",
    })
    .min(
      0,
      "Shipping amount cannot be negative.",
    )
    .default(0),

  payment_terms_days: z.coerce
    .number({
      message:
        "Payment terms must be a valid number.",
    })
    .int(
      "Payment terms must be a whole number.",
    )
    .min(
      0,
      "Payment terms cannot be negative.",
    )
    .max(
      3650,
      "Payment terms cannot exceed 3650 days.",
    )
    .default(0),

  delivery_terms: optionalText,

  payment_terms: optionalText,

  customer_notes: optionalText,

  internal_notes: optionalText,
});

/* =========================================================
 * Sales Quotation Header Business Rules
 * ========================================================= */

function applySalesQuotationRules(
  values: z.infer<
    typeof salesQuotationBaseSchema
  >,
  context: z.RefinementCtx,
): void {
  if (
    values.valid_until &&
    values.valid_until <
      values.quotation_date
  ) {
    context.addIssue({
      code: "custom",
      path: ["valid_until"],
      message:
        "Valid-until date cannot be earlier than the quotation date.",
    });
  }

  if (
    values.source === "internal" &&
    values.external_reference
  ) {
    context.addIssue({
      code: "custom",
      path: [
        "external_reference",
      ],
      message:
        "External reference should only be used for imported or connected-channel quotations.",
    });
  }
}

export const salesQuotationSchema =
  salesQuotationBaseSchema.superRefine(
    applySalesQuotationRules,
  );

export const createSalesQuotationSchema =
  salesQuotationSchema;

export const updateSalesQuotationSchema =
  salesQuotationBaseSchema.partial();

/* =========================================================
 * Sales Quotation Item Base Schema
 * ========================================================= */

const salesQuotationItemBaseSchema =
  z.object({
    product_id: optionalUuid,

    unit_id: optionalUuid,

    sku: optionalText,

    item_name: z
      .string()
      .trim()
      .min(
        1,
        "Item name is required.",
      )
      .max(
        250,
        "Item name must be 250 characters or fewer.",
      ),

    description: optionalText,

    quantity: z.coerce
      .number({
        message:
          "Quantity must be a valid number.",
      })
      .positive(
        "Quantity must be greater than zero.",
      )
      .max(
        99999999999999,
        "Quantity is too large.",
      ),

    unit_price: z.coerce
      .number({
        message:
          "Unit price must be a valid number.",
      })
      .min(
        0,
        "Unit price cannot be negative.",
      )
      .max(
        99999999999999,
        "Unit price is too large.",
      ),

    discount_percentage: z.coerce
      .number({
        message:
          "Discount percentage must be a valid number.",
      })
      .min(
        0,
        "Discount percentage cannot be negative.",
      )
      .max(
        100,
        "Discount percentage cannot exceed 100.",
      )
      .default(0),

    tax_percentage: z.coerce
      .number({
        message:
          "Tax percentage must be a valid number.",
      })
      .min(
        0,
        "Tax percentage cannot be negative.",
      )
      .max(
        100,
        "Tax percentage cannot exceed 100.",
      )
      .default(0),

    requested_delivery_date:
      optionalDate,

    line_notes: optionalText,
  });

/* =========================================================
 * Sales Quotation Item Business Rules
 * ========================================================= */

function applySalesQuotationItemRules(
  values: z.infer<
    typeof salesQuotationItemBaseSchema
  >,
  context: z.RefinementCtx,
): void {
  if (
    !values.product_id &&
    !values.item_name.trim()
  ) {
    context.addIssue({
      code: "custom",
      path: ["item_name"],
      message:
        "Enter an item name for a custom quotation line.",
    });
  }

  if (
    values.product_id &&
    !values.sku &&
    !values.item_name
  ) {
    context.addIssue({
      code: "custom",
      path: ["item_name"],
      message:
        "Product quotation lines must include an item name.",
    });
  }
}

export const salesQuotationItemSchema =
  salesQuotationItemBaseSchema.superRefine(
    applySalesQuotationItemRules,
  );

export const createSalesQuotationItemSchema =
  salesQuotationItemSchema;

export const updateSalesQuotationItemSchema =
  salesQuotationItemBaseSchema.partial();

/* =========================================================
 * Status Action Schema
 * ========================================================= */

export const salesQuotationStatusActionSchema =
  z.object({
    quotation_id: requiredUuid,

    status:
      salesQuotationStatusSchema,
  });

/* =========================================================
 * Search and Filter Schema
 * ========================================================= */

export const salesQuotationListFilterSchema =
  z.object({
    search: z
      .string()
      .trim()
      .optional(),

    status: z
      .union([
        salesQuotationStatusSchema,
        z.literal("all"),
      ])
      .default("all"),

    source: z
      .union([
        salesQuotationSourceSchema,
        z.literal("all"),
      ])
      .default("all"),

    customer_id: optionalUuid,

    date_from: optionalDate,

    date_to: optionalDate,

    page: z.coerce
      .number()
      .int()
      .positive()
      .default(1),

    page_size: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(25),
  })
  .superRefine(
    (values, context) => {
      if (
        values.date_from &&
        values.date_to &&
        values.date_to <
          values.date_from
      ) {
        context.addIssue({
          code: "custom",
          path: ["date_to"],
          message:
            "End date cannot be earlier than the start date.",
        });
      }
    },
  );

/* =========================================================
 * Exported Types
 * ========================================================= */

export type SalesQuotationFormValues =
  z.input<
    typeof salesQuotationSchema
  >;

export type SalesQuotationValidatedValues =
  z.output<
    typeof salesQuotationSchema
  >;

export type SalesQuotationItemFormValues =
  z.input<
    typeof salesQuotationItemSchema
  >;

export type SalesQuotationItemValidatedValues =
  z.output<
    typeof salesQuotationItemSchema
  >;

export type SalesQuotationStatusActionValues =
  z.output<
    typeof salesQuotationStatusActionSchema
  >;

export type SalesQuotationListFilterValues =
  z.output<
    typeof salesQuotationListFilterSchema
  >;

export type SalesQuotationStatus =
  z.infer<
    typeof salesQuotationStatusSchema
  >;

export type SalesQuotationSource =
  z.infer<
    typeof salesQuotationSourceSchema
  >;