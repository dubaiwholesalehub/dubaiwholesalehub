import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

/* =========================================================
 * Database Types
 * ========================================================= */

type CustomerRow =
    Database["public"]["Tables"]["customers"]["Row"];

type CustomerInsert =
    Database["public"]["Tables"]["customers"]["Insert"];

type CustomerUpdate =
    Database["public"]["Tables"]["customers"]["Update"];

type CustomerContactRow =
    Database["public"]["Tables"]["customer_contacts"]["Row"];

type CustomerAddressRow =
    Database["public"]["Tables"]["customer_addresses"]["Row"];

/* =========================================================
 * Customer Enums
 * ========================================================= */

export type CustomerType =
    | "individual"
    | "business";

export type CustomerStatus =
    | "active"
    | "inactive"
    | "blocked";

export type CustomerSource =
    | "internal"
    | "hmshoponline"
    | "dubaiwholesalehub"
    | "import";

export type CustomerAddressType =
    | "billing"
    | "shipping"
    | "both";

/* =========================================================
 * Customer Models
 * ========================================================= */

export interface Customer {
    id: string;

    customer_number: string;

    customer_type: CustomerType;

    display_name: string;

    company_name: string | null;

    first_name: string | null;
    last_name: string | null;

    email: string | null;
    phone: string | null;
    whatsapp: string | null;

    tax_registration_number: string | null;

    currency_code: string;

    credit_limit: number;

    payment_terms_days: number;

    status: CustomerStatus;

    source: CustomerSource;

    external_customer_id: string | null;

    internal_notes: string | null;

    created_by: string | null;
    updated_by: string | null;

    created_at: string;
    updated_at: string;
}

export interface CustomerContact {
    id: string;

    customer_id: string;

    contact_name: string;

    job_title: string | null;

    email: string | null;
    phone: string | null;
    whatsapp: string | null;

    is_primary: boolean;
    is_active: boolean;

    notes: string | null;

    created_at: string;
    updated_at: string;
}

export interface CustomerAddress {
    id: string;

    customer_id: string;

    address_type: CustomerAddressType;

    address_name: string | null;

    contact_name: string | null;
    phone: string | null;

    address_line_1: string;
    address_line_2: string | null;

    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;

    is_default: boolean;
    is_active: boolean;

    delivery_instructions: string | null;

    created_at: string;
    updated_at: string;
}

export interface CustomerDetails extends Customer {
    contacts: CustomerContact[];
    addresses: CustomerAddress[];
}

export interface CustomerLookupOption {
    id: string;
    customer_number: string;
    display_name: string;
    company_name: string | null;
}

/* =========================================================
 * Customer Inputs
 * ========================================================= */

export interface CreateCustomerInput {
    customer_type: CustomerType;

    display_name: string;

    company_name?: string | null;

    first_name?: string | null;
    last_name?: string | null;

    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;

    tax_registration_number?: string | null;

    currency_code?: string;

    credit_limit?: number;

    payment_terms_days?: number;

    status?: CustomerStatus;

    source?: CustomerSource;

    external_customer_id?: string | null;

    internal_notes?: string | null;
}

export type UpdateCustomerInput =
    Partial<CreateCustomerInput>;

export interface CreateCustomerContactInput {
    customer_id: string;

    contact_name: string;

    job_title?: string | null;

    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;

    is_primary?: boolean;
    is_active?: boolean;

    notes?: string | null;
}

export type UpdateCustomerContactInput =
    Partial<
        Omit<
            CreateCustomerContactInput,
            "customer_id"
        >
    >;

export interface CreateCustomerAddressInput {
    customer_id: string;

    address_type?: CustomerAddressType;

    address_name?: string | null;

    contact_name?: string | null;
    phone?: string | null;

    address_line_1: string;
    address_line_2?: string | null;

    city?: string | null;
    state?: string | null;
    country?: string | null;
    postal_code?: string | null;

    is_default?: boolean;
    is_active?: boolean;

    delivery_instructions?: string | null;
}

export type UpdateCustomerAddressInput =
    Partial<
        Omit<
            CreateCustomerAddressInput,
            "customer_id"
        >
    >;

/* =========================================================
 * Customer List
 * ========================================================= */

export interface GetCustomersInput {
    search?: string;

    status?: CustomerStatus | "all";

