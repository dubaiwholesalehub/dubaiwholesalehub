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

const salesOrderStatusSchema = z.enum([
  "draft",
  "confirmed",
  "processing",
  "partially_fulfilled",
  "fulfilled",
  "completed",
  "cancelled",
  "closed",
]);

const salesOrderFulfilmentStatusSchema = z.enum([
  "unplanned",
  "awaiting_stock",
  "awaiting_procurement",
  "partially_allocated",
  "allocated",
  "partially_fulfilled",
  "fulfilled",
  "not_required",
]);

const salesOrderPaymentStatusSchema = z.enum([
  "unpaid",
  "partially_paid",
  "paid",
  "overpaid",
  "refunded",
]);

const salesOrderSourceSchema = z.enum([
  "internal",
  "hmshoponline",
  "dubaiwholesalehub",
  "import",
]);

const productFulfilmentMethodSchema = z.enum([
  "stock",
  "local_purchase",
  "import_on_demand",
  "dropship",
  "service",
]);

/* =========================================================
 * Sales Order Header Base Schema
 * ========================================================= */

const salesOrderBaseSchema = z.object({
  quotation_id: optionalUuid,

  customer_id: requiredUuid,

  customer_contact_id: optionalUuid,

  billing_address_id: optionalUuid,
  shipping_address_id: optionalUuid,

  warehouse_id: optionalUuid,

  order_date: z
    .string()
    .trim()
    .min(
      1,
      "Order date is required.",
    ),

  requested_delivery_date:
    optionalDate,

  expected_delivery_date:
    optionalDate,

  status:
    salesOrderStatusSchema.default(
      "draft",
    ),

  fulfilment_status:
    salesOrderFulfilmentStatusSchema.default(
      "unplanned",
    ),

  payment_status:
    salesOrderPaymentStatusSchema.default(
      "unpaid",
    ),

  source:
    salesOrderSourceSchema.default(
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
 * Sales Order Header Business Rules
 * ========================================================= */

function applySalesOrderRules(
  values: z.infer<
    typeof salesOrderBaseSchema
  >,
  context: z.RefinementCtx,
): void {
  if (
    values.requested_delivery_date &&
    values.requested_delivery_date <
      values.order_date
  ) {
    context.addIssue({
      code: "custom",
      path: [
        "requested_delivery_date",
      ],
      message:
        "Requested delivery date cannot be earlier than the order date.",
    });
  }

  if (
    values.expected_delivery_date &&
    values.expected_delivery_date <
      values.order_date
  ) {
    context.addIssue({
      code: "custom",
      path: [
        "expected_delivery_date",
      ],
      message:
        "Expected delivery date cannot be earlier than the order date.",
    });
  }

  if (
    values.requested_delivery_date &&
    values.expected_delivery_date &&
    values.expected_delivery_date <
      values.requested_delivery_date
  ) {
    context.addIssue({
      code: "custom",
      path: [
        "expected_delivery_date",
      ],
      message:
        "Expected delivery date cannot be earlier than the requested delivery date.",
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
        "External reference should only be used for imported or connected-channel sales orders.",
    });
  }
}

export const salesOrderSchema =
  salesOrderBaseSchema.superRefine(
    applySalesOrderRules,
  );

export const createSalesOrderSchema =
  salesOrderSchema;

export const updateSalesOrderSchema =
  salesOrderBaseSchema.partial();

/* =========================================================
 * Sales Order Item Base Schema
 * ========================================================= */

const salesOrderItemBaseSchema =
  z.object({
    quotation_item_id:
      optionalUuid,

    product_id: optionalUuid,

    unit_id: optionalUuid,

    warehouse_id:
      optionalUuid,

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

    fulfilment_method:
      productFulfilmentMethodSchema.default(
        "stock",
      ),

    procurement_lead_time_days:
      z.coerce
        .number({
          message:
            "Procurement lead time must be a valid number.",
        })
        .int(
          "Procurement lead time must be a whole number.",
        )
        .min(
          0,
          "Procurement lead time cannot be negative.",
        )
        .max(
          3650,
          "Procurement lead time cannot exceed 3650 days.",
        )
        .default(0),

    allow_backorder: z.coerce
      .boolean()
      .default(false),

    procurement_notes:
      optionalText,

    requested_delivery_date:
      optionalDate,

    expected_delivery_date:
      optionalDate,

    line_notes: optionalText,
  });

/* =========================================================
 * Sales Order Item Business Rules
 * ========================================================= */

function applySalesOrderItemRules(
  values: z.infer<
    typeof salesOrderItemBaseSchema
  >,
  context: z.RefinementCtx,
): void {
  if (
    values.expected_delivery_date &&
    values.requested_delivery_date &&
    values.expected_delivery_date <
      values.requested_delivery_date
  ) {
    context.addIssue({
      code: "custom",
      path: [
        "expected_delivery_date",
      ],
      message:
        "Expected delivery date cannot be earlier than the requested delivery date.",
    });
  }

  if (
    values.fulfilment_method ===
      "service" &&
    values.procurement_lead_time_days >
      0
  ) {
    context.addIssue({
      code: "custom",
      path: [
        "procurement_lead_time_days",
      ],
      message:
        "Service items should not have procurement lead time.",
    });
  }

  if (
    values.fulfilment_method ===
      "service" &&
    values.allow_backorder
  ) {
    context.addIssue({
      code: "custom",
      path: [
        "allow_backorder",
      ],
      message:
        "Service items cannot be backordered.",
    });
  }

  if (
    !values.product_id &&
    !values.item_name.trim()
  ) {
    context.addIssue({
      code: "custom",
      path: ["item_name"],
      message:
        "Enter an item name for a custom sales order line.",
    });
  }
}

export const salesOrderItemSchema =
  salesOrderItemBaseSchema.superRefine(
    applySalesOrderItemRules,
  );

export const createSalesOrderItemSchema =
  salesOrderItemSchema;

export const updateSalesOrderItemSchema =
  salesOrderItemBaseSchema.partial();

/* =========================================================
 * Search and Filter Schema
 * ========================================================= */

export const salesOrderListFilterSchema =
  z
    .object({
      search: z
        .string()
        .trim()
        .optional(),

      status: z
        .union([
          salesOrderStatusSchema,
          z.literal("all"),
        ])
        .default("all"),

      fulfilment_status: z
        .union([
          salesOrderFulfilmentStatusSchema,
          z.literal("all"),
        ])
        .default("all"),

      payment_status: z
        .union([
          salesOrderPaymentStatusSchema,
          z.literal("all"),
        ])
        .default("all"),

      source: z
        .union([
          salesOrderSourceSchema,
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

export type SalesOrderFormValues =
  z.input<
    typeof salesOrderSchema
  >;

export type SalesOrderValidatedValues =
  z.output<
    typeof salesOrderSchema
  >;

export type SalesOrderItemFormValues =
  z.input<
    typeof salesOrderItemSchema
  >;

export type SalesOrderItemValidatedValues =
  z.output<
    typeof salesOrderItemSchema
  >;

export type SalesOrderListFilterValues =
  z.output<
    typeof salesOrderListFilterSchema
  >;

export type SalesOrderStatus =
  z.infer<
    typeof salesOrderStatusSchema
  >;

export type SalesOrderFulfilmentStatus =
  z.infer<
    typeof salesOrderFulfilmentStatusSchema
  >;

export type SalesOrderPaymentStatus =
  z.infer<
    typeof salesOrderPaymentStatusSchema
  >;

export type SalesOrderSource =
  z.infer<
    typeof salesOrderSourceSchema
  >;

export type ProductFulfilmentMethod =
  z.infer<
    typeof productFulfilmentMethodSchema
  >;