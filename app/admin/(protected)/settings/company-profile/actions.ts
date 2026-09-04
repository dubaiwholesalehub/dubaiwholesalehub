"use server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  revalidatePath,
} from "next/cache";

import {
  saveCompanyProfile,
} from "@/lib/repositories/company-profile.repository";

function stringValue(
  formData: FormData,
  key: string,
): string {
  const value =
    formData.get(key);

  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

export async function saveCompanyProfileAction(
  formData: FormData,
) {
    await requireAdmin();

  await saveCompanyProfile({
    legal_name:
      stringValue(
        formData,
        "legal_name",
      ),

    trade_name:
      stringValue(
        formData,
        "trade_name",
      ),

    arabic_name:
      stringValue(
        formData,
        "arabic_name",
      ),

    tax_registration_number:
      stringValue(
        formData,
        "tax_registration_number",
      ),

    trade_license_number:
      stringValue(
        formData,
        "trade_license_number",
      ),

    phone:
      stringValue(
        formData,
        "phone",
      ),

    whatsapp:
      stringValue(
        formData,
        "whatsapp",
      ),

    email:
      stringValue(
        formData,
        "email",
      ),

    website:
      stringValue(
        formData,
        "website",
      ),

    address_line_1:
      stringValue(
        formData,
        "address_line_1",
      ),

    address_line_2:
      stringValue(
        formData,
        "address_line_2",
      ),

    city:
      stringValue(
        formData,
        "city",
      ),

    state:
      stringValue(
        formData,
        "state",
      ),

    country:
      stringValue(
        formData,
        "country",
      ) ||
      "United Arab Emirates",

    postal_code:
      stringValue(
        formData,
        "postal_code",
      ),

    po_box:
      stringValue(
        formData,
        "po_box",
      ),

    logo_path:
      stringValue(
        formData,
        "logo_path",
      ),

    document_footer:
      stringValue(
        formData,
        "document_footer",
      ),

    bank_name:
      stringValue(
        formData,
        "bank_name",
      ),

    bank_account_name:
      stringValue(
        formData,
        "bank_account_name",
      ),

    bank_account_number:
      stringValue(
        formData,
        "bank_account_number",
      ),

    bank_iban:
      stringValue(
        formData,
        "bank_iban",
      ),

    bank_swift_code:
      stringValue(
        formData,
        "bank_swift_code",
      ),
  });

  revalidatePath(
    "/admin/settings/company-profile",
  );
}