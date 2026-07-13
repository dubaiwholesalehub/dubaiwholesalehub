import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must contain at least 2 characters.")
    .max(100, "Category name cannot exceed 100 characters."),

  slug: z
    .string()
    .trim()
    .max(120, "Slug cannot exceed 120 characters.")
    .optional(),

  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters.")
    .optional(),

  sortOrder: z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .default(0),

  isFeatured: z.boolean().default(false),
});

export type CategoryInput = z.infer<typeof categorySchema>;