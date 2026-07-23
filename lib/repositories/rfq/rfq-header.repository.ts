import { createClient } from "@/lib/supabase/server";

function requireRfqId(rfqId: string): string {
  const id = rfqId.trim();

  if (!id) {
    throw new Error("RFQ ID is required.");
  }

  return id;
}

export async function getRfqHeaderById(
  rfqId: string,
) {
  const id = requireRfqId(rfqId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfqs")
    .select(`
      id,
      rfq_number,
      title,
      description,
      status,
      priority,
      currency_code,
      response_deadline,
      required_delivery_date,
      delivery_location,
      incoterm,
      payment_terms,
      packaging_requirements,
      internal_notes,
      supplier_notes,
      awarded_supplier_id,
      awarded_quotation_id,
      sent_at,
      awarded_at,
      closed_at,
      cancelled_at,
      created_by,
      updated_by,
      created_at,
      updated_at,
      awarded_supplier:suppliers!rfqs_awarded_supplier_id_fkey (
        id,
        company_name,
        contact_name,
        email,
        phone,
        whatsapp,
        website,
        address,
        city,
        country:countries (
          id,
          name,
          iso2,
          iso3,
          currency_code
        )
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load RFQ header: ${error.message}`,
    );
  }

  return data;
}

export type RfqHeader = NonNullable<
  Awaited<
    ReturnType<typeof getRfqHeaderById>
  >
>;