    customerType?: CustomerType | "all";

    source?: CustomerSource | "all";

    page?: number;

    pageSize?: number;
}

export interface GetCustomersResult {
    data: Customer[];

    count: number;

    page: number;

    pageSize: number;

    totalPages: number;
}

export interface CustomerSummary {
    total: number;

    active: number;

    inactive: number;

    blocked: number;

    business: number;

    individual: number;
}

/* =========================================================
 * Validation Helpers
 * ========================================================= */

function requireId(
    value: string,
    fieldName: string,
): string {
    const normalized = value.trim();

    if (!normalized) {
        throw new Error(
            `${fieldName} is required.`,
        );
    }

    return normalized;
}

function validateCustomerInput(
    input: Pick<
        CreateCustomerInput,
        | "customer_type"
        | "display_name"
        | "company_name"
    >,
): void {
    if (!input.display_name.trim()) {
        throw new Error(
            "Customer display name is required.",
        );
    }

    if (
        input.customer_type === "business" &&
        !input.company_name?.trim()
    ) {
        throw new Error(
            "Company name is required for business customers.",
        );
    }
}

function validateContactName(
    contactName: string,
): void {
    if (!contactName.trim()) {
        throw new Error(
            "Contact name is required.",
        );
    }
}

function validateAddressLine(
    addressLine: string,
): void {
    if (!addressLine.trim()) {
        throw new Error(
            "Address line 1 is required.",
        );
    }
}

function normalizePage(
    value: number | undefined,
): number {
    if (
        value === undefined ||
        !Number.isFinite(value)
    ) {
        return 1;
    }

    return Math.max(
        Math.floor(value),
        1,
    );
}

function normalizePageSize(
    value: number | undefined,
): number {
    if (
        value === undefined ||
        !Number.isFinite(value)
    ) {
        return 25;
    }

    return Math.min(
        Math.max(
            Math.floor(value),
            1,
        ),
        100,
    );
}

function sanitizeSearchTerm(
    value: string,
): string {
    return value
        .trim()
        .replaceAll(",", " ")
        .replaceAll("(", " ")
        .replaceAll(")", " ")
        .replaceAll('"', " ")
        .replace(/\s+/g, " ");
}

function normalizeNullableText(
    value: string | null | undefined,
): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    const normalized = value.trim();

    return normalized || null;
}

/* =========================================================
 * Data Mapping
 * ========================================================= */

function mapCustomerRow(
    row: CustomerRow,
): Customer {
    return {
        id: row.id,

        customer_number:
            row.customer_number,

        customer_type:
            row.customer_type as CustomerType,

        display_name:
            row.display_name,

        company_name:
            row.company_name,

        first_name:
            row.first_name,

        last_name:
            row.last_name,

        email: row.email,
        phone: row.phone,
        whatsapp: row.whatsapp,

        tax_registration_number:
            row.tax_registration_number,

        currency_code:
            row.currency_code,

        credit_limit:
            Number(row.credit_limit),

        payment_terms_days:
            Number(row.payment_terms_days),

        status:
            row.status as CustomerStatus,

        source:
            row.source as CustomerSource,

        external_customer_id:
            row.external_customer_id,

        internal_notes:
            row.internal_notes,

        created_by:
            row.created_by,

        updated_by:
            row.updated_by,

        created_at:
            row.created_at,

        updated_at:
            row.updated_at,
    };
}

export async function getCustomerContactById(
  contactId: string,
): Promise<CustomerContact | null> {
  const id = requireId(
    contactId,
    "Customer contact ID",
  );

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customer_contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load customer contact: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapCustomerContactRow(
    data as CustomerContactRow,
  );
}

function mapCustomerContactRow(
    row: CustomerContactRow,
): CustomerContact {
    return {
        id: row.id,

        customer_id:
            row.customer_id,

        contact_name:
            row.contact_name,

        job_title:
            row.job_title,

        email: row.email,
        phone: row.phone,
        whatsapp: row.whatsapp,

        is_primary:
            row.is_primary,

        is_active:
            row.is_active,

        notes:
            row.notes,

        created_at:
            row.created_at,

        updated_at:
            row.updated_at,
    };
}

