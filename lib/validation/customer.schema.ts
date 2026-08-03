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

const optionalEmail = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .or(z.literal(""))
  .transform((value) => value || null)
  .nullable()
  .optional();

const customerTypeSchema = z.enum([
  "individual",
  "business",
]);

const customerStatusSchema = z.enum([
  "active",
  "inactive",
  "blocked",
]);

const customerSourceSchema = z.enum([
  "internal",
  "hmshoponline",
  "dubaiwholesalehub",
  "import",
]);

const customerAddressTypeSchema = z.enum([
  "billing",
  "shipping",
  "both",
]);

/* =========================================================
 * Customer Schema
 * ========================================================= */

/* =========================================================
 * Customer Schema
 * ========================================================= */

const customerBaseSchema = z.object({
  customer_type:
    customerTypeSchema.default("business"),

  display_name: z
    .string()
    .trim()
    .min(
      1,
      "Customer display name is required.",
    )
    .max(
      200,
      "Customer display name must be 200 characters or fewer.",
    ),

  company_name: optionalText,

  first_name: optionalText,
  last_name: optionalText,

  email: optionalEmail,

  phone: optionalText,
  whatsapp: optionalText,

  tax_registration_number: optionalText,

  currency_code: z
    .string()
    .trim()
    .min(
      3,
      "Currency code is required.",
    )
    .max(
      3,
      "Currency code must contain exactly 3 characters.",
    )
    .transform((value) =>
      value.toUpperCase(),
    )
    .default("AED"),

  credit_limit: z.coerce
    .number({
      message:
        "Credit limit must be a valid number.",
    })
    .min(
      0,
      "Credit limit cannot be negative.",
    )
    .max(
      9999999999999999,
      "Credit limit is too large.",
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

  status:
    customerStatusSchema.default("active"),

  source:
    customerSourceSchema.default("internal"),

  external_customer_id: optionalText,

  internal_notes: optionalText,
});

function applyCustomerBusinessRules(
  values: z.infer<typeof customerBaseSchema>,
  context: z.RefinementCtx,
): void {
  if (
    values.customer_type === "business" &&
    !values.company_name
  ) {
    context.addIssue({
      code: "custom",
      path: ["company_name"],
      message:
        "Company name is required for business customers.",
    });
  }

  if (
    values.customer_type === "individual" &&
    !values.first_name &&
    !values.last_name
  ) {
    context.addIssue({
      code: "custom",
      path: ["first_name"],
      message:
        "Enter at least a first name or last name for an individual customer.",
    });
  }
}

export const customerSchema =
  customerBaseSchema.superRefine(
    applyCustomerBusinessRules,
  );

export const createCustomerSchema =
  customerSchema;

export const updateCustomerSchema =
  customerBaseSchema.partial();
  
/* =========================================================
 * Customer Contact Schema
 * ========================================================= */

export const customerContactSchema = z.object({
  contact_name: z
    .string()
    .trim()
    .min(
      1,
      "Contact name is required.",
    )
    .max(
      200,
      "Contact name must be 200 characters or fewer.",
    ),

  job_title: optionalText,

  email: optionalEmail,

  phone: optionalText,
  whatsapp: optionalText,

  is_primary: z.boolean().default(false),
  is_active: z.boolean().default(true),

  notes: optionalText,
});

export const createCustomerContactSchema =
  customerContactSchema;

export const updateCustomerContactSchema =
  customerContactSchema.partial();

/* =========================================================
 * Customer Address Schema
 * ========================================================= */

export const customerAddressSchema = z.object({
  address_type:
    customerAddressTypeSchema.default("shipping"),

  address_name: optionalText,

  contact_name: optionalText,
  phone: optionalText,

  address_line_1: z
    .string()
    .trim()
    .min(
      1,
      "Address line 1 is required.",
    )
    .max(
      300,
      "Address line 1 must be 300 characters or fewer.",
    ),

  address_line_2: optionalText,

  city: optionalText,
  state: optionalText,
  country: optionalText,
  postal_code: optionalText,

  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),

  delivery_instructions: optionalText,
});

export const createCustomerAddressSchema =
  customerAddressSchema;

export const updateCustomerAddressSchema =
  customerAddressSchema.partial();

/* =========================================================
 * Exported Types
 * ========================================================= */

export type CustomerFormValues =
  z.input<typeof customerSchema>;

export type CustomerValidatedValues =
  z.output<typeof customerSchema>;

export type CustomerContactFormValues =
  z.input<typeof customerContactSchema>;

export type CustomerContactValidatedValues =
  z.output<typeof customerContactSchema>;

export type CustomerAddressFormValues =
  z.input<typeof customerAddressSchema>;

export type CustomerAddressValidatedValues =
  z.output<typeof customerAddressSchema>;

export type CustomerType =
  z.infer<typeof customerTypeSchema>;

export type CustomerStatus =
  z.infer<typeof customerStatusSchema>;

export type CustomerSource =
  z.infer<typeof customerSourceSchema>;

export type CustomerAddressType =
  z.infer<
    typeof customerAddressTypeSchema
  >;