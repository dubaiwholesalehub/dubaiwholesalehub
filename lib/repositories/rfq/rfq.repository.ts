import { createClient } from "@/lib/supabase/server";

import type {
  Database,
} from "@/lib/database.types";

type RfqStatus =
  Database["public"]["Enums"]["rfq_status"];

type RfqPriority =
  Database["public"]["Enums"]["rfq_priority"];

export type RfqSortField =
  | "created_at"
  | "updated_at"
  | "rfq_number"
  | "title"
  | "status"
  | "priority"
  | "response_deadline"
  | "required_delivery_date";

export type RfqSortDirection =
  | "asc"
  | "desc";

export type RfqListFilters = {
  search?: string;
  status?: RfqStatus | "all";
  priority?: RfqPriority | "all";
  createdBy?: string;
  awardedSupplierId?: string;
  responseDeadlineFrom?: string;
  responseDeadlineTo?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: RfqSortField;
  sortDirection?: RfqSortDirection;
  page?: number;
  pageSize?: number;
};

export type CreateRfqInput = {
  title: string;
  description?: string;
  priority: RfqPriority;
  currencyCode: string;
  requiredDeliveryDate?: string;
  responseDeadline?: string;
  deliveryLocation?: string;
  incoterm?: string;
  paymentTerms?: string;
  packagingRequirements?: string;
  internalNotes?: string;
  supplierNotes?: string;
};

export type UpdateRfqInput =
  CreateRfqInput & {
    id: string;
    status?: RfqStatus;
  };

export type RfqDashboardSummary = {
  total: number;
  draft: number;
  ready: number;
  sent: number;
  partiallyQuoted: number;
  quoted: number;
  underReview: number;
  awarded: number;
  closed: number;
  cancelled: number;
  overdueResponses: number;
  urgent: number;
};

function emptyToNull(
  value: string | undefined,
): string | null {
  const cleaned = value?.trim();

  return cleaned ? cleaned : null;
}

function normalizeCurrencyCode(
  value: string,
): string {
  return value.trim().toUpperCase();
}

function normalizePagination(
  page: number | undefined,
  pageSize: number | undefined,
) {
  const safePage = Math.max(
    1,
    Math.floor(page ?? 1),
  );

  const safePageSize = Math.min(
    100,
    Math.max(
      1,
      Math.floor(pageSize ?? 20),
    ),
  );

  const from =
    (safePage - 1) * safePageSize;

  const to =
    from + safePageSize - 1;

  return {
    page: safePage,
    pageSize: safePageSize,
    from,
    to,
  };
}

function buildRfqPayload(
  input: CreateRfqInput,
) {
  return {
    title: input.title.trim(),
    description:
      emptyToNull(input.description),
    priority: input.priority,
    currency_code:
      normalizeCurrencyCode(
        input.currencyCode,
      ),
    required_delivery_date:
      emptyToNull(
        input.requiredDeliveryDate,
      ),
    response_deadline:
      emptyToNull(
        input.responseDeadline,
      ),
    delivery_location:
      emptyToNull(
        input.deliveryLocation,
      ),
    incoterm:
      emptyToNull(input.incoterm),
    payment_terms:
      emptyToNull(input.paymentTerms),
    packaging_requirements:
      emptyToNull(
        input.packagingRequirements,
      ),
    internal_notes:
      emptyToNull(input.internalNotes),
    supplier_notes:
      emptyToNull(input.supplierNotes),
  };
}

function requireId(
  value: string,
  fieldName: string,
): string {
  const id = value.trim();

  if (!id) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return id;
}

export async function getRfqs(
  filters: RfqListFilters = {},
) {
  const supabase = await createClient();

  const {
    page,
    pageSize,
    from,
    to,
  } = normalizePagination(
    filters.page,
    filters.pageSize,
  );

  const sortBy =
    filters.sortBy ?? "created_at";

  const sortDirection =
    filters.sortDirection ?? "desc";

  let query = supabase
    .from("rfqs")
    .select(
      `
        id,
        rfq_number,
        title,
        description,
        status,
        priority,
        currency_code,
        required_delivery_date,
        response_deadline,
        delivery_location,
        incoterm,
        payment_terms,
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
          city
        ),
        rfq_items (
          id
        ),
        rfq_suppliers (
          id,
          status
        ),
        supplier_quotations:supplier_quotations!supplier_quotations_rfq_id_fkey(
          id,
          quotation_number,
          status,
          total_amount,
          supplier_id
        )
      `,
      {
        count: "exact",
      },
    );

  const search =
    filters.search?.trim();

  if (search) {
    const safeSearch = search
      .replaceAll(",", " ")
      .replaceAll("%", "");

    query = query.or(
      [
        `rfq_number.ilike.%${safeSearch}%`,
        `title.ilike.%${safeSearch}%`,
        `description.ilike.%${safeSearch}%`,
        `delivery_location.ilike.%${safeSearch}%`,
      ].join(","),
    );
  }

  if (
    filters.status &&
    filters.status !== "all"
  ) {
    query = query.eq(
      "status",
      filters.status,
    );
  }

  if (
    filters.priority &&
    filters.priority !== "all"
  ) {
    query = query.eq(
      "priority",
      filters.priority,
    );
  }

  if (filters.createdBy) {
    query = query.eq(
      "created_by",
      filters.createdBy,
    );
  }

  if (filters.awardedSupplierId) {
    query = query.eq(
      "awarded_supplier_id",
      filters.awardedSupplierId,
    );
  }

  if (filters.responseDeadlineFrom) {
    query = query.gte(
      "response_deadline",
      filters.responseDeadlineFrom,
    );
  }

  if (filters.responseDeadlineTo) {
    query = query.lte(
      "response_deadline",
      filters.responseDeadlineTo,
    );
  }

  if (filters.createdFrom) {
    query = query.gte(
      "created_at",
      filters.createdFrom,
    );
  }

  if (filters.createdTo) {
    query = query.lte(
      "created_at",
      filters.createdTo,
    );
  }

  const {
    data,
    error,
    count,
  } = await query
    .order(sortBy, {
      ascending:
        sortDirection === "asc",
      nullsFirst: false,
    })
    .range(from, to);

  if (error) {
    throw new Error(
      `Unable to load RFQs: ${error.message}`,
    );
  }

  const total = count ?? 0;

  return {
    data: data ?? [],
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(
        total / pageSize,
      ),
    },
  };
}

