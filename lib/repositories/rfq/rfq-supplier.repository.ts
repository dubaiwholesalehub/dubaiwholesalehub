import { createClient } from "@/lib/supabase/server";

import type {
  Database,
} from "@/lib/database.types";

type RfqSupplierStatus =
  Database["public"]["Enums"]["rfq_supplier_status"];

type RfqSupplierUpdate =
  Database["public"]["Tables"]["rfq_suppliers"]["Update"];

export type InviteSupplierInput = {
  rfqId: string;
  supplierId: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  supplierReference?: string;
  invitationMessage?: string;
  notes?: string;
};

export type UpdateRfqSupplierInput = {
  id: string;
  status?: RfqSupplierStatus;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  supplierReference?: string;
  invitationMessage?: string;
  notes?: string;
};

function emptyToNull(
  value: string | undefined,
): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

export async function getRfqSuppliers(
  rfqId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfq_suppliers")
    .select(`
      id,
      rfq_id,
      supplier_id,
      status,
      contact_name,
      contact_email,
      contact_phone,
      contact_whatsapp,
      supplier_reference,
      invitation_message,
      sent_at,
      viewed_at,
      responded_at,
      declined_at,
      decline_reason,
      awarded_at,
      notes,
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
        is_active
      )
    `)
    .eq("rfq_id", rfqId)
    .order("created_at");

  if (error) {
    throw new Error(
      `Unable to load RFQ suppliers: ${error.message}`,
    );
  }

  return data ?? [];
}

export async function getRfqSupplierById(
  id: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfq_suppliers")
    .select(`
      id,
      rfq_id,
      supplier_id,
      status,
      contact_name,
      contact_email,
      contact_phone,
      contact_whatsapp,
      supplier_reference,
      invitation_message,
      sent_at,
      viewed_at,
      responded_at,
      declined_at,
      decline_reason,
      awarded_at,
      notes,
      created_at,
      updated_at,
      supplier:suppliers (
        id,
        company_name,
        contact_name,
        email,
        phone,
        whatsapp,
        website,
        city,
        address,
        is_active,
        country:countries (
          id,
          name,
          iso2
        )
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load RFQ supplier: ${error.message}`,
    );
  }

  return data;
}

export async function inviteSupplierToRfq(
  input: InviteSupplierInput,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfq_suppliers")
    .insert({
      rfq_id: input.rfqId,
      supplier_id: input.supplierId,
      status: "invited",
      contact_name:
        emptyToNull(input.contactName),
      contact_email:
        emptyToNull(input.contactEmail),
      contact_phone:
        emptyToNull(input.contactPhone),
      contact_whatsapp:
        emptyToNull(input.contactWhatsapp),
      supplier_reference:
        emptyToNull(
          input.supplierReference,
        ),
      invitation_message:
        emptyToNull(
          input.invitationMessage,
        ),
      notes:
        emptyToNull(input.notes),
    })
    .select(`
      id,
      rfq_id,
      supplier_id,
      status,
      contact_name,
      contact_email,
      contact_phone,
      contact_whatsapp,
      supplier_reference,
      invitation_message,
      sent_at,
      viewed_at,
      responded_at,
      declined_at,
      decline_reason,
      awarded_at,
      notes,
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
        is_active
      )
    `)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "This supplier has already been invited to the RFQ.",
      );
    }

    if (error.code === "23503") {
      throw new Error(
        "The selected RFQ or supplier does not exist.",
      );
    }

    throw new Error(
      `Unable to invite supplier: ${error.message}`,
    );
  }

  return data;
}

export async function bulkInviteSuppliersToRfq(
  rfqId: string,
  suppliers: Omit<
    InviteSupplierInput,
    "rfqId"
  >[],
) {
  if (suppliers.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const payload = suppliers.map(
    (supplier) => ({
      rfq_id: rfqId,
      supplier_id: supplier.supplierId,
      status: "invited" as RfqSupplierStatus,
      contact_name: emptyToNull(
        supplier.contactName,
      ),
      contact_email: emptyToNull(
        supplier.contactEmail,
      ),
      contact_phone: emptyToNull(
        supplier.contactPhone,
      ),
      contact_whatsapp: emptyToNull(
        supplier.contactWhatsapp,
      ),
      supplier_reference:
        emptyToNull(
          supplier.supplierReference,
        ),
      invitation_message:
        emptyToNull(
          supplier.invitationMessage,
        ),
      notes: emptyToNull(
        supplier.notes,
      ),
    }),
  );

  const { data, error } = await supabase
    .from("rfq_suppliers")
    .insert(payload)
    .select(`
      id,
      rfq_id,
      supplier_id,
      status,
      created_at
    `);

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "One or more suppliers have already been invited to this RFQ.",
      );
    }

    throw new Error(
      `Unable to invite suppliers: ${error.message}`,
    );
  }

  return data ?? [];
}

