import Link from "next/link";

import type {
  ExpenseDetails,
} from "@/lib/repositories/expense.repository";


interface ExpenseCategoryOption {
  id: string;
  name: string;
  expenseType: string;
}

interface FinancialAccountOption {
  id: string;
  accountName: string;
  currentBalance: number;
}

interface CustomerOption {
  id: string;
  display_name: string;
}

interface SupplierOption {
  id: string;
  company_name: string;
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

interface CountryOption {
  id: string;
  name: string;
}

interface SalesOrderOption {
  id: string;
  order_number: string;
  customer_id: string | null;
  grand_total: number | string;
}


interface ExpenseFormProps {
  action:
    (
      formData: FormData,
    ) => void | Promise<void>;

  expense:
    ExpenseDetails;

  categories:
    ExpenseCategoryOption[];

  accounts:
    FinancialAccountOption[];

  customers:
    CustomerOption[];

  suppliers:
    SupplierOption[];

  warehouses:
    WarehouseOption[];

  countries:
    CountryOption[];

  salesOrders:
    SalesOrderOption[];
}


export default function ExpenseForm({
  action,
  expense,
  categories,
  accounts,
  customers,
  suppliers,
  warehouses,
  countries,
  salesOrders,
}: ExpenseFormProps) {
  return (
    <form
      action={action}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="expenseId"
        value={expense.id}
      />


      {/* ===================================================
       * Expense Information
       * =================================================== */}

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
                expense.expenseDate
              }
              className={inputClass}
            />
          </Field>


          <Field label="Category">
            <select
              name="categoryId"
              required
              defaultValue={
                expense.categoryId
              }
              className={inputClass}
            >
              <option value="">
                Select category
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                    {" — "}
                    {category.expenseType}
                  </option>
                ),
              )}
            </select>
          </Field>


          <Field label="Payee">
            <input
              name="payeeName"
              defaultValue={
                expense.payeeName ??
                ""
              }
              placeholder="Person / company paid"
              className={inputClass}
            />
          </Field>


          <Field label="Supplier">
            <select
              name="supplierId"
              defaultValue={
                expense.supplierId ??
                ""
              }
              className={inputClass}
            >
              <option value="">
                Optional supplier
              </option>

              {suppliers.map(
                (supplier) => (
                  <option
                    key={supplier.id}
                    value={supplier.id}
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
              defaultValue={
                expense.financialAccountId ??
                ""
              }
              className={inputClass}
            >
              <option value="">
                Select financial account
              </option>

              {accounts.map(
                (account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.accountName}
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
              defaultValue={
                expense.paymentMethod ??
                "cash"
              }
              className={inputClass}
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
              defaultValue={
                expense.paymentReference ??
                ""
              }
              placeholder="Receipt / transfer / cheque reference"
              className={inputClass}
            />
          </Field>
        </div>
      </section>


      {/* ===================================================
       * Amount & VAT
       * =================================================== */}

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
              defaultValue={
                expense.netAmount
              }
              className={inputClass}
            />
          </Field>


          <Field label="VAT Amount">
            <input
              type="number"
              name="taxAmount"
              min="0"
              step="0.01"
              required
              defaultValue={
                expense.taxAmount
              }
              className={inputClass}
            />
          </Field>


          <Field label="VAT Treatment">
            <select
              name="taxTreatment"
              defaultValue={
                expense.taxTreatment
              }
              className={inputClass}
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
              defaultValue={
                expense.supplierTrn ??
                ""
              }
              className={inputClass}
            />
          </Field>


          <Field label="Supplier Invoice No.">
            <input
              name="supplierInvoiceNumber"
              defaultValue={
                expense.supplierInvoiceNumber ??
                ""
              }
              className={inputClass}
            />
          </Field>


          <Field label="Supplier Invoice Date">
            <input
              type="date"
              name="supplierInvoiceDate"
              defaultValue={
                expense.supplierInvoiceDate ??
                ""
              }
              className={inputClass}
            />
          </Field>


          <label className="flex items-center gap-3 rounded-xl border p-4">
            <input
              type="checkbox"
              name="taxInvoiceVerified"
              defaultChecked={
                expense.taxInvoiceVerified
              }
            />

            <span className="text-sm font-medium">
              Tax invoice verified
            </span>
          </label>
        </div>
      </section>


      {/* ===================================================
       * Profitability Allocation
       * =================================================== */}

      <section className="rounded-2xl border border-blue-100 bg-blue-50/30 p-6">
        <h2 className="font-semibold">
          Profitability Allocation
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Optional. Use these fields when the expense belongs
          directly to a customer, Sales Order, warehouse,
          channel or market.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Customer">
            <select
              name="customerId"
              defaultValue={
                expense.customerId ??
                ""
              }
              className={inputClass}
            >
              <option value="">
                Not allocated
              </option>

              {customers.map(
                (customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
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
              defaultValue={
                expense.salesOrderId ??
                ""
              }
              className={inputClass}
            >
              <option value="">
                Not allocated
              </option>

              {salesOrders.map(
                (order) => (
                  <option
                    key={order.id}
                    value={order.id}
                  >
                    {order.order_number}
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
              defaultValue={
                expense.warehouseId ??
                ""
              }
              className={inputClass}
            >
              <option value="">
                Not allocated
              </option>

              {warehouses.map(
                (warehouse) => (
                  <option
                    key={warehouse.id}
                    value={warehouse.id}
                  >
                    {warehouse.code}
                    {" — "}
                    {warehouse.name}
                  </option>
                ),
              )}
            </select>
          </Field>


          <Field label="Sales Channel">
            <select
              name="salesChannel"
              defaultValue={
                expense.salesChannel ??
                ""
              }
              className={inputClass}
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
              defaultValue={
                expense.marketCountryId ??
                ""
              }
              className={inputClass}
            >
              <option value="">
                Not allocated
              </option>

              {countries.map(
                (country) => (
                  <option
                    key={country.id}
                    value={country.id}
                  >
                    {country.name}
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
              defaultValue={
                expense.profitabilityNotes ??
                ""
              }
              placeholder="Example: Delivery expense directly related to SO-2026-000024"
              className={textareaClass}
            />
          </Field>
        </div>
      </section>


      {/* ===================================================
       * Internal Notes
       * =================================================== */}

      <section className="rounded-2xl border bg-card p-6">
        <Field label="Internal Notes">
          <textarea
            name="notes"
            rows={4}
            defaultValue={
              expense.notes ??
              ""
            }
            className={textareaClass}
          />
        </Field>
      </section>


      {/* ===================================================
       * Actions
       * =================================================== */}

      <div className="flex justify-end gap-3">
        <Link
          href={
            `/admin/accounts/expenses/${expense.id}`
          }
          className="inline-flex h-11 items-center rounded-lg border px-5 text-sm font-semibold"
        >
          Cancel
        </Link>

        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}


function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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