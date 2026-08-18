/*
 * =========================================================
 * 074 — Expenses
 *
 * Purpose:
 *
 * Operational expense ledger for:
 *
 * - Rent
 * - Utilities
 * - Salary / wages
 * - Fuel / vehicle
 * - Courier / freight
 * - Marketing
 * - Office supplies
 * - Repairs
 * - Bank charges
 * - Government fees
 * - Travel
 * - Professional fees
 * - Miscellaneous expenses
 *
 * Designed to support:
 *
 * - Cash / Bank posting
 * - VAT tracking
 * - Profitability reporting
 * - Expense category analysis
 * =========================================================
 */


/* =========================================================
 * Expense Categories
 * ========================================================= */

create table if not exists
  public.expense_categories
(
  id uuid
    primary key
    default gen_random_uuid(),

  code text
    not null,

  name text
    not null,

  expense_type text
    not null
    default 'operating',

  description text,

  is_active boolean
    not null
    default true,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint
    expense_categories_code_unique
  unique (
    code
  ),

  constraint
    expense_categories_type_check
  check (
    expense_type in (
      'direct',
      'operating',
      'financial',
      'other'
    )
  )
);


/* =========================================================
 * Expenses
 * ========================================================= */

create table if not exists
  public.expenses
(
  id uuid
    primary key
    default gen_random_uuid(),

  expense_number text
    not null,

  expense_date date
    not null
    default current_date,

  category_id uuid
    not null
    references public.expense_categories(id),

  expense_type text
    not null,

  payee_name text,

  supplier_id uuid
    references public.suppliers(id),

  financial_account_id uuid
    references public.financial_accounts(id),

  payment_method text,

  payment_reference text,

  currency_code text
    not null
    default 'AED',

  exchange_rate numeric(18, 6)
    not null
    default 1,

  tax_treatment text
    not null
    default 'no_vat',

  supplier_trn text,

  supplier_invoice_number text,

  supplier_invoice_date date,

  tax_invoice_verified boolean
    not null
    default false,

  tax_invoice_verified_at timestamptz,

  net_amount numeric(18, 2)
    not null
    default 0,

  tax_amount numeric(18, 2)
    not null
    default 0,

  recoverable_tax_amount numeric(18, 2)
    not null
    default 0,

  pending_tax_amount numeric(18, 2)
    not null
    default 0,

  gross_amount numeric(18, 2)
    not null
    default 0,

  /*
   * Profitability dimensions
   */

  customer_id uuid
    references public.customers(id),

  sales_order_id uuid
    references public.sales_orders(id),

  warehouse_id uuid
    references public.warehouses(id),

  sales_channel text,

  market_country_id uuid
    references public.countries(id),

  profitability_notes text,

  /*
   * Posting
   */

  status text
    not null
    default 'draft',

  account_transaction_id uuid
    references public.account_transactions(id),

  posted_at timestamptz,

  cancelled_at timestamptz,

  cancellation_reason text,

  notes text,

  created_by uuid
    references public.profiles(id),

  updated_by uuid
    references public.profiles(id),

  posted_by uuid
    references public.profiles(id),

  cancelled_by uuid
    references public.profiles(id),

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint
    expenses_number_unique
  unique (
    expense_number
  ),

  constraint
    expenses_type_check
  check (
    expense_type in (
      'direct',
      'operating',
      'financial',
      'other'
    )
  ),

  constraint
    expenses_status_check
  check (
    status in (
      'draft',
      'posted',
      'cancelled'
    )
  ),

  constraint
    expenses_payment_method_check
  check (
    payment_method is null
    or payment_method in (
      'cash',
      'bank',
      'card',
      'cheque',
      'other'
    )
  ),

  constraint
    expenses_tax_treatment_check
  check (
    tax_treatment in (
      'standard_vat',
      'no_vat',
      'vat_pending',
      'non_recoverable'
    )
  ),

  constraint
    expenses_currency_check
  check (
    currency_code ~
      '^[A-Z]{3}$'
  ),

  constraint
    expenses_exchange_rate_positive
  check (
    exchange_rate > 0
  ),

  constraint
    expenses_net_amount_nonnegative
  check (
    net_amount >= 0
  ),

  constraint
    expenses_tax_amount_nonnegative
  check (
    tax_amount >= 0
  ),

  constraint
    expenses_gross_amount_nonnegative
  check (
    gross_amount >= 0
  )
);