export async function getRfqById(
  rfqId: string,
) {
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
      required_delivery_date,
      response_deadline,
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
      ),
      items:rfq_items (
        id,
        rfq_id,
        product_id,
        line_number,
        item_name,
        item_description,
        product_sku,
        requested_quantity,
        unit_id,
        target_unit_price,
        target_currency_code,
        target_delivery_date,
        specifications,
        packaging_requirements,
        notes,
        created_at,
        updated_at,
        product:products (
          id,
          sku,
          slug,
          status
        ),
        unit:units (
          id,
          name,
          short_name
        )
      ),
      invited_suppliers:rfq_suppliers (
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
          is_active,
          country:countries (
            id,
            name,
            iso2
          )
        )
      ),
      quotations:supplier_quotations!supplier_quotations_rfq_id_fkey(
        id,
        rfq_id,
        rfq_supplier_id,
        supplier_id,
        quotation_number,
        revision_number,
        status,
        currency_code,
        quotation_date,
        valid_until,
        subtotal,
        discount_amount,
        shipping_amount,
        tax_amount,
        other_charges,
        total_amount,
        payment_terms,
        incoterm,
        loading_port,
        delivery_location,
        lead_time,
        lead_time_days,
        packaging,
        warranty,
        supplier_notes,
        internal_notes,
        submitted_at,
        reviewed_at,
        accepted_at,
        rejected_at,
        created_by,
        updated_by,
        created_at,
        updated_at,
        supplier:suppliers (
          id,
          company_name,
          contact_name,
          email,
          phone,
          whatsapp,
          city
        ),
        items:supplier_quotation_items (
          id,
          quotation_id,
          rfq_item_id,
          supplier_sku,
          quoted_quantity,
          moq,
          unit_price,
          discount_percent,
          discount_amount,
          line_subtotal,
          tax_percent,
          tax_amount,
          line_total,
          available_quantity,
          lead_time,
          lead_time_days,
          packaging,
          country_of_origin_id,
          warranty,
          item_notes,
          is_compliant,
          compliance_notes,
          created_at,
          updated_at,
          country_of_origin:countries (
            id,
            name,
            iso2
          )
        )
      ),
      status_history:rfq_status_history (
        id,
        previous_status,
        new_status,
        reason,
        notes,
        changed_by,
        changed_at
      )
    `)
    .eq("id", rfqId)
    .order("line_number", {
      referencedTable: "rfq_items",
      ascending: true,
    })
    .order("created_at", {
      referencedTable: "supplier_quotations",
      ascending: false,
    })
    .order("changed_at", {
      referencedTable:
        "rfq_status_history",
      ascending: false,
    })
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load RFQ: ${error.message}`,
    );
  }

  return data;
}