export async function updateRfqSupplier(
  input: UpdateRfqSupplierInput,
) {
  const supabase = await createClient();

  const payload = {
    ...(input.status
      ? { status: input.status }
      : {}),
    contact_name:
      emptyToNull(input.contactName),
    contact_email:
      emptyToNull(input.contactEmail),
    contact_phone:
      emptyToNull(input.contactPhone),
    contact_whatsapp:
      emptyToNull(input.contactWhatsapp),
    supplier_reference:
      emptyToNull(
        input.supplierReference,
      ),
    invitation_message:
      emptyToNull(
        input.invitationMessage,
      ),
    notes:
      emptyToNull(input.notes),
  };

  const { data, error } = await supabase
    .from("rfq_suppliers")
    .update(payload)
    .eq("id", input.id)
    .select(`
      id,
      rfq_id,
      supplier_id,
      status,
      contact_name,
      contact_email,
      contact_phone,
      contact_whatsapp,
      supplier_reference,
      invitation_message,
      sent_at,
      viewed_at,
      responded_at,
      declined_at,
      decline_reason,
      awarded_at,
      notes,
      created_at,
      updated_at
    `)
    .maybeSingle();

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "The related RFQ or supplier no longer exists.",
      );
    }

    throw new Error(
      `Unable to update RFQ supplier: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "RFQ supplier invitation was not found.",
    );
  }

  return data;
}

export async function removeSupplierFromRfq(
  rfqSupplierId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfq_suppliers")
    .delete()
    .eq("id", rfqSupplierId)
    .select(`
      id,
      rfq_id,
      supplier_id
    `)
    .maybeSingle();

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "This supplier cannot be removed because quotation records already reference the invitation.",
      );
    }

    throw new Error(
      `Unable to remove supplier from RFQ: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "RFQ supplier invitation was not found.",
    );
  }

  return data;
}

async function updateSupplierStatus(
  id: string,
  status: RfqSupplierStatus,
  timestampField:
    | "sent_at"
    | "viewed_at"
    | "responded_at"
    | "declined_at",
) {
  const supabase = await createClient();

  const timestamp =
    new Date().toISOString();

  const payload: RfqSupplierUpdate = {
    status,
  };

  if (timestampField === "sent_at") {
    payload.sent_at = timestamp;
  }

  if (timestampField === "viewed_at") {
    payload.viewed_at = timestamp;
  }

  if (
    timestampField === "responded_at"
  ) {
    payload.responded_at = timestamp;
  }

  if (
    timestampField === "declined_at"
  ) {
    payload.declined_at = timestamp;
  }

  const { data, error } = await supabase
    .from("rfq_suppliers")
    .update(payload)
    .eq("id", id)
    .select(`
      id,
      rfq_id,
      supplier_id,
      status,
      sent_at,
      viewed_at,
      responded_at,
      declined_at,
      updated_at
    `)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to update supplier status: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "RFQ supplier invitation was not found.",
    );
  }

  return data;
}

export async function markSupplierInvitationSent(
  id: string,
) {
  return updateSupplierStatus(
    id,
    "sent",
    "sent_at",
  );
}

export async function markSupplierViewed(
  id: string,
) {
  return updateSupplierStatus(
    id,
    "viewed",
    "viewed_at",
  );
}

export async function markSupplierResponded(
  id: string,
) {
  return updateSupplierStatus(
    id,
    "quoted",
    "responded_at",
  );
}

export async function markSupplierDeclined(
  id: string,
) {
  return updateSupplierStatus(
    id,
    "declined",
    "declined_at",
  );
}

export type RfqSupplierList = Awaited<
  ReturnType<typeof getRfqSuppliers>
>;

export type RfqSupplierSummary =
  RfqSupplierList[number];

export type RfqSupplierDetails =
  NonNullable<
    Awaited<
      ReturnType<
        typeof getRfqSupplierById
      >
    >
  >;

export type InvitedRfqSupplier =
  Awaited<
    ReturnType<
      typeof inviteSupplierToRfq
    >
  >;

export type BulkInvitedRfqSuppliers =
  Awaited<
    ReturnType<
      typeof bulkInviteSuppliersToRfq
    >
  >;

export type UpdatedRfqSupplier =
  Awaited<
    ReturnType<
      typeof updateRfqSupplier
    >
  >;

export type RemovedRfqSupplier =
  Awaited<
    ReturnType<
      typeof removeSupplierFromRfq
    >
  >;

export async function getRfqSupplierOptions() {
  const supabase = await createClient();

  const [suppliersResult, countriesResult] =
    await Promise.all([
      supabase
        .from("suppliers")
        .select(`
          id,
          company_name,
          contact_name,
          email,
          phone,
          whatsapp,
          website,
          city,
          notes,
          country_id,
          is_active,
          country:countries (
            id,
            name,
            iso2
          )
        `)
        .eq("is_active", true)
        .order("company_name", {
          ascending: true,
        }),

      supabase
        .from("countries")
        .select(`
          id,
          name,
          iso2
        `)
        .eq("is_active", true)
        .order("name", {
          ascending: true,
        }),
    ]);

  const error =
    suppliersResult.error ??
    countriesResult.error;

  if (error) {
    throw new Error(
      `Unable to load RFQ supplier options: ${error.message}`,
    );
  }

  return {
    suppliers: suppliersResult.data ?? [],
    countries: countriesResult.data ?? [],
  };
}