export async function getCustomerAddressById(
  addressId: string,
): Promise<CustomerAddress | null> {
  const id = requireId(
    addressId,
    "Customer address ID",
  );

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load customer address: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapCustomerAddressRow(
    data as CustomerAddressRow,
  );
}

function mapCustomerAddressRow(
    row: CustomerAddressRow,
): CustomerAddress {
    return {
        id: row.id,

        customer_id:
            row.customer_id,

        address_type:
            row.address_type as CustomerAddressType,

        address_name:
            row.address_name,

        contact_name:
            row.contact_name,

        phone:
            row.phone,

        address_line_1:
            row.address_line_1,

        address_line_2:
            row.address_line_2,

        city: row.city,
        state: row.state,
        country: row.country,

        postal_code:
            row.postal_code,

        is_default:
            row.is_default,

        is_active:
            row.is_active,

        delivery_instructions:
            row.delivery_instructions,

        created_at:
            row.created_at,

        updated_at:
            row.updated_at,
    };
}

/* =========================================================
 * Customer Read Operations
 * ========================================================= */

export async function getCustomers(): Promise<
    Customer[]
> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("display_name", {
            ascending: true,
        });

    if (error) {
        throw new Error(
            `Unable to load customers: ${error.message}`,
        );
    }

    return ((data ?? []) as CustomerRow[])
        .map(mapCustomerRow);
}

export async function getActiveCustomers(): Promise<
    Customer[]
> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("status", "active")
        .order("display_name", {
            ascending: true,
        });

    if (error) {
        throw new Error(
            `Unable to load active customers: ${error.message}`,
        );
    }

    return ((data ?? []) as CustomerRow[])
        .map(mapCustomerRow);
}

export async function getCustomerPage({
    search,
    status,
    customerType,
    source,
    page,
    pageSize,
}: GetCustomersInput = {}): Promise<GetCustomersResult> {
    const supabase = await createClient();

    const currentPage =
        normalizePage(page);

    const currentPageSize =
        normalizePageSize(pageSize);

    const rangeStart =
        (currentPage - 1) *
        currentPageSize;

    const rangeEnd =
        rangeStart +
        currentPageSize -
        1;

    const searchTerm =
        sanitizeSearchTerm(
            search ?? "",
        );

    let query = supabase
        .from("customers")
        .select("*", {
            count: "exact",
        });

    if (
        status &&
        status !== "all"
    ) {
        query = query.eq(
            "status",
            status,
        );
    }

    if (
        customerType &&
        customerType !== "all"
    ) {
        query = query.eq(
            "customer_type",
            customerType,
        );
    }

    if (
        source &&
        source !== "all"
    ) {
        query = query.eq(
            "source",
            source,
        );
    }

    if (searchTerm) {
        query = query.or(
            [
                `customer_number.ilike.%${searchTerm}%`,
                `display_name.ilike.%${searchTerm}%`,
                `company_name.ilike.%${searchTerm}%`,
                `first_name.ilike.%${searchTerm}%`,
                `last_name.ilike.%${searchTerm}%`,
                `email.ilike.%${searchTerm}%`,
                `phone.ilike.%${searchTerm}%`,
                `whatsapp.ilike.%${searchTerm}%`,
                `tax_registration_number.ilike.%${searchTerm}%`,
            ].join(","),
        );
    }

    const {
        data,
        error,
        count,
    } = await query
        .order("created_at", {
            ascending: false,
        })
        .range(
            rangeStart,
            rangeEnd,
        );

    if (error) {
        throw new Error(
            `Unable to load customers: ${error.message}`,
        );
    }

    const totalCount =
        count ?? 0;

    return {
        data:
            ((data ?? []) as CustomerRow[])
                .map(mapCustomerRow),

        count:
            totalCount,

        page:
            currentPage,

        pageSize:
            currentPageSize,

        totalPages:
            Math.max(
                Math.ceil(
                    totalCount /
                    currentPageSize,
                ),
                1,
            ),
    };
}

