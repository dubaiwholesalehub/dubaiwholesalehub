import { z } from "zod";

const optionalUuid = z
  .string()
  .uuid("Please select a valid option.")
  .optional();

const optionalNumber = z
  .union([z.literal(""), z.coerce.number()])
  .transform((value) => (value === "" ? undefined : value))
  .optional();

export const productFulfilmentMethodSchema =
  z.enum([
    "stock",
    "local_purchase",
    "import_on_demand",
    "dropship",
    "service",
  ]);

export type ProductFulfilmentMethod =
  z.infer<
    typeof productFulfilmentMethodSchema
  >;
export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name must contain at least 2 characters.")
    .max(200, "Product name cannot exceed 200 characters."),

  slug: z
    .string()
    .trim()
    .max(220, "Slug cannot exceed 220 characters.")
    .optional(),

  sku: z
    .string()
    .trim()
    .max(100, "SKU cannot exceed 100 characters.")
    .optional(),

  barcode: z
    .string()
    .trim()
    .max(100, "Barcode cannot exceed 100 characters.")
    .optional(),

  modelNumber: z
    .string()
    .trim()
    .max(120, "Model number cannot exceed 120 characters.")
    .optional(),

  categoryId: z
    .string()
    .uuid("Please select a category."),

  subcategoryId: optionalUuid,
  brandId: optionalUuid,
  countryId: optionalUuid,
  unitId: optionalUuid,

  shortDescription: z
    .string()
    .trim()
    .max(500, "Short description cannot exceed 500 characters.")
    .optional(),

  description: z
    .string()
    .trim()
    .max(10000, "Description cannot exceed 10,000 characters.")
    .optional(),

  moq: z.coerce.number().int().min(1).max(100000000).default(1),

  cartonQuantity: optionalNumber.refine(
    (value) => value === undefined || value > 0,
    "Carton quantity must be greater than zero.",
  ),

  leadTime: z
    .string()
    .trim()
    .max(120, "Lead time cannot exceed 120 characters.")
    .optional(),

  packaging: z
    .string()
    .trim()
    .max(500, "Packaging cannot exceed 500 characters.")
    .optional(),

  warranty: z
    .string()
    .trim()
    .max(250, "Warranty cannot exceed 250 characters.")
    .optional(),

  hsCode: z
    .string()
    .trim()
    .max(50, "HS code cannot exceed 50 characters.")
    .optional(),

  status: z.enum([
    "draft",
    "pending_review",
    "published",
    "archived",
  ]),

  featured: z.boolean().default(false),
  isNew: z.boolean().default(false),

  metaTitle: z
    .string()
    .trim()
    .max(70, "Meta title should not exceed 70 characters.")
    .optional(),

  metaDescription: z
    .string()
    .trim()
    .max(170, "Meta description should not exceed 170 characters.")
    .optional(),

  fulfilmentMethod:
    productFulfilmentMethodSchema.default(
      "stock",
    ),

  procurementLeadTimeDays: z.coerce
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

  allowBackorder: z.boolean().default(false),

  procurementNotes: z
    .string()
    .trim()
    .max(
      2000,
      "Procurement notes must be 2000 characters or fewer.",
    )
    .optional(),
});

export type ProductInput = z.infer<typeof productSchema>;