export async function getRfqByNumber(
  rfqNumber: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfqs")
    .select(`
      id,
      rfq_number,
      title,
      status,
      priority,
      currency_code,
      response_deadline,
      created_at
    `)
    .eq(
      "rfq_number",
      rfqNumber.trim().toUpperCase(),
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to find RFQ: ${error.message}`,
    );
  }

  return data;
}

export async function createRfq(
  input: CreateRfqInput,
) {
  const title = input.title.trim();

  if (!title) {
    throw new Error(
      "RFQ title is required.",
    );
  }

  const currencyCode =
    normalizeCurrencyCode(
      input.currencyCode,
    );

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error(
      "Currency code must contain exactly three letters.",
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfqs")
    .insert({
      ...buildRfqPayload(input),
      title,
      currency_code: currencyCode,
    })
    .select(`
      id,
      rfq_number,
      title,
      status,
      priority,
      currency_code,
      created_at
    `)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "An RFQ with this number already exists.",
      );
    }

    if (error.code === "23514") {
      throw new Error(
        "The RFQ contains invalid dates or currency information.",
      );
    }

    throw new Error(
      `Unable to create RFQ: ${error.message}`,
    );
  }

  return data;
}

export async function updateRfq(
  input: UpdateRfqInput,
) {
  const rfqId = requireId(
    input.id,
    "RFQ ID",
  );

  const title = input.title.trim();

  if (!title) {
    throw new Error(
      "RFQ title is required.",
    );
  }

  const currencyCode =
    normalizeCurrencyCode(
      input.currencyCode,
    );

  if (
    !/^[A-Z]{3}$/.test(currencyCode)
  ) {
    throw new Error(
      "Currency code must contain exactly three letters.",
    );
  }

  const supabase = await createClient();

  const payload = {
    ...buildRfqPayload(input),
    title,
    currency_code: currencyCode,
    ...(input.status
      ? {
        status: input.status,
      }
      : {}),
  };

  const { data, error } = await supabase
    .from("rfqs")
    .update(payload)
    .eq("id", rfqId)
    .select(`
      id,
      rfq_number,
      title,
      status,
      priority,
      currency_code,
      updated_at
    `)
    .maybeSingle();

  if (error) {
    if (error.code === "23514") {
      throw new Error(
        "The RFQ contains invalid dates or currency information.",
      );
    }

    throw new Error(
      `Unable to update RFQ: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "RFQ was not found or could not be updated.",
    );
  }

  return data;
}

export async function deleteDraftRfq(
  rfqId: string,
) {
  const id = requireId(
    rfqId,
    "RFQ ID",
  );
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfqs")
    .delete()
    .eq("id", id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to delete RFQ: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Only draft RFQs can be deleted.",
    );
  }

  return data;
}

export async function sendRfq(
  rfqId: string,
) {
  const id = requireId(
    rfqId,
    "RFQ ID",
  );

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "send_rfq",
    {
      target_rfq_id: id,
    },
  );

  if (error) {
    throw new Error(
      `Unable to send RFQ: ${error.message}`,
    );
  }

  return data;
}

export async function awardSupplierQuotation(
  rfqId: string,
  quotationId: string,
) {
  const id = requireId(
    rfqId,
    "RFQ ID",
  );

  const quoteId = requireId(
    quotationId,
    "Quotation ID",
  );

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "award_supplier_quotation",
    {
      target_rfq_id: id,
      target_quotation_id: quoteId,
    },
  );

  if (error) {
    throw new Error(
      `Unable to award quotation: ${error.message}`,
    );
  }

  return data;
}

export async function closeRfq(
  rfqId: string,
) {
  const id = requireId(
    rfqId,
    "RFQ ID",
  );
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "close_rfq",
    {
      target_rfq_id: id,
    },
  );

  if (error) {
    throw new Error(
      `Unable to close RFQ: ${error.message}`,
    );
  }

  return data;
}

export async function getRfqDashboardSummary():
  Promise<RfqDashboardSummary> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfqs")
    .select(`
      status,
      priority,
      response_deadline
    `);

  if (error) {
    throw new Error(
      `Unable to load RFQ summary: ${error.message}`,
    );
  }

  const rfqs = data ?? [];

  const now = new Date();

  const countStatus = (
    status: RfqStatus,
  ) =>
    rfqs.filter(
      (rfq) => rfq.status === status,
    ).length;

  const overdueResponses =
    rfqs.filter((rfq) => {
      if (!rfq.response_deadline) {
        return false;
      }

      if (
        rfq.status === "awarded" ||
        rfq.status === "closed" ||
        rfq.status === "cancelled"
      ) {
        return false;
      }

      return (
        new Date(
          rfq.response_deadline,
        ) < now
      );
    }).length;

  return {
    total: rfqs.length,
    draft: countStatus("draft"),
    ready: countStatus("ready"),
    sent: countStatus("sent"),
    partiallyQuoted:
      countStatus(
        "partially_quoted",
      ),
    quoted: countStatus("quoted"),
    underReview:
      countStatus("under_review"),
    awarded: countStatus("awarded"),
    closed: countStatus("closed"),
    cancelled:
      countStatus("cancelled"),
    overdueResponses,
    urgent: rfqs.filter(
      (rfq) =>
        rfq.priority === "urgent" &&
        rfq.status !== "closed" &&
        rfq.status !== "cancelled",
    ).length,
  };
}

export type RfqListResult = Awaited<
  ReturnType<typeof getRfqs>
>;

export type RfqSummary =
  RfqListResult["data"][number];

export type RfqDetails = NonNullable<
  Awaited<
    ReturnType<typeof getRfqById>
  >
>;

export type CreatedRfq = Awaited<
  ReturnType<typeof createRfq>
>;

export type UpdatedRfq = Awaited<
  ReturnType<typeof updateRfq>
>;

export type RfqByNumber = Awaited<
  ReturnType<typeof getRfqByNumber>
>;

export type DeletedDraftRfq =
  Awaited<
    ReturnType<typeof deleteDraftRfq>
  >;