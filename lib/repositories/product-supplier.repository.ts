import { createClient } from "@/lib/supabase/server";

import type {
  ProductSupplierInput,
} from "@/schemas/product-supplier.schema";

export async function getProductSupplierMappings(
  productId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_suppliers")
    .select(`
      id,
      product_id,
      supplier_id,
      supplier_sku,
      cost_price,
      currency_code,
      moq,
      lead_time,
      lead_time_days,
      packaging,
      payment_terms,
      incoterm,
      loading_port,
      priority,
      last_purchase_price,
      notes,
      last_price_update,
      is_preferred,
      is_active,
      created_at,
      updated_at,
      supplier:suppliers (
        id,
        company_name,
        contact_name,
        email,
        phone,
        whatsapp,
        city,
        is_active,
        country:countries (
          id,
          name,
          iso2
        )
      )
    `)
    .eq("product_id", productId)
    .order("is_preferred", {
      ascending: false,
    })
    .order("priority", {
      ascending: true,
    })
    .order("cost_price", {
      ascending: true,
      nullsFirst: false,
    });

  if (error) {
    throw new Error(
      `Unable to load product suppliers: ${error.message}`,
    );
  }

  return data ?? [];
}

export async function getProductSupplierOptions() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select(`
      id,
      company_name,
      contact_name,
      city,
      country:countries (
        id,
        name,
        iso2
      )
    `)
    .eq("is_active", true)
    .order("company_name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load supplier options: ${error.message}`,
    );
  }

  return data ?? [];
}

type ProductSupplierUpdateInput =
  ProductSupplierInput & {
    id: string;
  };

function emptyToNull(
  value: string | undefined,
): string | null {
  const cleaned = value?.trim();

  return cleaned ? cleaned : null;
}

function buildProductSupplierPayload(
  input: ProductSupplierInput,
) {
  return {
    product_id: input.productId,
    supplier_id: input.supplierId,
    supplier_sku: emptyToNull(input.supplierSku),
    cost_price: input.costPrice ?? null,
    currency_code: input.currencyCode,
    moq: input.moq ?? null,
    lead_time: emptyToNull(input.leadTime),
    lead_time_days: input.leadTimeDays ?? null,
    packaging: emptyToNull(input.packaging),
    payment_terms: emptyToNull(input.paymentTerms),
    incoterm: input.incoterm ?? null,
    loading_port: emptyToNull(input.loadingPort),
    priority: input.priority,
    last_purchase_price:
      input.lastPurchasePrice ?? null,
    notes: emptyToNull(input.notes),
    is_preferred: input.isPreferred,
    is_active: input.isActive,
  };
}

