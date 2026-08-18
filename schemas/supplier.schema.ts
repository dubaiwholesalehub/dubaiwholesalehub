import { z } from "zod";

const optionalEmailSchema = z
  .string()
  .trim()
  .max(255, "Email cannot exceed 255 characters.")
  .optional()
  .refine(
    (value) => !value || z.string().email().safeParse(value).success,
    "Please enter a valid email address.",
  );

const optionalUrlSchema = z
  .string()
  .trim()
  .max(500, "Website cannot exceed 500 characters.")
  .optional()
  .refine(
    (value) => !value || /^https?:\/\/.+/i.test(value),
    "Website must begin with http:// or https://",
  );

export const supplierSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company name must contain at least 2 characters.")
    .max(180, "Company name cannot exceed 180 characters."),

  contactName: z
    .string()
    .trim()
    .max(150, "Contact name cannot exceed 150 characters.")
    .optional(),

  email: optionalEmailSchema,

  phone: z
    .string()
    .trim()
    .max(50, "Phone number cannot exceed 50 characters.")
    .optional(),

  whatsapp: z
    .string()
    .trim()
    .max(50, "WhatsApp number cannot exceed 50 characters.")
    .optional(),

  website: optionalUrlSchema,

  address: z
    .string()
    .trim()
    .max(500, "Address cannot exceed 500 characters.")
    .optional(),

  city: z
    .string()
    .trim()
    .max(120, "City cannot exceed 120 characters.")
    .optional(),

  countryId: z
    .string()
    .uuid("Please select a valid country.")
    .optional(),

  paymentTermsDays: z.coerce
    .number()
    .int("Payment terms must be a whole number of days.")
    .min(0, "Payment terms cannot be negative.")
    .max(3650, "Payment terms cannot exceed 3650 days."),
    
  notes: z
    .string()
    .trim()
    .max(2000, "Notes cannot exceed 2000 characters.")
    .optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;