export async function getCustomerById(
    customerId: string,
): Promise<CustomerDetails | null> {
    const id = requireId(
        customerId,
        "Customer ID",
    );

    const supabase = await createClient();

    const [
        customerResult,
        contactsResult,
        addressesResult,
    ] = await Promise.all([
        supabase
            .from("customers")
            .select("*")
            .eq("id", id)
            .maybeSingle(),

        supabase
            .from("customer_contacts")
            .select("*")
            .eq("customer_id", id)
            .order("is_primary", {
                ascending: false,
            })
            .order("contact_name", {
                ascending: true,
            }),

        supabase
            .from("customer_addresses")
            .select("*")
            .eq("customer_id", id)
            .order("is_default", {
                ascending: false,
            })
            .order("created_at", {
                ascending: true,
            }),
    ]);

    const firstError =
        customerResult.error ??
        contactsResult.error ??
        addressesResult.error;

    if (firstError) {
        throw new Error(
            `Unable to load customer: ${firstError.message}`,
        );
    }

    if (!customerResult.data) {
        return null;
    }

    return {
        ...mapCustomerRow(
            customerResult.data as CustomerRow,
        ),

        contacts: (
            (contactsResult.data ?? []) as CustomerContactRow[]
        ).map(mapCustomerContactRow),

        addresses: (
            (addressesResult.data ?? []) as CustomerAddressRow[]
        ).map(mapCustomerAddressRow),
    };
}

export async function getCustomerLookupOptions(): Promise<
    CustomerLookupOption[]
> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("customers")
        .select(`
      id,
      customer_number,
      display_name,
      company_name
    `)
        .eq("status", "active")
        .order("display_name", {
            ascending: true,
        });

    if (error) {
        throw new Error(
            `Unable to load customer options: ${error.message}`,
        );
    }

    return (data ?? []).map(
        (customer) => ({
            id: customer.id,

            customer_number:
                customer.customer_number,

            display_name:
                customer.display_name,

            company_name:
                customer.company_name,
        }),
    );
}

export async function getCustomerSummary(): Promise<
    CustomerSummary
> {
    const supabase = await createClient();

    const [
        totalResult,
        activeResult,
        inactiveResult,
        blockedResult,
        businessResult,
        individualResult,
    ] = await Promise.all([
        supabase
            .from("customers")
            .select("id", {
                count: "exact",
                head: true,
            }),

        supabase
            .from("customers")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("status", "active"),

        supabase
            .from("customers")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("status", "inactive"),

        supabase
            .from("customers")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("status", "blocked"),

        supabase
            .from("customers")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq(
                "customer_type",
                "business",
            ),

        supabase
            .from("customers")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq(
                "customer_type",
                "individual",
            ),
    ]);

    const firstError =
        totalResult.error ??
        activeResult.error ??
        inactiveResult.error ??
        blockedResult.error ??
        businessResult.error ??
        individualResult.error;

    if (firstError) {
        throw new Error(
            `Unable to load customer summary: ${firstError.message}`,
        );
    }

    return {
        total:
            totalResult.count ?? 0,

        active:
            activeResult.count ?? 0,

        inactive:
            inactiveResult.count ?? 0,

        blocked:
            blockedResult.count ?? 0,

        business:
            businessResult.count ?? 0,

        individual:
            individualResult.count ?? 0,
    };
}

/* =========================================================
 * Customer Write Operations
 * ========================================================= */

export async function createCustomer(
    input: CreateCustomerInput,
): Promise<Customer> {
    validateCustomerInput(input);

    const supabase = await createClient();

    /*
     * customer_number is required by the generated Insert type.
     * An empty value is supplied intentionally so the database
     * trigger generates the real customer number.
     */
    const payload: CustomerInsert = {
        customer_number: "",

        customer_type:
            input.customer_type,

        display_name:
            input.display_name.trim(),

        company_name:
            normalizeNullableText(
                input.company_name,
            ),

        first_name:
            normalizeNullableText(
                input.first_name,
            ),

        last_name:
            normalizeNullableText(
                input.last_name,
            ),

        email:
            normalizeNullableText(
                input.email,
            ),

        phone:
            normalizeNullableText(
                input.phone,
            ),

        whatsapp:
            normalizeNullableText(
                input.whatsapp,
            ),

        tax_registration_number:
            normalizeNullableText(
                input.tax_registration_number,
            ),

        currency_code:
            input.currency_code
                ?.trim()
                .toUpperCase() || "AED",

        credit_limit:
            input.credit_limit ?? 0,

        payment_terms_days:
            input.payment_terms_days ?? 0,

        status:
            input.status ?? "active",

        source:
            input.source ?? "internal",

        external_customer_id:
            normalizeNullableText(
                input.external_customer_id,
            ),

        internal_notes:
            normalizeNullableText(
                input.internal_notes,
            ),
    };

    const { data, error } = await supabase
        .from("customers")
        .insert(payload)
        .select("*")
        .single();

    if (error) {
        throw new Error(
            `Unable to create customer: ${error.message}`,
        );
    }

    return mapCustomerRow(
        data as CustomerRow,
    );
}