export async function findProductSupplierMapping(
  productId: string,
  supplierId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_suppliers")
    .select(`
      id,
      product_id,
      supplier_id,
      is_active,
      is_preferred
    `)
    .eq("product_id", productId)
    .eq("supplier_id", supplierId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to check supplier mapping: ${error.message}`,
    );
  }

  return data;
}

export async function createProductSupplier(
  input: ProductSupplierInput,
) {
  const existing = await findProductSupplierMapping(
    input.productId,
    input.supplierId,
  );

  if (existing) {
    if (existing.is_active) {
      throw new Error(
        "This supplier is already connected to the product.",
      );
    }

    throw new Error(
      "This supplier was previously archived. Restore the existing supplier record instead of adding it again.",
    );
  }

  const supabase = await createClient();

  /*
   * The preferred status is handled after insertion using
   * the database function. This prevents a unique-index
   * conflict when another supplier is currently preferred.
   */
  const payload = {
    ...buildProductSupplierPayload(input),
    is_preferred: false,
  };

  const { data, error } = await supabase
    .from("product_suppliers")
    .insert(payload)
    .select("id, product_id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "This supplier is already connected to the product.",
      );
    }

    throw new Error(
      `Unable to add supplier: ${error.message}`,
    );
  }

  if (input.isPreferred) {
    await setPreferredProductSupplier(
      data.product_id,
      data.id,
    );
  }

  return data;
}

export async function updateProductSupplier(
  input: ProductSupplierUpdateInput,
) {
  const supabase = await createClient();

  const duplicate = await findProductSupplierMapping(
    input.productId,
    input.supplierId,
  );

  if (duplicate && duplicate.id !== input.id) {
    throw new Error(
      "This supplier is already connected to the product.",
    );
  }

  /*
   * Preferred status is applied separately through the
   * atomic PostgreSQL function.
   */
  const payload = {
    ...buildProductSupplierPayload(input),
    is_preferred: false,
  };

  const { data, error } = await supabase
    .from("product_suppliers")
    .update(payload)
    .eq("id", input.id)
    .eq("product_id", input.productId)
    .select("id, product_id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "This supplier is already connected to the product.",
      );
    }

    throw new Error(
      `Unable to update supplier: ${error.message}`,
    );
  }

  if (input.isPreferred && input.isActive) {
    await setPreferredProductSupplier(
      data.product_id,
      data.id,
    );
  }

  return data;
}

export async function archiveProductSupplier(
  productId: string,
  mappingId: string,
) {
  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "archive_product_supplier",
    {
      p_product_id: productId,
      p_mapping_id: mappingId,
    },
  );

  if (error) {
    throw new Error(
      `Unable to archive supplier: ${error.message}`,
    );
  }
}

export async function restoreProductSupplier(
  productId: string,
  mappingId: string,
) {
  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "restore_product_supplier",
    {
      p_product_id: productId,
      p_mapping_id: mappingId,
    },
  );

  if (error) {
    throw new Error(
      `Unable to restore supplier: ${error.message}`,
    );
  }
}

export async function setPreferredProductSupplier(
  productId: string,
  mappingId: string,
) {
  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "set_product_preferred_supplier",
    {
      p_product_id: productId,
      p_mapping_id: mappingId,
    },
  );

  if (error) {
    throw new Error(
      `Unable to set preferred supplier: ${error.message}`,
    );
  }
}

export type ProductSupplierSummary = {
  totalSuppliers: number;
  activeSuppliers: number;
  archivedSuppliers: number;
  lowestCost: {
    amount: number;
    currencyCode: string;
    supplierName: string;
    mappingId: string;
  } | null;
  fastestSupplier: {
    leadTimeDays: number;
    supplierName: string;
    mappingId: string;
  } | null;
  preferredSupplier: {
    supplierName: string;
    mappingId: string;
  } | null;
  newestPriceUpdate: string | null;
  oldestPriceUpdate: string | null;
  stalePriceCount: number;
};

export async function getProductSupplierSummary(
  productId: string,
): Promise<ProductSupplierSummary> {
  const mappings =
    await getProductSupplierMappings(productId);

  const activeMappings = mappings.filter(
    (mapping) => mapping.is_active,
  );

  const archivedMappings = mappings.filter(
    (mapping) => !mapping.is_active,
  );

  const supplierName = (
    mapping: (typeof mappings)[number],
  ) =>
    mapping.supplier?.company_name ??
    "Unknown supplier";

  const pricedMappings = activeMappings.filter(
    (
      mapping,
    ): mapping is typeof mapping & {
      cost_price: number;
      currency_code: string;
    } =>
      mapping.cost_price !== null &&
      mapping.currency_code !== null,
  );

  /*
   * Costs in different currencies must not be averaged or
   * compared directly. For now, lowest cost is calculated
   * only within the product's most commonly used currency.
   *
   * Full cross-currency comparison will be added when the
   * exchange-rate module is implemented.
   */
  const currencyCounts = pricedMappings.reduce<
    Record<string, number>
  >((counts, mapping) => {
    const currency = mapping.currency_code;

    counts[currency] =
      (counts[currency] ?? 0) + 1;

    return counts;
  }, {});

  const comparisonCurrency =
    Object.entries(currencyCounts).sort(
      ([, firstCount], [, secondCount]) =>
        secondCount - firstCount,
    )[0]?.[0] ?? null;

  const comparablePrices = comparisonCurrency
    ? pricedMappings.filter(
        (mapping) =>
          mapping.currency_code ===
          comparisonCurrency,
      )
    : [];

  const lowestMapping = comparablePrices.reduce<
    (typeof comparablePrices)[number] | null
  >((lowest, mapping) => {
    if (!lowest) {
      return mapping;
    }

    return mapping.cost_price < lowest.cost_price
      ? mapping
      : lowest;
  }, null);

  const leadTimeMappings = activeMappings.filter(
    (
      mapping,
    ): mapping is typeof mapping & {
      lead_time_days: number;
    } => mapping.lead_time_days !== null,
  );

  const fastestMapping = leadTimeMappings.reduce<
    (typeof leadTimeMappings)[number] | null
  >((fastest, mapping) => {
    if (!fastest) {
      return mapping;
    }

    return mapping.lead_time_days <
      fastest.lead_time_days
      ? mapping
      : fastest;
  }, null);

  const preferredMapping =
    activeMappings.find(
      (mapping) => mapping.is_preferred,
    ) ?? null;

  const priceDates = activeMappings
    .map((mapping) => mapping.last_price_update)
    .filter(
      (date): date is string => Boolean(date),
    )
    .sort(
      (first, second) =>
        new Date(first).getTime() -
        new Date(second).getTime(),
    );

  const staleThreshold = new Date();

  staleThreshold.setDate(
    staleThreshold.getDate() - 90,
  );

  const stalePriceCount = activeMappings.filter(
    (mapping) => {
      if (!mapping.cost_price) {
        return false;
      }

      if (!mapping.last_price_update) {
        return true;
      }

      return (
        new Date(mapping.last_price_update) <
        staleThreshold
      );
    },
  ).length;

  return {
    totalSuppliers: mappings.length,
    activeSuppliers: activeMappings.length,
    archivedSuppliers: archivedMappings.length,

    lowestCost: lowestMapping
      ? {
          amount: lowestMapping.cost_price,
          currencyCode:
            lowestMapping.currency_code,
          supplierName:
            supplierName(lowestMapping),
          mappingId: lowestMapping.id,
        }
      : null,

    fastestSupplier: fastestMapping
      ? {
          leadTimeDays:
            fastestMapping.lead_time_days,
          supplierName:
            supplierName(fastestMapping),
          mappingId: fastestMapping.id,
        }
      : null,

    preferredSupplier: preferredMapping
      ? {
          supplierName:
            supplierName(preferredMapping),
          mappingId: preferredMapping.id,
        }
      : null,

    newestPriceUpdate:
      priceDates.at(-1) ?? null,

    oldestPriceUpdate:
      priceDates.at(0) ?? null,

    stalePriceCount,
  };
}

