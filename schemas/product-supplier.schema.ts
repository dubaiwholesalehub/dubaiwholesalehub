import { z } from "zod";

const optionalPositiveNumber = z
  .union([z.literal(""), z.coerce.number()])
  .transform((value) =>
    value === "" ? undefined : value,
  )
  .optional()
  .refine(
    (value) => value === undefined || value >= 0,
    "The amount cannot be negative.",
  );

const optionalPositiveInteger = z
  .union([z.literal(""), z.coerce.number()])
  .transform((value) =>
    value === "" ? undefined : value,
  )
  .optional()
  .refine(
    (value) =>
      value === undefined ||
      (Number.isInteger(value) && value >= 0),
    "Please enter a valid whole number.",
  );

export const productSupplierSchema = z.object({
  productId: z
    .string()
    .uuid("A valid product is required."),

  supplierId: z
    .string()
    .uuid("Please select a valid supplier."),

  supplierSku: z
    .string()
    .trim()
    .max(
      150,
      "Supplier SKU cannot exceed 150 characters.",
    )
    .optional(),

  costPrice: optionalPositiveNumber,

  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z]{3}$/,
      "Currency must use a three-letter code.",
    )
    .default("AED"),

  moq: z
  .union([
    z.literal(""),
    z.coerce.number().int().positive(
      "MOQ must be a positive whole number.",
    ),
  ])
  .transform((value) =>
    value === "" ? undefined : value,
  )
  .optional(),

  leadTime: z
    .string()
    .trim()
    .max(
      150,
      "Lead-time text cannot exceed 150 characters.",
    )
    .optional(),

  leadTimeDays: optionalPositiveInteger,

  packaging: z
    .string()
    .trim()
    .max(
      500,
      "Packaging cannot exceed 500 characters.",
    )
    .optional(),

  paymentTerms: z
    .string()
    .trim()
    .max(
      500,
      "Payment terms cannot exceed 500 characters.",
    )
    .optional(),

  incoterm: z
    .enum([
      "EXW",
      "FCA",
      "FOB",
      "CFR",
      "CIF",
      "CPT",
      "CIP",
      "DAP",
      "DPU",
      "DDP",
    ])
    .optional(),

  loadingPort: z
    .string()
    .trim()
    .max(
      150,
      "Loading port cannot exceed 150 characters.",
    )
    .optional(),

  priority: z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .default(0),

  lastPurchasePrice: optionalPositiveNumber,

  notes: z
    .string()
    .trim()
    .max(
      2000,
      "Internal notes cannot exceed 2000 characters.",
    )
    .optional(),

  isPreferred: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type ProductSupplierInput = z.infer<
  typeof productSupplierSchema
>;