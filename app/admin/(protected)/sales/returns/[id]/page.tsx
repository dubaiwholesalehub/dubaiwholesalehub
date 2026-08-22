import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, RotateCcw } from "lucide-react";

import { getSalesReturnById } from "@/lib/repositories/sales-return.repository";

import {
  approveSalesReturnAction,
  receiveSalesReturnAction,
  postSalesReturnAction,
} from "./actions";

interface SalesReturnDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SalesReturnDetailPage({
  params,
}: SalesReturnDetailPageProps) {
  const { id } = await params;

  const salesReturn = await getSalesReturnById(id);

  if (!salesReturn) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/sales/returns"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Sales Returns
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <div className="rounded-lg bg-orange-50 p-2 text-orange-700">
            <RotateCcw className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              {salesReturn.return_number}
            </h1>

            <p className="mt-1 text-sm text-slate-500">{salesReturn.reason}</p>
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Status" value={salesReturn.status} />

        <InfoCard
          label="Customer"
          value={salesReturn.customer?.display_name ?? "Unknown"}
        />

        <InfoCard
          label="Sales Order"
          value={salesReturn.sales_order?.order_number ?? "Unavailable"}
        />

        <InfoCard
          label="Return Value"
          value={`${salesReturn.currency_code} ${salesReturn.grand_total.toFixed(2)}`}
        />
      </section>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold text-slate-950">Return Items</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Line</th>

                <th className="px-4 py-3 text-left">Item</th>

                <th className="px-4 py-3 text-right">Qty</th>

                <th className="px-4 py-3 text-right">Unit Price</th>

                <th className="px-4 py-3 text-right">Total</th>

                <th className="px-4 py-3 text-left">Condition</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {salesReturn.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4">{item.line_number}</td>

                  <td className="px-4 py-4">
                    <div className="font-medium">{item.item_name}</div>

                    {item.sku ? (
                      <div className="mt-1 text-xs text-slate-500">
                        {item.sku}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-4 text-right">
                    {item.quantity_returned}
                  </td>

                  <td className="px-4 py-4 text-right">
                    {salesReturn.currency_code} {item.unit_price.toFixed(2)}
                  </td>

                  <td className="px-4 py-4 text-right font-semibold">
                    {salesReturn.currency_code} {item.line_total.toFixed(2)}
                  </td>

                  <td className="px-4 py-4 capitalize">{item.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Return Workflow
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Current status:{" "}
              <span className="font-medium capitalize text-slate-900">
                {salesReturn.status}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {salesReturn.status === "draft" ? (
              <form action={approveSalesReturnAction}>
                <input
                  type="hidden"
                  name="salesReturnId"
                  value={salesReturn.id}
                />

                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Approve Return
                </button>
              </form>
            ) : null}

            {salesReturn.status === "approved" ? (
              <form action={receiveSalesReturnAction}>
                <input
                  type="hidden"
                  name="salesReturnId"
                  value={salesReturn.id}
                />

                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  Receive Inventory
                </button>
              </form>
            ) : null}

            {salesReturn.status === "received" ? (
              <form action={postSalesReturnAction}>
                <input
                  type="hidden"
                  name="salesReturnId"
                  value={salesReturn.id}
                />

                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Post to GL
                </button>
              </form>
            ) : null}

            {salesReturn.status === "posted" ? (
              <span className="inline-flex h-10 items-center rounded-md border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700">
                Fully Posted
              </span>
            ) : null}

            {salesReturn.status === "cancelled" ? (
              <span className="inline-flex h-10 items-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700">
                Cancelled
              </span>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 font-semibold text-slate-950">{value}</p>
    </div>
  );
}