export async function updateCustomer(
    customerId: string,
    input: UpdateCustomerInput,
): Promise<Customer> {
    const id = requireId(
        customerId,
        "Customer ID",
    );

    const existingCustomer =
        await getCustomerById(id);

    if (!existingCustomer) {
        throw new Error(
            "Customer was not found.",
        );
    }

    const customerType =
        input.customer_type ??
        existingCustomer.customer_type;

    const displayName =
        input.display_name ??
        existingCustomer.display_name;

    const companyName =
        input.company_name !== undefined
            ? input.company_name
            : existingCustomer.company_name;

    validateCustomerInput({
        customer_type:
            customerType,

        display_name:
            displayName,

        company_name:
            companyName,
    });

    const payload: CustomerUpdate = {};

    if (input.customer_type !== undefined) {
        payload.customer_type =
            input.customer_type;
    }

    if (input.display_name !== undefined) {
        payload.display_name =
            input.display_name.trim();
    }

    if (input.company_name !== undefined) {
        payload.company_name =
            normalizeNullableText(
                input.company_name,
            );
    }

    if (input.first_name !== undefined) {
        payload.first_name =
            normalizeNullableText(
                input.first_name,
            );
    }

    if (input.last_name !== undefined) {
        payload.last_name =
            normalizeNullableText(
                input.last_name,
            );
    }

    if (input.email !== undefined) {
        payload.email =
            normalizeNullableText(
                input.email,
            );
    }

    if (input.phone !== undefined) {
        payload.phone =
            normalizeNullableText(
                input.phone,
            );
    }

    if (input.whatsapp !== undefined) {
        payload.whatsapp =
            normalizeNullableText(
                input.whatsapp,
            );
    }

    if (
        input.tax_registration_number !==
        undefined
    ) {
        payload.tax_registration_number =
            normalizeNullableText(
                input.tax_registration_number,
            );
    }

    if (input.currency_code !== undefined) {
        payload.currency_code =
            input.currency_code
                .trim()
                .toUpperCase();
    }

    if (input.credit_limit !== undefined) {
        payload.credit_limit =
            input.credit_limit;
    }

    if (
        input.payment_terms_days !==
        undefined
    ) {
        payload.payment_terms_days =
            input.payment_terms_days;
    }

    if (input.status !== undefined) {
        payload.status =
            input.status;
    }

    if (input.source !== undefined) {
        payload.source =
            input.source;
    }

    if (
        input.external_customer_id !==
        undefined
    ) {
        payload.external_customer_id =
            normalizeNullableText(
                input.external_customer_id,
            );
    }

    if (input.internal_notes !== undefined) {
        payload.internal_notes =
            normalizeNullableText(
                input.internal_notes,
            );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to update customer: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "Customer was not found.",
        );
    }

    return mapCustomerRow(
        data as CustomerRow,
    );
}

export async function setCustomerStatus(
    customerId: string,
    status: CustomerStatus,
): Promise<Customer> {
    const id = requireId(
        customerId,
        "Customer ID",
    );

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("customers")
        .update({
            status,
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to update customer status: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "Customer was not found.",
        );
    }

    return mapCustomerRow(
        data as CustomerRow,
    );
}

/* =========================================================
 * Customer Contact Operations
 * ========================================================= */

