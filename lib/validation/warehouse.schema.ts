import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()
  .optional();

export const warehouseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Warehouse code is required.")
    .max(50, "Warehouse code must be 50 characters or fewer."),

  name: z
    .string()
    .trim()
    .min(1, "Warehouse name is required.")
    .max(150, "Warehouse name must be 150 characters or fewer."),

  address_line_1: optionalText,
  address_line_2: optionalText,
  city: optionalText,
  state: optionalText,
  country: optionalText,
  postal_code: optionalText,
  contact_person: optionalText,
  phone: optionalText,

  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .or(z.literal(""))
    .transform((value) => value || null)
    .nullable()
    .optional(),

  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
});

export const createWarehouseSchema = warehouseSchema;

export const updateWarehouseSchema =
  warehouseSchema.partial();

export type WarehouseFormValues =
  z.input<typeof warehouseSchema>;

export type WarehouseValidatedValues =
  z.output<typeof warehouseSchema>;