import { z } from "zod";

export const supplierQuotationItemSchema = z.object({
  rfqItemId: z.string().uuid(),

  quotedQuantity: z
    .number()
    .positive("Quoted quantity must be greater than zero."),

  unitPrice: z
    .number()
    .min(0, "Unit price cannot be negative."),

  moq: z
    .number()
    .min(0)
    .optional(),

  leadTimeDays: z
    .number()
    .min(0)
    .optional(),

  isCompliant: z.boolean(),
});

export const supplierQuotationSchema = z.object({
  rfqId: z.string().uuid(),

  rfqSupplierId: z
    .string()
    .uuid("Please select a supplier."),

  quotationNumber: z
    .string()
    .max(100)
    .optional(),

  quotationDate: z.string(),

  validUntil: z
    .string()
    .optional(),

  currencyCode: z
    .string()
    .length(3),

  paymentTerms: z
    .string()
    .optional(),

  leadTimeDays: z
    .number()
    .min(0),

  incoterm: z
    .string()
    .optional(),

  loadingPort: z
    .string()
    .optional(),

  deliveryLocation: z
    .string()
    .optional(),

  packaging: z
    .string()
    .optional(),

  warranty: z
    .string()
    .optional(),

  supplierNotes: z
    .string()
    .optional(),

  internalNotes: z
    .string()
    .optional(),

  discountAmount: z
    .number()
    .min(0),

  shippingAmount: z
    .number()
    .min(0),

  otherCharges: z
    .number()
    .min(0),

  taxAmount: z
    .number()
    .min(0),

  items: z
    .array(supplierQuotationItemSchema)
    .min(1, "At least one quotation item is required."),
});

export type SupplierQuotationInput =
  z.infer<typeof supplierQuotationSchema>;