export async function createCustomerContact(
    input: CreateCustomerContactInput,
): Promise<CustomerContact> {
    const customerId = requireId(
        input.customer_id,
        "Customer ID",
    );

    validateContactName(
        input.contact_name,
    );

    const supabase = await createClient();

    if (input.is_primary) {
        const { error: resetError } =
            await supabase
                .from("customer_contacts")
                .update({
                    is_primary: false,
                })
                .eq(
                    "customer_id",
                    customerId,
                );

        if (resetError) {
            throw new Error(
                `Unable to reset the primary customer contact: ${resetError.message}`,
            );
        }
    }

    const { data, error } = await supabase
        .from("customer_contacts")
        .insert({
            customer_id:
                customerId,

            contact_name:
                input.contact_name.trim(),

            job_title:
                normalizeNullableText(
                    input.job_title,
                ),

            email:
                normalizeNullableText(
                    input.email,
                ),

            phone:
                normalizeNullableText(
                    input.phone,
                ),

            whatsapp:
                normalizeNullableText(
                    input.whatsapp,
                ),

            is_primary:
                input.is_primary ?? false,

            is_active:
                input.is_active ?? true,

            notes:
                normalizeNullableText(
                    input.notes,
                ),
        })
        .select("*")
        .single();

    if (error) {
        throw new Error(
            `Unable to create customer contact: ${error.message}`,
        );
    }

    return mapCustomerContactRow(
        data as CustomerContactRow,
    );
}

export async function updateCustomerContact(
    contactId: string,
    input: UpdateCustomerContactInput,
): Promise<CustomerContact> {
    const id = requireId(
        contactId,
        "Customer contact ID",
    );

    if (input.contact_name !== undefined) {
        validateContactName(
            input.contact_name,
        );
    }

    const supabase = await createClient();

    const {
        data: existingContact,
        error: existingError,
    } = await supabase
        .from("customer_contacts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (existingError) {
        throw new Error(
            `Unable to load customer contact: ${existingError.message}`,
        );
    }

    if (!existingContact) {
        throw new Error(
            "Customer contact was not found.",
        );
    }

    if (input.is_primary) {
        const { error: resetError } =
            await supabase
                .from("customer_contacts")
                .update({
                    is_primary: false,
                })
                .eq(
                    "customer_id",
                    existingContact.customer_id,
                )
                .neq("id", id);

        if (resetError) {
            throw new Error(
                `Unable to reset the primary customer contact: ${resetError.message}`,
            );
        }
    }

    const payload:
        Database["public"]["Tables"]["customer_contacts"]["Update"] =
        {};

    if (input.contact_name !== undefined) {
        payload.contact_name =
            input.contact_name.trim();
    }

    if (input.job_title !== undefined) {
        payload.job_title =
            normalizeNullableText(
                input.job_title,
            );
    }

    if (input.email !== undefined) {
        payload.email =
            normalizeNullableText(
                input.email,
            );
    }

    if (input.phone !== undefined) {
        payload.phone =
            normalizeNullableText(
                input.phone,
            );
    }

    if (input.whatsapp !== undefined) {
        payload.whatsapp =
            normalizeNullableText(
                input.whatsapp,
            );
    }

    if (input.is_primary !== undefined) {
        payload.is_primary =
            input.is_primary;
    }

    if (input.is_active !== undefined) {
        payload.is_active =
            input.is_active;
    }

    if (input.notes !== undefined) {
        payload.notes =
            normalizeNullableText(
                input.notes,
            );
    }

    const { data, error } = await supabase
        .from("customer_contacts")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to update customer contact: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "Customer contact was not found.",
        );
    }

    return mapCustomerContactRow(
        data as CustomerContactRow,
    );
}

export async function deleteCustomerContact(
    contactId: string,
): Promise<void> {
    const id = requireId(
        contactId,
        "Customer contact ID",
    );

    const supabase = await createClient();

    const { error } = await supabase
        .from("customer_contacts")
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error(
            `Unable to delete customer contact: ${error.message}`,
        );
    }
}

/* =========================================================
 * Customer Address Operations
 * ========================================================= */