/* =========================================================
 * Indexes
 * ========================================================= */

create index if not exists
  expenses_date_idx
on public.expenses (
  expense_date desc
);


create index if not exists
  expenses_category_idx
on public.expenses (
  category_id
);


create index if not exists
  expenses_supplier_idx
on public.expenses (
  supplier_id
)
where
  supplier_id is not null;


create index if not exists
  expenses_customer_idx
on public.expenses (
  customer_id
)
where
  customer_id is not null;


create index if not exists
  expenses_sales_order_idx
on public.expenses (
  sales_order_id
)
where
  sales_order_id is not null;


create index if not exists
  expenses_warehouse_idx
on public.expenses (
  warehouse_id
)
where
  warehouse_id is not null;


create index if not exists
  expenses_status_idx
on public.expenses (
  status
);


/* =========================================================
 * Updated At
 * ========================================================= */

create or replace function
  public.set_expense_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at :=
    now();

  return new;
end;
$$;


drop trigger if exists
  set_expenses_updated_at
on public.expenses;


create trigger
  set_expenses_updated_at
before update
on public.expenses
for each row
execute function
  public.set_expense_updated_at();


drop trigger if exists
  set_expense_categories_updated_at
on public.expense_categories;


create trigger
  set_expense_categories_updated_at
before update
on public.expense_categories
for each row
execute function
  public.set_expense_updated_at();


/* =========================================================
 * Expense Number
 * ========================================================= */

create sequence if not exists
  public.expense_number_seq
start 1;


create or replace function
  public.next_expense_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number bigint;
begin
  v_number :=
    nextval(
      'public.expense_number_seq'
    );

  return
    'EXP-'
    ||
    to_char(
      current_date,
      'YYYY'
    )
    ||
    '-'
    ||
    lpad(
      v_number::text,
      6,
      '0'
    );
end;
$$;


/* =========================================================
 * Seed Expense Categories
 * ========================================================= */

insert into public.expense_categories (
  code,
  name,
  expense_type
)
values
  (
    'RENT',
    'Rent',
    'operating'
  ),
  (
    'SALARY',
    'Salary / Wages',
    'operating'
  ),
  (
    'UTILITIES',
    'Utilities',
    'operating'
  ),
  (
    'TEL-INTERNET',
    'Telephone / Internet',
    'operating'
  ),
  (
    'FUEL',
    'Fuel / Vehicle',
    'operating'
  ),
  (
    'COURIER',
    'Courier / Freight',
    'direct'
  ),
  (
    'OFFICE',
    'Office Supplies',
    'operating'
  ),
  (
    'MARKETING',
    'Marketing / Advertising',
    'direct'
  ),
  (
    'REPAIRS',
    'Repairs & Maintenance',
    'operating'
  ),
  (
    'BANK-CHARGES',
    'Bank Charges',
    'financial'
  ),
  (
    'GOV-FEES',
    'Government Fees',
    'operating'
  ),
  (
    'TRAVEL',
    'Travel',
    'operating'
  ),
  (
    'MEALS',
    'Meals / Entertainment',
    'operating'
  ),
  (
    'PROFESSIONAL',
    'Professional Fees',
    'operating'
  ),
  (
    'MISC',
    'Miscellaneous',
    'other'
  )
on conflict (
  code
)
do nothing;


/* =========================================================
 * Security
 * ========================================================= */

alter table
  public.expense_categories
enable row level security;


alter table
  public.expenses
enable row level security;


drop policy if exists
  "Management can manage expense categories"
on public.expense_categories;


create policy
  "Management can manage expense categories"
on public.expense_categories
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


drop policy if exists
  "Management can manage expenses"
on public.expenses;


create policy
  "Management can manage expenses"
on public.expenses
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Permissions
 * ========================================================= */

grant select,
      insert,
      update,
      delete
on public.expense_categories
to authenticated;


grant select,
      insert,
      update
on public.expenses
to authenticated;


revoke all
on function
  public.next_expense_number()
from public;


grant execute
on function
  public.next_expense_number()
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on table
  public.expenses
is
  'Operational expense ledger with VAT, financial-account and profitability dimensions.';