import { z } from "zod";

export const subcategorySchema =
  z.object({
    categoryId: z
      .string()
      .uuid(
        "Please select a valid parent category.",
      ),

    name: z
      .string()
      .trim()
      .min(
        2,
        "Subcategory name must contain at least 2 characters.",
      )
      .max(
        100,
        "Subcategory name cannot exceed 100 characters.",
      ),

    slug: z
      .string()
      .trim()
      .max(
        120,
        "Slug cannot exceed 120 characters.",
      )
      .optional(),

    description: z
      .string()
      .trim()
      .max(
        1000,
        "Description cannot exceed 1000 characters.",
      )
      .optional(),

    imageUrl: z
      .string()
      .trim()
      .url(
        "Image URL must be a valid URL.",
      )
      .max(
        500,
        "Image URL cannot exceed 500 characters.",
      )
      .optional()
      .or(z.literal("")),

    seoTitle: z
      .string()
      .trim()
      .max(
        70,
        "SEO title cannot exceed 70 characters.",
      )
      .optional(),

    seoDescription: z
      .string()
      .trim()
      .max(
        170,
        "SEO description cannot exceed 170 characters.",
      )
      .optional(),

    sortOrder: z.coerce
      .number()
      .int(
        "Sort order must be a whole number.",
      )
      .min(
        0,
        "Sort order cannot be negative.",
      )
      .max(
        10000,
        "Sort order cannot exceed 10000.",
      ),
  });

export type SubcategoryValidatedValues =
  z.infer<
    typeof subcategorySchema
  >;