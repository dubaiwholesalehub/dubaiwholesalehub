import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

import { getSalesOrderById } from "@/lib/repositories/sales-order.repository";

import { getCompanyProfile } from "@/lib/repositories/company-profile.repository";

import { getOrCreateSalesInvoice } from "@/lib/repositories/sales-invoice.repository";

import { SalesInvoiceWorkspace } from "./SalesInvoiceWorkspace";

interface SalesInvoicePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SalesInvoicePage({
  params,
}: SalesInvoicePageProps) {
  const { id } = await params;

  /*
   * Keep these sequential.
   *
   * We deliberately avoid Promise.all here because this
   * application has previously experienced intermittent
   * Supabase fetch failures with parallel server requests.
   */
  const salesOrder = await getSalesOrderById(id);

  if (!salesOrder) {
    notFound();
  }

  const companyProfile = await getCompanyProfile();

  if (!companyProfile) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Link
          href={`/admin/sales/orders/${id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Back to Sales Order
        </Link>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
              <FileText className="size-5" />
            </div>

            <div>
              <h1 className="text-lg font-semibold text-slate-950">
                Company Profile Required
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                Complete the Company Profile before generating an invoice so the
                seller information comes from one authoritative source.
              </p>

              <Link
                href="/admin/settings/company-profile"
                className="mt-4 inline-flex h-9 items-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
              >
                Open Company Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * Opening the invoice for the first time creates its
   * permanent document identity.
   *
   * Subsequent visits return the same invoice because
   * sales_order_id is unique.
   */
  const invoice = await getOrCreateSalesInvoice(id, {
    salesOrder,
    companyProfile,
  });

  return (
    <SalesInvoiceWorkspace
      salesOrder={salesOrder}
      companyProfile={companyProfile}
      invoice={invoice}
    />
  );
}
