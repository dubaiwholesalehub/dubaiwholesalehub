import {
  Building2,
  Landmark,
  Save,
} from "lucide-react";

import {
  getCompanyProfile,
} from "@/lib/repositories/company-profile.repository";

import {
  saveCompanyProfileAction,
} from "./actions";


const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

const textareaClass =
  "min-h-24 w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";


export default async function CompanyProfilePage() {
  const profile =
    await getCompanyProfile();


  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Building2 className="size-5" />
        </div>

        <div>
          <p className="text-sm font-medium text-amber-600">
            Settings
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Company Profile
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Maintain the legal, contact and document information used across invoices,
            quotations, delivery notes, statements and other ERP documents.
          </p>
        </div>
      </div>


      <form
        action={saveCompanyProfileAction}
        className="space-y-6"
      >
        <section className="rounded-2xl border bg-card p-6">
          <SectionHeading
            title="Company Identity"
            description="Legal and tax information for your business."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Legal Company Name" required>
              <input
                name="legal_name"
                required
                defaultValue={
                  profile?.legal_name ??
                  ""
                }
                className={inputClass}
                placeholder="Legal registered company name"
              />
            </Field>

            <Field label="Trade Name">
              <input
                name="trade_name"
                defaultValue={
                  profile?.trade_name ??
                  ""
                }
                className={inputClass}
                placeholder="Trading / display name"
              />
            </Field>

            <Field label="Arabic Name">
              <input
                name="arabic_name"
                dir="rtl"
                defaultValue={
                  profile?.arabic_name ??
                  ""
                }
                className={inputClass}
                placeholder="اسم الشركة"
              />
            </Field>

            <Field label="Tax Registration Number (TRN)">
              <input
                name="tax_registration_number"
                defaultValue={
                  profile?.tax_registration_number ??
                  ""
                }
                className={inputClass}
                placeholder="15-digit VAT TRN"
              />
            </Field>

            <Field label="Trade License Number">
              <input
                name="trade_license_number"
                defaultValue={
                  profile?.trade_license_number ??
                  ""
                }
                className={inputClass}
                placeholder="Trade license number"
              />
            </Field>
          </div>
        </section>


        <section className="rounded-2xl border bg-card p-6">
          <SectionHeading
            title="Contact Information"
            description="Business contact details available to printed documents."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Phone">
              <input
                name="phone"
                defaultValue={
                  profile?.phone ??
                  ""
                }
                className={inputClass}
                placeholder="+971..."
              />
            </Field>

            <Field label="WhatsApp">
              <input
                name="whatsapp"
                defaultValue={
                  profile?.whatsapp ??
                  ""
                }
                className={inputClass}
                placeholder="+971..."
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                name="email"
                defaultValue={
                  profile?.email ??
                  ""
                }
                className={inputClass}
                placeholder="accounts@example.com"
              />
            </Field>

            <Field label="Website">
              <input
                name="website"
                defaultValue={
                  profile?.website ??
                  ""
                }
                className={inputClass}
                placeholder="www.example.com"
              />
            </Field>
          </div>
        </section>


        <section className="rounded-2xl border bg-card p-6">
          <SectionHeading
            title="Registered Address"
            description="Company address used on official documents."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Address Line 1">
              <input
                name="address_line_1"
                defaultValue={
                  profile?.address_line_1 ??
                  ""
                }
                className={inputClass}
              />
            </Field>

            <Field label="Address Line 2">
              <input
                name="address_line_2"
                defaultValue={
                  profile?.address_line_2 ??
                  ""
                }
                className={inputClass}
              />
            </Field>

            <Field label="City">
              <input
                name="city"
                defaultValue={
                  profile?.city ??
                  ""
                }
                className={inputClass}
                placeholder="Dubai"
              />
            </Field>

            <Field label="Emirate / State">
              <input
                name="state"
                defaultValue={
                  profile?.state ??
                  ""
                }
                className={inputClass}
                placeholder="Dubai"
              />
            </Field>

            <Field label="Country" required>
              <input
                name="country"
                required
                defaultValue={
                  profile?.country ??
                  "United Arab Emirates"
                }
                className={inputClass}
              />
            </Field>

            <Field label="P.O. Box">
              <input
                name="po_box"
                defaultValue={
                  profile?.po_box ??
                  ""
                }
                className={inputClass}
              />
            </Field>

            <Field label="Postal Code">
              <input
                name="postal_code"
                defaultValue={
                  profile?.postal_code ??
                  ""
                }
                className={inputClass}
              />
            </Field>
          </div>
        </section>


        <section className="rounded-2xl border bg-card p-6">
          <SectionHeading
            title="Document Branding"
            description="Branding and footer information available to invoice and document templates."
          />

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Field
              label="Logo Path"
              description="Public asset path or image URL. Example: /logo.png"
            >
              <input
                name="logo_path"
                defaultValue={
                  profile?.logo_path ??
                  ""
                }
                className={inputClass}
                placeholder="/logo.png"
              />
            </Field>

            <Field
              label="Document Footer"
              description="Optional footer text for invoices and other documents."
            >
              <textarea
                name="document_footer"
                defaultValue={
                  profile?.document_footer ??
                  ""
                }
                className={textareaClass}
                placeholder="Thank you for your business."
              />
            </Field>
          </div>
        </section>


        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Landmark className="size-4" />
            </div>

            <SectionHeading
              title="Bank Details"
              description="Optional payment information that can later be shown on selected invoices."
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Bank Name">
              <input
                name="bank_name"
                defaultValue={
                  profile?.bank_name ??
                  ""
                }
                className={inputClass}
              />
            </Field>

            <Field label="Account Name">
              <input
                name="bank_account_name"
                defaultValue={
                  profile?.bank_account_name ??
                  ""
                }
                className={inputClass}
              />
            </Field>

            <Field label="Account Number">
              <input
                name="bank_account_number"
                defaultValue={
                  profile?.bank_account_number ??
                  ""
                }
                className={inputClass}
              />
            </Field>

            <Field label="IBAN">
              <input
                name="bank_iban"
                defaultValue={
                  profile?.bank_iban ??
                  ""
                }
                className={inputClass}
              />
            </Field>

            <Field label="SWIFT / BIC">
              <input
                name="bank_swift_code"
                defaultValue={
                  profile?.bank_swift_code ??
                  ""
                }
                className={inputClass}
              />
            </Field>
          </div>
        </section>


        <div className="sticky bottom-4 z-10 flex justify-end">
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
          >
            <Save className="size-4" />

            {profile
              ? "Save Changes"
              : "Create Company Profile"}
          </button>
        </div>
      </form>


      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Document display control:</strong>{" "}
        Saving company information here does not mean every field must appear on
        every invoice. Invoice templates will independently control whether TRN,
        license, address, contact details, bank details and VAT information are
        printed.
      </div>
    </div>
  );
}


function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="font-semibold">
        {title}
      </h2>

      <p className="mt-1 text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}


function Field({
  label,
  description,
  required = false,
  children,
}: {
  label: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label}

        {required ? (
          <span className="ml-1 text-red-500">
            *
          </span>
        ) : null}
      </span>

      {children}

      {description ? (
        <span className="block text-xs text-muted-foreground">
          {description}
        </span>
      ) : null}
    </label>
  );
}