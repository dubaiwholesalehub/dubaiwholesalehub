"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { ArrowLeft, Check, FileText, Settings2 } from "lucide-react";

import { PrintButton } from "@/components/ui/PrintButton";

import type { CompanyProfile } from "@/lib/repositories/company-profile.repository";

import type {
  SalesOrderDetails,
  SalesOrderAddress,
} from "@/lib/repositories/sales-order.repository";

import type {
  SalesInvoiceDocument,
  SalesInvoiceDisplaySettings,
  SalesInvoiceTemplateType,
} from "@/lib/repositories/sales-invoice.repository";

import { updateSalesInvoicePresentationAction } from "./actions";

/* =========================================================
 * Props
 * ========================================================= */

interface SalesInvoiceWorkspaceProps {
  salesOrder: SalesOrderDetails;
  companyProfile: CompanyProfile;
  invoice: SalesInvoiceDocument;
}

/* =========================================================
 * Display settings
 * ========================================================= */

const DEFAULT_UAE_TAX_SETTINGS: SalesInvoiceDisplaySettings = {
  show_company_trade_name: true,
  show_company_arabic_name: true,
  show_company_trn: true,
  show_company_license: false,
  show_company_contact: true,
  show_company_address: true,

  show_customer_name: true,
  show_customer_mark: false,

  show_customer_trn: true,
  show_customer_contact: true,
  show_billing_address: true,
  show_shipping_address: false,
  show_customer_reference: true,

  show_sku: true,
  show_unit: true,
  show_discount: true,
  show_vat: true,

  show_payment_status: true,
  show_payment_terms: true,
  show_delivery_terms: true,

  show_bank_details: false,
  show_customer_notes: true,
  show_footer: true,
};

const DEFAULT_SIMPLE_SETTINGS: SalesInvoiceDisplaySettings = {
  show_company_trade_name: true,
  show_company_arabic_name: false,
  show_company_trn: false,
  show_company_license: false,
  show_company_contact: true,
  show_company_address: true,

  show_customer_name: true,
  show_customer_mark: false,

  show_customer_trn: false,
  show_customer_contact: true,
  show_billing_address: true,
  show_shipping_address: false,
  show_customer_reference: true,

  show_sku: true,
  show_unit: true,
  show_discount: false,
  show_vat: false,

  show_payment_status: true,
  show_payment_terms: true,
  show_delivery_terms: false,

  show_bank_details: false,
  show_customer_notes: true,
  show_footer: true,
};

const DEFAULT_EXPORT_SETTINGS: SalesInvoiceDisplaySettings = {
  show_company_trade_name: true,
  show_company_arabic_name: false,
  show_company_trn: false,
  show_company_license: true,
  show_company_contact: true,
  show_company_address: true,

  show_customer_name: true,
  show_customer_mark: false,

  show_customer_trn: false,
  show_customer_contact: true,
  show_billing_address: true,
  show_shipping_address: true,
  show_customer_reference: true,

  show_sku: true,
  show_unit: true,
  show_discount: true,
  show_vat: false,

  show_payment_status: true,
  show_payment_terms: true,
  show_delivery_terms: true,

  show_bank_details: true,
  show_customer_notes: true,
  show_footer: true,
};

function presetSettings(
  template: SalesInvoiceTemplateType,
): SalesInvoiceDisplaySettings {
  if (template === "simple") {
    return {
      ...DEFAULT_SIMPLE_SETTINGS,
    };
  }

  if (template === "export") {
    return {
      ...DEFAULT_EXPORT_SETTINGS,
    };
  }

  return {
    ...DEFAULT_UAE_TAX_SETTINGS,
  };
}

function initialSettings(
  invoice: SalesInvoiceDocument,
): SalesInvoiceDisplaySettings {
  const defaults = presetSettings(invoice.template_type);

  return {
    ...defaults,
    ...invoice.display_settings,
  };
}