export async function createCustomerAddress(
    input: CreateCustomerAddressInput,
): Promise<CustomerAddress> {
    const customerId = requireId(
        input.customer_id,
        "Customer ID",
    );

    validateAddressLine(
        input.address_line_1,
    );

    const supabase = await createClient();

    if (input.is_default) {
        const { error: resetError } =
            await supabase
                .from("customer_addresses")
                .update({
                    is_default: false,
                })
                .eq(
                    "customer_id",
                    customerId,
                );

        if (resetError) {
            throw new Error(
                `Unable to reset the default customer address: ${resetError.message}`,
            );
        }
    }

    const { data, error } = await supabase
        .from("customer_addresses")
        .insert({
            customer_id:
                customerId,

            address_type:
                input.address_type ??
                "shipping",

            address_name:
                normalizeNullableText(
                    input.address_name,
                ),

            contact_name:
                normalizeNullableText(
                    input.contact_name,
                ),

            phone:
                normalizeNullableText(
                    input.phone,
                ),

            address_line_1:
                input.address_line_1.trim(),

            address_line_2:
                normalizeNullableText(
                    input.address_line_2,
                ),

            city:
                normalizeNullableText(
                    input.city,
                ),

            state:
                normalizeNullableText(
                    input.state,
                ),

            country:
                normalizeNullableText(
                    input.country,
                ),

            postal_code:
                normalizeNullableText(
                    input.postal_code,
                ),

            is_default:
                input.is_default ?? false,

            is_active:
                input.is_active ?? true,

            delivery_instructions:
                normalizeNullableText(
                    input.delivery_instructions,
                ),
        })
        .select("*")
        .single();

    if (error) {
        throw new Error(
            `Unable to create customer address: ${error.message}`,
        );
    }

    return mapCustomerAddressRow(
        data as CustomerAddressRow,
    );
}

export async function updateCustomerAddress(
    addressId: string,
    input: UpdateCustomerAddressInput,
): Promise<CustomerAddress> {
    const id = requireId(
        addressId,
        "Customer address ID",
    );

    if (
        input.address_line_1 !==
        undefined
    ) {
        validateAddressLine(
            input.address_line_1,
        );
    }

    const supabase = await createClient();

    const {
        data: existingAddress,
        error: existingError,
    } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (existingError) {
        throw new Error(
            `Unable to load customer address: ${existingError.message}`,
        );
    }

    if (!existingAddress) {
        throw new Error(
            "Customer address was not found.",
        );
    }

    if (input.is_default) {
        const { error: resetError } =
            await supabase
                .from("customer_addresses")
                .update({
                    is_default: false,
                })
                .eq(
                    "customer_id",
                    existingAddress.customer_id,
                )
                .neq("id", id);

        if (resetError) {
            throw new Error(
                `Unable to reset the default customer address: ${resetError.message}`,
            );
        }
    }

    const payload:
        Database["public"]["Tables"]["customer_addresses"]["Update"] =
        {};

    if (input.address_type !== undefined) {
        payload.address_type =
            input.address_type;
    }

    if (input.address_name !== undefined) {
        payload.address_name =
            normalizeNullableText(
                input.address_name,
            );
    }

    if (input.contact_name !== undefined) {
        payload.contact_name =
            normalizeNullableText(
                input.contact_name,
            );
    }

    if (input.phone !== undefined) {
        payload.phone =
            normalizeNullableText(
                input.phone,
            );
    }

    if (
        input.address_line_1 !== undefined
    ) {
        payload.address_line_1 =
            input.address_line_1.trim();
    }

    if (
        input.address_line_2 !== undefined
    ) {
        payload.address_line_2 =
            normalizeNullableText(
                input.address_line_2,
            );
    }

    if (input.city !== undefined) {
        payload.city =
            normalizeNullableText(
                input.city,
            );
    }

    if (input.state !== undefined) {
        payload.state =
            normalizeNullableText(
                input.state,
            );
    }

    if (input.country !== undefined) {
        payload.country =
            normalizeNullableText(
                input.country,
            );
    }

    if (input.postal_code !== undefined) {
        payload.postal_code =
            normalizeNullableText(
                input.postal_code,
            );
    }

    if (input.is_default !== undefined) {
        payload.is_default =
            input.is_default;
    }

    if (input.is_active !== undefined) {
        payload.is_active =
            input.is_active;
    }

    if (
        input.delivery_instructions !==
        undefined
    ) {
        payload.delivery_instructions =
            normalizeNullableText(
                input.delivery_instructions,
            );
    }

    const { data, error } = await supabase
        .from("customer_addresses")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to update customer address: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "Customer address was not found.",
        );
    }

    return mapCustomerAddressRow(
        data as CustomerAddressRow,
    );
}

export async function deleteCustomerAddress(
    addressId: string,
): Promise<void> {
    const id = requireId(
        addressId,
        "Customer address ID",
    );

    const supabase = await createClient();

    const { error } = await supabase
        .from("customer_addresses")
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error(
            `Unable to delete customer address: ${error.message}`,
        );
    }
}