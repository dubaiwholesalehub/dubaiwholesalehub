import { createClient } from "@/lib/supabase/server";

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