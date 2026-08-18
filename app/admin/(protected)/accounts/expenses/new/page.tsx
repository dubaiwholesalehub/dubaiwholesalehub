import {
  ArrowLeft,
  ReceiptText,
} from "lucide-react";

import Link from "next/link";

import {
  createExpenseAction,
} from "../actions";

import {
  getExpenseCategoryOptions,
  getFinancialAccountOptions,
} from "@/lib/repositories/expense.repository";

import {
  getCustomerLookupOptions,
} from "@/lib/repositories/customer.repository";

import {
  getActiveSupplierOptions,
} from "@/lib/repositories/supplier.repository";

import {
  getWarehouseLookupOptions,
} from "@/lib/repositories/warehouse.repository";

import {
  createClient,
} from "@/lib/supabase/server";


export default async function NewExpensePage() {
  const supabase =
    await createClient();

  const [
    categories,
    accounts,
    customers,
    suppliers,
    warehouses,
    countriesResult,
    salesOrdersResult,
  ] =
    await Promise.all([
      getExpenseCategoryOptions(),

      getFinancialAccountOptions(),

      getCustomerLookupOptions(),

      getActiveSupplierOptions(),

      getWarehouseLookupOptions(),

      supabase
        .from(
          "countries",
        )
        .select(
          "id, name",
        )
        .eq(
          "is_active",
          true,
        )
        .order(
          "name",
        ),

      supabase
        .from(
          "sales_orders",
        )
        .select(`
          id,
          order_number,
          customer_id,
          grand_total
        `)
        .neq(
          "status",
          "draft",
        )
        .neq(
          "status",
          "cancelled",
        )
        .order(
          "order_date",
          {
            ascending: false,
          },
        )
        .limit(
          200,
        ),
    ]);


  const countries =
    countriesResult.data ??
    [];

  const salesOrders =
    salesOrdersResult.data ??
    [];


  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <Link
          href="/admin/accounts/expenses"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />

          Expenses
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <ReceiptText className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              New Expense
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Record an operating or direct expense with VAT, payment account and optional profitability allocation.
            </p>
          </div>
        </div>
      </div>


      <form
        action={
          createExpenseAction
        }
        className="space-y-6"
      >
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="font-semibold">
            Expense Information
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Expense Date">
              <input
                type="date"
                name="expenseDate"
                required
                defaultValue={
                  new Date()
                    .toISOString()
                    .slice(
                      0,
                      10,
                    )
                }
                className={
                  inputClass
                }
              />
            </Field>

            <Field label="Category">
              <select
                name="categoryId"
                required
                className={
                  inputClass
                }
              >
                <option value="">
                  Select category
                </option>

                {categories.map(
                  (
                    category,
                  ) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {category.name}
                      {" — "}
                      {
                        category.expenseType
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Payee">
              <input
                name="payeeName"
                placeholder="Person / company paid"
                className={
                  inputClass
                }
              />
            </Field>

            <Field label="Supplier">
              <select
                name="supplierId"
                className={
                  inputClass
                }
              >
                <option value="">
                  Optional supplier
                </option>

                {suppliers.map(
                  (
                    supplier,
                  ) => (
                    <option
                      key={
                        supplier.id
                      }
                      value={
                        supplier.id
                      }
                    >
                      {
                        supplier.company_name
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Paid From">
              <select
                name="financialAccountId"
                required
                className={
                  inputClass
                }
              >
                <option value="">
                  Select financial account
                </option>

                {accounts.map(
                  (
                    account,
                  ) => (
                    <option
                      key={
                        account.id
                      }
                      value={
                        account.id
                      }
                    >
                      {
                        account.accountName
                      }
                      {" — AED "}
                      {
                        account.currentBalance.toFixed(
                          2,
                        )
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Payment Method">
              <select
                name="paymentMethod"
                required
                defaultValue="cash"
                className={
                  inputClass
                }
              >
                <option value="cash">
                  Cash
                </option>

                <option value="bank">
                  Bank
                </option>

                <option value="card">
                  Card
                </option>

                <option value="cheque">
                  Cheque
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </Field>

            <Field label="Payment Reference">
              <input
                name="paymentReference"
                placeholder="Receipt / transfer / cheque reference"
                className={
                  inputClass
                }
              />
            </Field>
          </div>
        </section>


        <section className="rounded-2xl border bg-card p-6">
          <h2 className="font-semibold">
            Amount & VAT
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Net Amount">
              <input
                type="number"
                name="netAmount"
                min="0.01"
                step="0.01"
                required
                className={
                  inputClass
                }
              />
            </Field>

            <Field label="VAT Amount">
              <input
                type="number"
                name="taxAmount"
                min="0"
                step="0.01"
                defaultValue="0"
                required
                className={
                  inputClass
                }
              />
            </Field>

            <Field label="VAT Treatment">
              <select
                name="taxTreatment"
                defaultValue="no_vat"
                className={
                  inputClass
                }
              >
                <option value="standard_vat">
                  Standard VAT
                </option>

                <option value="no_vat">
                  No VAT
                </option>

                <option value="vat_pending">
                  VAT Pending
                </option>

                <option value="non_recoverable">
                  Non-Recoverable VAT
                </option>
              </select>
            </Field>

            <Field label="Supplier TRN">
              <input
                name="supplierTrn"
                className={
                  inputClass
                }
              />
            </Field>

            <Field label="Supplier Invoice No.">
              <input
                name="supplierInvoiceNumber"
                className={
                  inputClass
                }
              />
            </Field>

            <Field label="Supplier Invoice Date">
              <input
                type="date"
                name="supplierInvoiceDate"
                className={
                  inputClass
                }
              />
            </Field>

            <label className="flex items-center gap-3 rounded-xl border p-4">
              <input
                type="checkbox"
                name="taxInvoiceVerified"
              />

              <span className="text-sm font-medium">
                Tax invoice verified
              </span>
            </label>
          </div>
        </section>


        <section className="rounded-2xl border border-blue-100 bg-blue-50/30 p-6">
          <h2 className="font-semibold">
            Profitability Allocation
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Optional. Use these fields when the expense belongs directly to a customer, Sales Order, warehouse, channel or market.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Customer">
              <select
                name="customerId"
                className={
                  inputClass
                }
              >
                <option value="">
                  Not allocated
                </option>

                {customers.map(
                  (
                    customer,
                  ) => (
                    <option
                      key={
                        customer.id
                      }
                      value={
                        customer.id
                      }
                    >
                      {
                        customer.display_name
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Sales Order">
              <select
                name="salesOrderId"
                className={
                  inputClass
                }
              >
                <option value="">
                  Not allocated
                </option>

                {salesOrders.map(
                  (
                    order,
                  ) => (
                    <option
                      key={
                        order.id
                      }
                      value={
                        order.id
                      }
                    >
                      {
                        order.order_number
                      }
                      {" — AED "}
                      {
                        Number(
                          order.grand_total,
                        ).toFixed(
                          2,
                        )
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Warehouse">
              <select
                name="warehouseId"
                className={
                  inputClass
                }
              >
                <option value="">
                  Not allocated
                </option>

                {warehouses.map(
                  (
                    warehouse,
                  ) => (
                    <option
                      key={
                        warehouse.id
                      }
                      value={
                        warehouse.id
                      }
                    >
                      {
                        warehouse.code
                      }
                      {" — "}
                      {
                        warehouse.name
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Sales Channel">
              <select
                name="salesChannel"
                className={
                  inputClass
                }
              >
                <option value="">
                  Not allocated
                </option>

                <option value="internal">
                  Internal
                </option>

                <option value="hmshoponline">
                  HMShopOnline
                </option>

                <option value="dubaiwholesalehub">
                  Dubai Wholesale Hub
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </Field>

            <Field label="Market / Country">
              <select
                name="marketCountryId"
                className={
                  inputClass
                }
              >
                <option value="">
                  Not allocated
                </option>

                {countries.map(
                  (
                    country,
                  ) => (
                    <option
                      key={
                        country.id
                      }
                      value={
                        country.id
                      }
                    >
                      {
                        country.name
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Profitability Notes">
              <textarea
                name="profitabilityNotes"
                rows={3}
                placeholder="Example: Delivery expense directly related to SO-2026-000024"
                className={
                  textareaClass
                }
              />
            </Field>
          </div>
        </section>


        <section className="rounded-2xl border bg-card p-6">
          <Field label="Internal Notes">
            <textarea
              name="notes"
              rows={4}
              className={
                textareaClass
              }
            />
          </Field>
        </section>


        <div className="flex justify-end gap-3">
          <Link
            href="/admin/accounts/expenses"
            className="inline-flex h-11 items-center rounded-lg border px-5 text-sm font-semibold"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Save Draft Expense
          </button>
        </div>
      </form>
    </div>
  );
}


function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">
        {label}
      </span>

      {children}
    </label>
  );
}


const inputClass =
  "h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const textareaClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";