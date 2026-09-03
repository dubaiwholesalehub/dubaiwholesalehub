import {
  createClient,
} from "@/lib/supabase/server";

export type CompanyProfile = {
  id: string;

  legal_name: string;
  trade_name: string | null;
  arabic_name: string | null;

  tax_registration_number: string | null;
  trade_license_number: string | null;

  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;

  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postal_code: string | null;
  po_box: string | null;

  logo_path: string | null;

  document_footer: string | null;

  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_iban: string | null;
  bank_swift_code: string | null;

  created_at: string;
  updated_at: string;
};

export type SaveCompanyProfileInput = {
  legal_name: string;
  trade_name?: string | null;
  arabic_name?: string | null;

  tax_registration_number?: string | null;
  trade_license_number?: string | null;

  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;

  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  postal_code?: string | null;
  po_box?: string | null;

  logo_path?: string | null;

  document_footer?: string | null;

  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_iban?: string | null;
  bank_swift_code?: string | null;
};

function nullableText(
  value?: string | null,
): string | null {
  const normalized =
    value?.trim() ?? "";

  return normalized.length > 0
    ? normalized
    : null;
}

export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "company_profile",
      )
      .select("*")
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load company profile: ${error.message}`,
    );
  }

  return (
    data as CompanyProfile | null
  );
}

export async function saveCompanyProfile(
  input: SaveCompanyProfileInput,
): Promise<CompanyProfile> {
  const legalName =
    input.legal_name.trim();

  const country =
    input.country.trim();

  if (!legalName) {
    throw new Error(
      "Legal company name is required.",
    );
  }

  if (!country) {
    throw new Error(
      "Country is required.",
    );
  }

  const supabase =
    await createClient();

  const existing =
    await getCompanyProfile();

  const payload = {
    legal_name:
      legalName,

    trade_name:
      nullableText(
        input.trade_name,
      ),

    arabic_name:
      nullableText(
        input.arabic_name,
      ),

    tax_registration_number:
      nullableText(
        input.tax_registration_number,
      ),

    trade_license_number:
      nullableText(
        input.trade_license_number,
      ),

    phone:
      nullableText(
        input.phone,
      ),

    whatsapp:
      nullableText(
        input.whatsapp,
      ),

    email:
      nullableText(
        input.email,
      ),

    website:
      nullableText(
        input.website,
      ),

    address_line_1:
      nullableText(
        input.address_line_1,
      ),

    address_line_2:
      nullableText(
        input.address_line_2,
      ),

    city:
      nullableText(
        input.city,
      ),

    state:
      nullableText(
        input.state,
      ),

    country,

    postal_code:
      nullableText(
        input.postal_code,
      ),

    po_box:
      nullableText(
        input.po_box,
      ),

    logo_path:
      nullableText(
        input.logo_path,
      ),

    document_footer:
      nullableText(
        input.document_footer,
      ),

    bank_name:
      nullableText(
        input.bank_name,
      ),

    bank_account_name:
      nullableText(
        input.bank_account_name,
      ),

    bank_account_number:
      nullableText(
        input.bank_account_number,
      ),

    bank_iban:
      nullableText(
        input.bank_iban,
      ),

    bank_swift_code:
      nullableText(
        input.bank_swift_code,
      ),
  };

  const query =
    existing
      ? supabase
          .from(
            "company_profile",
          )
          .update(
            payload,
          )
          .eq(
            "id",
            existing.id,
          )
      : supabase
          .from(
            "company_profile",
          )
          .insert(
            payload,
          );

  const {
    data,
    error,
  } =
    await query
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Unable to save company profile: ${error.message}`,
    );
  }

  return data as CompanyProfile;
}