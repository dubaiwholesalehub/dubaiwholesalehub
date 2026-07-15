import { z } from "zod";

export const brandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Brand name must contain at least 2 characters.")
    .max(120, "Brand name cannot exceed 120 characters."),

  slug: z
    .string()
    .trim()
    .max(140, "Slug cannot exceed 140 characters.")
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters.")
    .optional(),

  website: z
    .string()
    .trim()
    .max(255, "Website URL cannot exceed 255 characters.")
    .optional()
    .refine(
      (value) => !value || /^https?:\/\/.+/i.test(value),
      "Website must begin with http:// or https://",
    ),

  logoUrl: z
    .string()
    .trim()
    .max(500, "Logo URL cannot exceed 500 characters.")
    .optional()
    .refine(
      (value) => !value || /^https?:\/\/.+/i.test(value),
      "Logo URL must begin with http:// or https://",
    ),

  countryId: z
    .string()
    .uuid("Please select a valid country.")
    .optional(),

  isFeatured: z.boolean().default(false),
});

export type BrandInput = z.infer<typeof brandSchema>;