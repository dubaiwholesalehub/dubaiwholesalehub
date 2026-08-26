import {
  ArrowLeft,
  Pencil,
} from "lucide-react";

import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  getExpenseById,
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

import ExpenseForm from "@/components/admin/accounts/expenses/ExpenseForm";

import {
  updateExpenseAction,
} from "../../actions";


interface EditExpensePageProps {
  params: Promise<{
    id: string;
  }>;
}


export default async function EditExpensePage({
  params,
}: EditExpensePageProps) {
  await requireAdmin();

  const { id } =
    await params;

  const expense =
    await getExpenseById(
      id,
    );

  if (!expense) {
    notFound();
  }


  /*
   * Only draft expenses may be edited.
   *
   * Posted/cancelled accounting documents are immutable.
   */
  if (
    expense.status !==
    "draft"
  ) {
    redirect(
      `/admin/accounts/expenses/${expense.id}`,
    );
  }


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
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <div>
        <Link
          href={
            `/admin/accounts/expenses/${expense.id}`
          }
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />

          {expense.expenseNumber}
        </Link>


        <div className="mt-4 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Pencil className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Edit Expense
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Update {expense.expenseNumber} before posting.
              Once posted, accounting information will be locked.
            </p>
          </div>
        </div>
      </div>


      <ExpenseForm
        action={
          updateExpenseAction
        }
        expense={
          expense
        }
        categories={
          categories
        }
        accounts={
          accounts
        }
        customers={
          customers
        }
        suppliers={
          suppliers
        }
        warehouses={
          warehouses
        }
        countries={
          countries
        }
        salesOrders={
          salesOrders
        }
      />
    </div>
  );
}