/* =========================================================
 * Formatting
 * ========================================================= */

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMoney(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: currencyCode || "AED",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode || "AED"} ${Number(value).toFixed(2)}`;
  }
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 4,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function addressLines(address: SalesOrderAddress | null): string[] {
  if (!address) {
    return [];
  }

  const cityLine = [address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(", ");

  return [
    address.address_name,
    address.address_line_1,
    address.address_line_2,
    cityLine || null,
    address.country,
  ].filter((value): value is string => Boolean(value));
}

function companyAddressLines(profile: CompanyProfile): string[] {
  const cityLine = [profile.city, profile.state, profile.postal_code]
    .filter(Boolean)
    .join(", ");

  return [
    profile.address_line_1,
    profile.address_line_2,
    cityLine || null,
    profile.country,
    profile.po_box ? `P.O. Box ${profile.po_box}` : null,
  ].filter((value): value is string => Boolean(value));
}

function snapshotObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function snapshotString(
  object: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = object?.[key];

  return typeof value === "string" ? value : null;
}

function snapshotAddressLines(
  address: Record<string, unknown> | null,
): string[] {
  if (!address) {
    return [];
  }

  const cityLine = [
    snapshotString(address, "city"),
    snapshotString(address, "state"),
    snapshotString(address, "postal_code"),
  ]
    .filter(Boolean)
    .join(", ");

  return [
    snapshotString(address, "address_name"),
    snapshotString(address, "address_line_1"),
    snapshotString(address, "address_line_2"),
    cityLine || null,
    snapshotString(address, "country"),
  ].filter((value): value is string => Boolean(value));
}

/* =========================================================
 * Main workspace
 * ========================================================= */

export function SalesInvoiceWorkspace({
  salesOrder,
  companyProfile,
  invoice,
}: SalesInvoiceWorkspaceProps) {
  const [templateType, setTemplateType] = useState<SalesInvoiceTemplateType>(
    invoice.template_type,
  );

  const [invoiceDate, setInvoiceDate] = useState(invoice.invoice_date);

  const [customerDisplayName, setCustomerDisplayName] = useState(
    invoice.customer_display_name ?? "",
  );

  const [customerMark, setCustomerMark] = useState(invoice.customer_mark ?? "");

  const [settings, setSettings] = useState<SalesInvoiceDisplaySettings>(() =>
    initialSettings(invoice),
  );

  const sellerSnapshot = snapshotObject(invoice.seller_snapshot);

  const buyerSnapshot = snapshotObject(invoice.buyer_snapshot);

  const buyerCustomer = snapshotObject(buyerSnapshot?.customer);

  const buyerContact = snapshotObject(buyerSnapshot?.customer_contact);

  const buyerBillingAddress = snapshotObject(buyerSnapshot?.billing_address);

  const buyerShippingAddress = snapshotObject(buyerSnapshot?.shipping_address);

  const buyerCompanyName = snapshotString(buyerCustomer, "company_name");

  const buyerDisplayName = snapshotString(buyerCustomer, "display_name");

  const buyerTrn = snapshotString(buyerCustomer, "tax_registration_number");

  const buyerContactName = snapshotString(buyerContact, "contact_name");

  const buyerPhone =
    snapshotString(buyerContact, "phone") ||
    snapshotString(buyerCustomer, "phone");

  const buyerEmail =
    snapshotString(buyerContact, "email") ||
    snapshotString(buyerCustomer, "email");

  const originalCustomerName =
    buyerCompanyName || buyerDisplayName || "Customer";

  const invoiceCustomerName =
    customerDisplayName.trim() || originalCustomerName;

  const historicalCompanyProfile: CompanyProfile = {
    ...companyProfile,

    legal_name:
      snapshotString(sellerSnapshot, "legal_name") ?? companyProfile.legal_name,

    trade_name: snapshotString(sellerSnapshot, "trade_name"),

    arabic_name: snapshotString(sellerSnapshot, "arabic_name"),

    tax_registration_number: snapshotString(
      sellerSnapshot,
      "tax_registration_number",
    ),

    trade_license_number: snapshotString(
      sellerSnapshot,
      "trade_license_number",
    ),

    phone: snapshotString(sellerSnapshot, "phone"),

    whatsapp: snapshotString(sellerSnapshot, "whatsapp"),

    email: snapshotString(sellerSnapshot, "email"),

    website: snapshotString(sellerSnapshot, "website"),

    address_line_1: snapshotString(sellerSnapshot, "address_line_1"),

    address_line_2: snapshotString(sellerSnapshot, "address_line_2"),

    city: snapshotString(sellerSnapshot, "city"),

    state: snapshotString(sellerSnapshot, "state"),

    country:
      snapshotString(sellerSnapshot, "country") ?? companyProfile.country,

    postal_code: snapshotString(sellerSnapshot, "postal_code"),

    po_box: snapshotString(sellerSnapshot, "po_box"),

    logo_path: snapshotString(sellerSnapshot, "logo_path"),

    document_footer: snapshotString(sellerSnapshot, "document_footer"),

    bank_name: snapshotString(sellerSnapshot, "bank_name"),

    bank_account_name: snapshotString(sellerSnapshot, "bank_account_name"),

    bank_account_number: snapshotString(sellerSnapshot, "bank_account_number"),

    bank_iban: snapshotString(sellerSnapshot, "bank_iban"),

    bank_swift_code: snapshotString(sellerSnapshot, "bank_swift_code"),
  };

  const sellerAddress = companyAddressLines(historicalCompanyProfile);
  const billingAddress = snapshotAddressLines(buyerBillingAddress);

  const shippingAddress = snapshotAddressLines(buyerShippingAddress);

  function setting(key: string): boolean {
    return settings[key] ?? false;
  }

  function toggleSetting(key: string) {
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function applyPreset(value: SalesInvoiceTemplateType) {
    setTemplateType(value);
    setSettings(presetSettings(value));
  }

  const saveAction = updateSalesInvoicePresentationAction.bind(
    null,
    salesOrder.id,
    invoice.id,
  );

  const documentTitle =
    templateType === "uae_tax"
      ? "TAX INVOICE"
      : templateType === "export"
        ? "EXPORT INVOICE"
        : "INVOICE";

  const showDiscount = setting("show_discount");

  const showVat = setting("show_vat");

  return (
    <div className="min-h-screen bg-slate-100 print:min-h-0 print:bg-white">
      {/* =============================================
                Toolbar
            ============================================== */}

      <div className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/sales/orders/${salesOrder.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="size-4" />
              Sales Order
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-slate-500" />

                <h1 className="font-semibold text-slate-950">
                  {invoice.invoice_number}
                </h1>
              </div>

              <p className="mt-0.5 text-xs text-slate-500">
                Source: {salesOrder.order_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PrintButton label="Print / PDF" />
          </div>
        </div>
      </div>

      {/* =============================================
                Workspace
            ============================================== */}

      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-5 p-5 xl:grid-cols-[330px_minmax(0,1fr)] print:block print:max-w-none print:p-0">
        {/* =========================================
                    Settings Panel
                ========================================== */}

        <aside className="no-print self-start rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-5">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <Settings2 className="size-4 text-slate-500" />

              <h2 className="font-semibold text-slate-950">Invoice Settings</h2>
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Controls only how this invoice is displayed. Accounting data
              remains unchanged.
            </p>
          </div>

          <form
            action={saveAction}
            className="max-h-[calc(100vh-150px)] overflow-y-auto"
          >
            {/* Template */}

            <div className="border-b border-slate-100 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Format
              </p>

              <input type="hidden" name="template_type" value={templateType} />

              <input type="hidden" name="invoice_date" value={invoiceDate} />

              <div className="grid gap-2">
                <TemplateButton
                  active={templateType === "uae_tax"}
                  title="UAE Tax Invoice"
                  description="TRN and VAT presentation"
                  onClick={() => applyPreset("uae_tax")}
                />

                <TemplateButton
                  active={templateType === "simple"}
                  title="Simple Invoice"
                  description="Clean customer invoice"
                  onClick={() => applyPreset("simple")}
                />

                <TemplateButton
                  active={templateType === "export"}
                  title="Export Invoice"
                  description="Overseas / non-VAT presentation"
                  onClick={() => applyPreset("export")}
                />
              </div>
            </div>

            {/* Invoice Date */}

            <div className="border-b border-slate-100 p-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invoice Date
              </label>

              <input
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            {/* Seller */}

            <SettingsGroup title="Company">
              <SettingToggle
                name="show_company_trade_name"
                label="Trade Name"
                checked={setting("show_company_trade_name")}
                onChange={() => toggleSetting("show_company_trade_name")}
              />

              <SettingToggle
                name="show_company_arabic_name"
                label="Arabic Name"
                checked={setting("show_company_arabic_name")}
                onChange={() => toggleSetting("show_company_arabic_name")}
              />

              <SettingToggle
                name="show_company_trn"
                label="Company TRN"
                checked={setting("show_company_trn")}
                onChange={() => toggleSetting("show_company_trn")}
                disabled={templateType === "uae_tax"}
              />

              <SettingToggle
                name="show_company_license"
                label="Trade License"
                checked={setting("show_company_license")}
                onChange={() => toggleSetting("show_company_license")}
              />

              <SettingToggle
                name="show_company_contact"
                label="Contact Details"
                checked={setting("show_company_contact")}
                onChange={() => toggleSetting("show_company_contact")}
              />

              <SettingToggle
                name="show_company_address"
                label="Company Address"
                checked={setting("show_company_address")}
                onChange={() => toggleSetting("show_company_address")}
                disabled={templateType === "uae_tax"}
              />
            </SettingsGroup>

            {/* Customer */}

            <SettingsGroup title="Customer">
              <SettingToggle
                name="show_customer_name"
                label="Show Company / Customer Name"
                checked={setting("show_customer_name")}
                onChange={() => toggleSetting("show_customer_name")}
                disabled={templateType === "uae_tax"}
              />

              <div className="px-2 py-2">
                <label className="block text-xs font-medium text-slate-500">
                  Invoice Customer Name
                </label>

                <input
                  type="text"
                  name="customer_display_name"
                  value={customerDisplayName}
                  onChange={(event) =>
                    setCustomerDisplayName(event.target.value)
                  }
                  placeholder={originalCustomerName}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                />

                <p className="mt-1 text-[11px] leading-4 text-slate-400">
                  Example: CASH INVOICE, CASH CUSTOMER, or a custom buyer name.
                </p>
              </div>

              <SettingToggle
                name="show_customer_mark"
                label="Show Customer Mark"
                checked={setting("show_customer_mark")}
                onChange={() => toggleSetting("show_customer_mark")}
              />

              <div className="px-2 py-2">
                <label className="block text-xs font-medium text-slate-500">
                  Customer Mark
                </label>

                <input
                  type="text"
                  name="customer_mark"
                  value={customerMark}
                  onChange={(event) => setCustomerMark(event.target.value)}
                  placeholder="Example: MARK A-125"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                />
              </div>
              <SettingToggle
                name="show_customer_trn"
                label="Customer TRN"
                checked={setting("show_customer_trn")}
                onChange={() => toggleSetting("show_customer_trn")}
                disabled={templateType === "uae_tax" && Boolean(buyerTrn)}
              />

              <SettingToggle
                name="show_customer_contact"
                label="Contact Details"
                checked={setting("show_customer_contact")}
                onChange={() => toggleSetting("show_customer_contact")}
              />

              <SettingToggle
                name="show_billing_address"
                label="Billing Address"
                checked={setting("show_billing_address")}
                onChange={() => toggleSetting("show_billing_address")}
                disabled={templateType === "uae_tax"}
              />

              <SettingToggle
                name="show_shipping_address"
                label="Delivery Address"
                checked={setting("show_shipping_address")}
                onChange={() => toggleSetting("show_shipping_address")}
              />

              <SettingToggle
                name="show_customer_reference"
                label="Customer Reference"
                checked={setting("show_customer_reference")}
                onChange={() => toggleSetting("show_customer_reference")}
              />
            </SettingsGroup>

            {/* Items */}

            <SettingsGroup title="Product Table">
              <SettingToggle
                name="show_sku"
                label="SKU"
                checked={setting("show_sku")}
                onChange={() => toggleSetting("show_sku")}
              />

              <SettingToggle
                name="show_unit"
                label="Unit"
                checked={setting("show_unit")}
                onChange={() => toggleSetting("show_unit")}
              />

              <SettingToggle
                name="show_discount"
                label="Discount"
                checked={setting("show_discount")}
                onChange={() => toggleSetting("show_discount")}
              />

              <SettingToggle
                name="show_vat"
                label="VAT"
                checked={setting("show_vat")}
                onChange={() => toggleSetting("show_vat")}
                disabled={templateType === "uae_tax"}
              />
            </SettingsGroup>

            {/* Other */}

            <SettingsGroup title="Other Details">
              <SettingToggle
                name="show_payment_status"
                label="Payment Status"
                checked={setting("show_payment_status")}
                onChange={() => toggleSetting("show_payment_status")}
              />

              <SettingToggle
                name="show_payment_terms"
                label="Payment Terms"
                checked={setting("show_payment_terms")}
                onChange={() => toggleSetting("show_payment_terms")}
              />

              <SettingToggle
                name="show_delivery_terms"
                label="Delivery Terms"
                checked={setting("show_delivery_terms")}
                onChange={() => toggleSetting("show_delivery_terms")}
              />

              <SettingToggle
                name="show_bank_details"
                label="Bank Details"
                checked={setting("show_bank_details")}
                onChange={() => toggleSetting("show_bank_details")}
              />

              <SettingToggle
                name="show_customer_notes"
                label="Customer Notes"
                checked={setting("show_customer_notes")}
                onChange={() => toggleSetting("show_customer_notes")}
              />

              <SettingToggle
                name="show_footer"
                label="Document Footer"
                checked={setting("show_footer")}
                onChange={() => toggleSetting("show_footer")}
              />
            </SettingsGroup>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4">
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Check className="size-4" />
                Save Invoice Settings
              </button>
            </div>
          </form>
        </aside>

        {/* =========================================
                    Invoice Preview
                ========================================== */}

        <main className="min-w-0 overflow-auto print:overflow-visible">
          <article className="invoice-sheet mx-auto min-h-[297mm] w-[210mm] max-w-full bg-white p-[14mm] text-slate-900 shadow-sm print:min-h-0 print:w-full print:max-w-none print:p-[10mm] print:shadow-none">
            {/* Header */}

            <header className="flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-6">
              <div className="max-w-[60%]">
                {historicalCompanyProfile.logo_path ? (
                  <img
                    src={historicalCompanyProfile.logo_path}
                    alt={historicalCompanyProfile.legal_name}
                    className="mb-4 max-h-16 max-w-52 object-contain object-left"
                  />
                ) : null}

                <h2 className="text-xl font-bold leading-tight text-slate-950">
                  {historicalCompanyProfile.legal_name}
                </h2>

                {setting("show_company_trade_name") &&
                historicalCompanyProfile.trade_name ? (
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {historicalCompanyProfile.trade_name}
                  </p>
                ) : null}

                {setting("show_company_arabic_name") &&
                historicalCompanyProfile.arabic_name ? (
                  <p
                    dir="rtl"
                    className="mt-1 text-right text-sm font-semibold text-slate-700"
                  >
                    {historicalCompanyProfile.arabic_name}
                  </p>
                ) : null}

                {setting("show_company_address") && sellerAddress.length > 0 ? (
                  <div className="mt-3 text-xs leading-5 text-slate-600">
                    {sellerAddress.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                ) : null}

                {setting("show_company_contact") ? (
                  <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                    {historicalCompanyProfile.phone ? (
                      <div>Tel: {historicalCompanyProfile.phone}</div>
                    ) : null}

                    {historicalCompanyProfile.whatsapp ? (
                      <div>WhatsApp: {historicalCompanyProfile.whatsapp}</div>
                    ) : null}

                    {historicalCompanyProfile.email ? (
                      <div>Email: {historicalCompanyProfile.email}</div>
                    ) : null}

                    {historicalCompanyProfile.website ? (
                      <div>Web: {historicalCompanyProfile.website}</div>
                    ) : null}
                  </div>
                ) : null}

                {setting("show_company_trn") &&
                historicalCompanyProfile.tax_registration_number ? (
                  <p className="mt-2 text-xs font-semibold text-slate-800">
                    TRN: {historicalCompanyProfile.tax_registration_number}
                  </p>
                ) : null}

                {setting("show_company_license") &&
                historicalCompanyProfile.trade_license_number ? (
                  <p className="mt-1 text-xs text-slate-600">
                    Trade License:{" "}
                    {historicalCompanyProfile.trade_license_number}
                  </p>
                ) : null}
              </div>

              <div className="text-right">
                <h1 className="text-2xl font-bold tracking-wide text-slate-950">
                  {documentTitle}
                </h1>

                <dl className="mt-5 grid grid-cols-[auto_auto] gap-x-5 gap-y-2 text-xs">
                  <dt className="text-slate-500">Invoice No.</dt>

                  <dd className="font-semibold text-slate-950">
                    {invoice.invoice_number}
                  </dd>

                  <dt className="text-slate-500">Invoice Date</dt>

                  <dd className="font-medium">{formatDate(invoiceDate)}</dd>

                  <dt className="text-slate-500">Sales Order</dt>

                  <dd className="font-medium">{salesOrder.order_number}</dd>

                  <dt className="text-slate-500">Order Date</dt>

                  <dd className="font-medium">
                    {formatDate(salesOrder.order_date)}
                  </dd>
                </dl>
              </div>
            </header>

            {/* Customer */}

            <section className="grid grid-cols-2 gap-8 border-b border-slate-200 py-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Bill To
                </p>

                {setting("show_customer_name") ? (
                  <h3 className="mt-2 text-sm font-bold text-slate-950">
                    {invoiceCustomerName}
                  </h3>
                ) : null}

                {setting("show_customer_mark") && customerMark.trim() ? (
                  <p className="mt-2 text-xs font-semibold text-slate-700">
                    Mark: {customerMark.trim()}
                  </p>
                ) : null}

                {setting("show_customer_name") &&
                buyerCompanyName &&
                buyerDisplayName &&
                buyerDisplayName !== buyerCompanyName ? (
                  <p className="mt-0.5 text-xs text-slate-600">
                    {buyerDisplayName}
                  </p>
                ) : null}

                {setting("show_customer_trn") && buyerTrn ? (
                  <p className="mt-2 text-xs font-medium text-slate-700">
                    TRN: {buyerTrn}
                  </p>
                ) : null}

                {setting("show_customer_contact") ? (
                  <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                    {buyerContactName ? <div>{buyerContactName}</div> : null}
                    {buyerPhone ? <div>Tel: {buyerPhone}</div> : null}
                    {buyerEmail ? <div>Email: {buyerEmail}</div> : null}
                  </div>
                ) : null}

                {setting("show_billing_address") &&
                billingAddress.length > 0 ? (
                  <div className="mt-3 text-xs leading-5 text-slate-600">
                    {billingAddress.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                {setting("show_shipping_address") ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Deliver To
                    </p>

                    {shippingAddress.length > 0 ? (
                      <div className="mt-2 text-xs leading-5 text-slate-600">
                        {shippingAddress.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">
                        Same as billing address
                      </p>
                    )}
                  </>
                ) : null}

                {setting("show_customer_reference") &&
                salesOrder.customer_reference ? (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Customer Reference
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-700">
                      {salesOrder.customer_reference}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            {/* Items */}

            <section className="py-6">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-y border-slate-300 bg-slate-50">
                    <th className="w-8 px-2 py-2.5 text-left font-semibold text-slate-600">
                      #
                    </th>

                    {setting("show_sku") ? (
                      <th className="px-2 py-2.5 text-left font-semibold text-slate-600">
                        SKU
                      </th>
                    ) : null}

                    <th className="px-2 py-2.5 text-left font-semibold text-slate-600">
                      Description
                    </th>

                    {setting("show_unit") ? (
                      <th className="px-2 py-2.5 text-center font-semibold text-slate-600">
                        Unit
                      </th>
                    ) : null}

                    <th className="px-2 py-2.5 text-right font-semibold text-slate-600">
                      Qty
                    </th>

                    <th className="px-2 py-2.5 text-right font-semibold text-slate-600">
                      Unit Price
                    </th>

                    {showDiscount ? (
                      <th className="px-2 py-2.5 text-right font-semibold text-slate-600">
                        Disc.
                      </th>
                    ) : null}

                    {showVat ? (
                      <th className="px-2 py-2.5 text-right font-semibold text-slate-600">
                        VAT
                      </th>
                    ) : null}

                    <th className="px-2 py-2.5 text-right font-semibold text-slate-600">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {salesOrder.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="px-2 py-3 text-slate-500">
                        {item.line_number}
                      </td>

                      {setting("show_sku") ? (
                        <td className="px-2 py-3 text-slate-600">
                          {item.sku || item.product?.sku || "—"}
                        </td>
                      ) : null}

                      <td className="px-2 py-3">
                        <div className="font-medium text-slate-900">
                          {item.item_name}
                        </div>

                        {item.description ? (
                          <div className="mt-1 whitespace-pre-line text-[11px] leading-4 text-slate-500">
                            {item.description}
                          </div>
                        ) : null}
                      </td>

                      {setting("show_unit") ? (
                        <td className="px-2 py-3 text-center text-slate-600">
                          {item.unit?.short_name || "—"}
                        </td>
                      ) : null}

                      <td className="px-2 py-3 text-right tabular-nums">
                        {formatQuantity(item.quantity)}
                      </td>

                      <td className="px-2 py-3 text-right tabular-nums">
                        {formatMoney(item.unit_price, salesOrder.currency_code)}
                      </td>

                      {showDiscount ? (
                        <td className="px-2 py-3 text-right tabular-nums">
                          {item.discount_percentage > 0
                            ? formatPercentage(item.discount_percentage)
                            : "—"}
                        </td>
                      ) : null}

                      {showVat ? (
                        <td className="px-2 py-3 text-right tabular-nums">
                          {formatPercentage(item.tax_percentage)}
                        </td>
                      ) : null}

                      <td className="px-2 py-3 text-right font-medium tabular-nums">
                        {formatMoney(item.line_total, salesOrder.currency_code)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Terms + Totals */}

            <section className="grid grid-cols-[1fr_280px] gap-10 border-t border-slate-200 pt-5">
              <div className="space-y-4 text-xs">
                {setting("show_payment_status") ? (
                  <DetailBlock
                    label="Payment Status"
                    value={salesOrder.payment_status.replaceAll("_", " ")}
                  />
                ) : null}

                {setting("show_payment_terms") &&
                (salesOrder.payment_terms ||
                  salesOrder.payment_terms_days > 0) ? (
                  <DetailBlock
                    label="Payment Terms"
                    value={
                      salesOrder.payment_terms ||
                      `${salesOrder.payment_terms_days} day${
                        salesOrder.payment_terms_days === 1 ? "" : "s"
                      }`
                    }
                  />
                ) : null}

                {setting("show_delivery_terms") && salesOrder.delivery_terms ? (
                  <DetailBlock
                    label="Delivery Terms"
                    value={salesOrder.delivery_terms}
                  />
                ) : null}

                {setting("show_customer_notes") && salesOrder.customer_notes ? (
                  <DetailBlock
                    label="Notes"
                    value={salesOrder.customer_notes}
                  />
                ) : null}
              </div>

              <div>
                <TotalRow
                  label="Subtotal"
                  value={formatMoney(
                    salesOrder.subtotal,
                    salesOrder.currency_code,
                  )}
                />

                {showDiscount && salesOrder.discount_amount > 0 ? (
                  <TotalRow
                    label="Discount"
                    value={`- ${formatMoney(
                      salesOrder.discount_amount,
                      salesOrder.currency_code,
                    )}`}
                  />
                ) : null}

                {salesOrder.shipping_amount > 0 ? (
                  <TotalRow
                    label="Shipping"
                    value={formatMoney(
                      salesOrder.shipping_amount,
                      salesOrder.currency_code,
                    )}
                  />
                ) : null}

                {showVat ? (
                  <TotalRow
                    label="VAT"
                    value={formatMoney(
                      salesOrder.tax_amount,
                      salesOrder.currency_code,
                    )}
                  />
                ) : null}

                <div className="mt-2 flex items-center justify-between border-y-2 border-slate-900 py-3">
                  <span className="text-sm font-bold text-slate-950">
                    Total
                  </span>

                  <span className="text-base font-bold tabular-nums text-slate-950">
                    {formatMoney(
                      salesOrder.grand_total,
                      salesOrder.currency_code,
                    )}
                  </span>
                </div>

                {setting("show_payment_status") &&
                salesOrder.paid_amount > 0 ? (
                  <>
                    <TotalRow
                      label="Paid"
                      value={formatMoney(
                        salesOrder.paid_amount,
                        salesOrder.currency_code,
                      )}
                    />

                    <TotalRow
                      label="Balance Due"
                      value={formatMoney(
                        salesOrder.balance_due,
                        salesOrder.currency_code,
                      )}
                      strong
                    />
                  </>
                ) : null}
              </div>
            </section>

            {/* Bank Details */}

            {setting("show_bank_details") &&
            (historicalCompanyProfile.bank_name ||
              historicalCompanyProfile.bank_iban ||
              historicalCompanyProfile.bank_account_number) ? (
              <section className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Bank Details
                </p>

                <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                  {historicalCompanyProfile.bank_name ? (
                    <BankRow
                      label="Bank"
                      value={historicalCompanyProfile.bank_name}
                    />
                  ) : null}

                  {historicalCompanyProfile.bank_account_name ? (
                    <BankRow
                      label="Account Name"
                      value={historicalCompanyProfile.bank_account_name}
                    />
                  ) : null}

                  {historicalCompanyProfile.bank_account_number ? (
                    <BankRow
                      label="Account No."
                      value={historicalCompanyProfile.bank_account_number}
                    />
                  ) : null}

                  {historicalCompanyProfile.bank_iban ? (
                    <BankRow
                      label="IBAN"
                      value={historicalCompanyProfile.bank_iban}
                    />
                  ) : null}

                  {historicalCompanyProfile.bank_swift_code ? (
                    <BankRow
                      label="SWIFT"
                      value={historicalCompanyProfile.bank_swift_code}
                    />
                  ) : null}
                </div>
              </section>
            ) : null}

            {/* Footer */}

            {setting("show_footer") &&
            historicalCompanyProfile.document_footer ? (
              <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-[10px] leading-4 text-slate-500">
                {historicalCompanyProfile.document_footer}
              </footer>
            ) : null}

            {invoice.status === "cancelled" ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="-rotate-12 border-4 border-slate-300 px-10 py-4 text-5xl font-black uppercase tracking-[0.2em] text-slate-200">
                  Cancelled
                </div>
              </div>
            ) : null}
          </article>
        </main>
      </div>

      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          html,
          body {
            background: white !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .invoice-sheet {
            position: relative;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================================
 * Settings UI
 * ========================================================= */

function TemplateButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
        active
          ? "border-slate-900 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div>
        <div className="text-sm font-semibold">{title}</div>

        <div
          className={`mt-0.5 text-[11px] ${
            active ? "text-slate-300" : "text-slate-500"
          }`}
        >
          {description}
        </div>
      </div>

      {active ? <Check className="size-4" /> : null}
    </button>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SettingToggle({
  name,
  label,
  checked,
  onChange,
  disabled = false,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-lg px-2 py-2 ${
        disabled
          ? "cursor-not-allowed bg-slate-50"
          : "cursor-pointer hover:bg-slate-50"
      }`}
    >
      <span
        className={`text-sm ${
          disabled ? "font-medium text-slate-500" : "text-slate-700"
        }`}
      >
        {label}
        {disabled ? (
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Required
          </span>
        ) : null}
      </span>

      <input type="hidden" name={name} value={checked ? "true" : "false"} />

      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="size-4 rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

/* =========================================================
 * Invoice UI
 * ========================================================= */

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-line capitalize leading-5 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-1.5 text-xs ${
        strong ? "font-semibold text-slate-950" : "text-slate-600"
      }`}
    >
      <span>{label}</span>

      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[95px_1fr] gap-2">
      <span className="text-slate-500">{label}</span>

      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
