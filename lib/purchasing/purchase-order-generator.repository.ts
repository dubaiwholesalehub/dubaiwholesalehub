import type {
  Database,
} from "@/lib/database.types";

import { createClient } from "@/lib/supabase/server";

export type PurchaseOrderSource =
  Database["public"]["Enums"]["purchase_order_source"];

export type PurchaseOrderRow =
  Database["public"]["Tables"]["purchase_orders"]["Row"];

export interface PurchaseOrderGeneratorItem {
  productId: string;

  quantity: number;

  unitPrice: number;

  description?: string | null;

  supplierSku?: string | null;

  discountPercent?: number;

  taxPercent?: number;

  leadTime?: string | null;

  leadTimeDays?: number | null;

  packaging?: string | null;

  warranty?: string | null;

  notes?: string | null;
}

export interface CreateGeneratedPurchaseOrderInput {
  supplierId: string;

  source:
    Extract<
      PurchaseOrderSource,
      "manual" | "reorder"
    >;

  currencyCode?: string;

  expectedDeliveryDate?: string | null;

  paymentTerms?: string | null;

  incoterm?: string | null;

  loadingPort?: string | null;

  deliveryLocation?: string | null;

  deliveryTerms?: string | null;

  leadTime?: string | null;

  leadTimeDays?: number | null;

  packaging?: string | null;

  warranty?: string | null;

  supplierNotes?: string | null;

  internalNotes?: string | null;

  items:
    PurchaseOrderGeneratorItem[];
}

function requireText(
  value: string,
  fieldName: string,
): string {
  const cleaned =
    value.trim();

  if (!cleaned) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return cleaned;
}

function optionalText(
  value:
    | string
    | null
    | undefined,
): string | undefined {
  const cleaned =
    value?.trim();

  return cleaned
    ? cleaned
    : undefined;
}

function validateItems(
  items:
    PurchaseOrderGeneratorItem[],
): void {
  if (
    items.length === 0
  ) {
    throw new Error(
      "At least one Purchase Order item is required.",
    );
  }

  items.forEach(
    (
      item,
      index,
    ) => {
      const line =
        index + 1;

      if (
        !item.productId.trim()
      ) {
        throw new Error(
          `Product is required on line ${line}.`,
        );
      }

      if (
        !Number.isFinite(
          item.quantity,
        ) ||
        item.quantity <= 0
      ) {
        throw new Error(
          `Quantity must be greater than zero on line ${line}.`,
        );
      }

      if (
        !Number.isFinite(
          item.unitPrice,
        ) ||
        item.unitPrice < 0
      ) {
        throw new Error(
          `Unit price cannot be negative on line ${line}.`,
        );
      }

      const discount =
        item.discountPercent ??
        0;

      if (
        !Number.isFinite(
          discount,
        ) ||
        discount < 0 ||
        discount > 100
      ) {
        throw new Error(
          `Discount percentage must be between 0 and 100 on line ${line}.`,
        );
      }

      const tax =
        item.taxPercent ??
        0;

      if (
        !Number.isFinite(
          tax,
        ) ||
        tax < 0 ||
        tax > 100
      ) {
        throw new Error(
          `Tax percentage must be between 0 and 100 on line ${line}.`,
        );
      }

      if (
        item.leadTimeDays !==
          undefined &&
        item.leadTimeDays !==
          null &&
        (
          !Number.isFinite(
            item.leadTimeDays,
          ) ||
          item.leadTimeDays <
            0
        )
      ) {
        throw new Error(
          `Lead time days cannot be negative on line ${line}.`,
        );
      }
    },
  );
}

export async function createGeneratedPurchaseOrder(
  input:
    CreateGeneratedPurchaseOrderInput,
): Promise<PurchaseOrderRow> {
  const supplierId =
    requireText(
      input.supplierId,
      "Supplier ID",
    );

  validateItems(
    input.items,
  );

  const currencyCode =
    (
      input.currencyCode ??
      "AED"
    )
      .trim()
      .toUpperCase();

  if (
    currencyCode.length !==
    3
  ) {
    throw new Error(
      "Currency code must contain exactly 3 characters.",
    );
  }

  const supabase =
    await createClient();

  const rpcItems =
    input.items.map(
      (item) => ({
        productId:
          item.productId.trim(),

        quantity:
          item.quantity,

        unitPrice:
          item.unitPrice,

        discountPercent:
          item.discountPercent ??
          0,

        taxPercent:
          item.taxPercent ??
          0,

        ...(optionalText(
          item.description,
        )
          ? {
              description:
                optionalText(
                  item.description,
                ),
            }
          : {}),

        ...(optionalText(
          item.supplierSku,
        )
          ? {
              supplierSku:
                optionalText(
                  item.supplierSku,
                ),
            }
          : {}),

        ...(optionalText(
          item.leadTime,
        )
          ? {
              leadTime:
                optionalText(
                  item.leadTime,
                ),
            }
          : {}),

        ...(item.leadTimeDays !==
          undefined &&
        item.leadTimeDays !==
          null
          ? {
              leadTimeDays:
                item.leadTimeDays,
            }
          : {}),

        ...(optionalText(
          item.packaging,
        )
          ? {
              packaging:
                optionalText(
                  item.packaging,
                ),
            }
          : {}),

        ...(optionalText(
          item.warranty,
        )
          ? {
              warranty:
                optionalText(
                  item.warranty,
                ),
            }
          : {}),

        ...(optionalText(
          item.notes,
        )
          ? {
              notes:
                optionalText(
                  item.notes,
                ),
            }
          : {}),
      }),
    );

  const {
    data,
    error,
  } = await supabase.rpc(
    "create_purchase_order",
    {
      p_supplier_id:
        supplierId,

      p_source:
        input.source,

      p_currency_code:
        currencyCode,

      p_expected_delivery_date:
        input.expectedDeliveryDate ??
        undefined,

      p_payment_terms:
        optionalText(
          input.paymentTerms,
        ),

      p_incoterm:
        optionalText(
          input.incoterm,
        ),

      p_loading_port:
        optionalText(
          input.loadingPort,
        ),

      p_delivery_location:
        optionalText(
          input.deliveryLocation,
        ),

      p_delivery_terms:
        optionalText(
          input.deliveryTerms,
        ),

      p_lead_time:
        optionalText(
          input.leadTime,
        ),

      p_lead_time_days:
        input.leadTimeDays ??
        undefined,

      p_packaging:
        optionalText(
          input.packaging,
        ),

      p_warranty:
        optionalText(
          input.warranty,
        ),

      p_supplier_notes:
        optionalText(
          input.supplierNotes,
        ),

      p_internal_notes:
        optionalText(
          input.internalNotes,
        ),

      p_items:
        rpcItems,
    },
  );

  if (error) {
    throw new Error(
      `Unable to create Purchase Order: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The Purchase Order was not created.",
    );
  }

  return data;
}