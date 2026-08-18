/*
 * =========================================================
 * 087 — General Ledger Foundation
 *
 * PURPOSE
 * -------
 *
 * Creates the formal double-entry accounting foundation
 * underneath the existing operational ERP.
 *
 *
 * IMPORTANT ARCHITECTURE
 * ----------------------
 *
 * Existing operational ledgers remain authoritative for:
 *
 *   Sales Orders / Customer Receivables
 *   Customer Receipts
 *   Quick Purchases / Supplier Payables
 *   Supplier Payments
 *   Expenses
 *   Inventory
 *   Financial Accounts / Treasury
 *
 *
 * This migration adds:
 *
 *   1. Accounting periods
 *   2. Chart of Accounts
 *   3. Journal entry headers
 *   4. Journal entry lines
 *   5. System account mappings
 *   6. Financial Account -> GL mappings
 *   7. Expense Category -> GL mappings
 *   8. Initial Chart of Accounts
 *   9. Current / surrounding accounting periods
 *  10. Journal-balance intelligence view
 *
 *
 * THIS MIGRATION DOES NOT YET POST LIVE ERP TRANSACTIONS.
 *
 * Live posting begins in migration 088+.
 *
 *
 * BASE CURRENCY
 * -------------
 *
 * AED
 *
 * Foreign-currency operational documents continue to retain
 * their original currency and exchange rate.
 *
 * GL reporting is based on base_debit / base_credit in AED.
 *
 *
 * POSTING PRINCIPLE
 * -----------------
 *
 * Every posted journal must satisfy:
 *
 *   SUM(base_debit) = SUM(base_credit)
 *
 *
 * AUDIT PRINCIPLE
 * ---------------
 *
 * Posted journals are never deleted.
 *
 * Corrections will later be made through reversal entries.
 * =========================================================
 */


/* =========================================================
 * 1. Journal Number Sequence
 *
 * Example:
 *
 *   JE-2026-000001
 * ========================================================= */

create sequence if not exists
  public.gl_journal_number_seq

start with 1
increment by 1
minvalue 1
no maxvalue
cache 1;


/* =========================================================
 * 2. Journal Number Generator
 * ========================================================= */

create or replace function
  public.next_gl_journal_number(
    p_journal_date date
      default current_date
  )
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
      'public.gl_journal_number_seq'
    );


  return
    'JE-'
    ||
    extract(
      year
      from
      coalesce(
        p_journal_date,
        current_date
      )
    )::integer
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
 * 3. Accounting Periods
 *
 * Period controls:
 *
 * open
 *   Normal posting allowed.
 *
 * soft_closed
 *   Reporting period is under review.
 *   Future posting engine will require override permission.
 *
 * closed
 *   No normal posting allowed.
 * ========================================================= */

create table if not exists
  public.accounting_periods
(
  id uuid
    primary key
    default gen_random_uuid(),

  period_code text
    not null,

  fiscal_year integer
    not null,

  period_number integer
    not null,

  date_from date
    not null,

  date_to date
    not null,

  status text
    not null
    default 'open',

  notes text,

  soft_closed_at timestamptz,

  soft_closed_by uuid
    references public.profiles(id)
    on delete set null,

  closed_at timestamptz,

  closed_by uuid
    references public.profiles(id)
    on delete set null,

  reopened_at timestamptz,

  reopened_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint
    accounting_periods_period_code_unique
  unique (
    period_code
  ),

  constraint
    accounting_periods_year_number_unique
  unique (
    fiscal_year,
    period_number
  ),

  constraint
    accounting_periods_period_number_check
  check (
    period_number
      between
        1
        and
        12
  ),

  constraint
    accounting_periods_dates_check
  check (
    date_to >=
      date_from
  ),

  constraint
    accounting_periods_status_check
  check (
    status in (
      'open',
      'soft_closed',
      'closed'
    )
  )
);


/* =========================================================
 * 4. GL Accounts — Chart of Accounts
 *
 * account_class
 * -------------
 *
 * asset
 * liability
 * equity
 * revenue
 * cogs
 * expense
 * other_income
 * other_expense
 *
 *
 * statement_type
 * --------------
 *
 * balance_sheet
 * profit_loss
 *
 *
 * normal_balance
 * --------------
 *
 * debit
 * credit
 *
 *
 * is_posting_account
 * ------------------
 *
 * false = heading / grouping account
 * true  = journal lines may post here
 * ========================================================= */

create table if not exists
  public.gl_accounts
(
  id uuid
    primary key
    default gen_random_uuid(),

  account_code text
    not null,

  account_name text
    not null,

  parent_id uuid
    references public.gl_accounts(id)
    on delete restrict,

  account_class text
    not null,

  statement_type text
    not null,

  normal_balance text
    not null,

  description text,

  is_posting_account boolean
    not null
    default true,

  is_control_account boolean
    not null
    default false,

  allow_manual_posting boolean
    not null
    default true,

  is_system_account boolean
    not null
    default false,

  is_active boolean
    not null
    default true,

  display_order integer
    not null
    default 0,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  updated_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint
    gl_accounts_code_unique
  unique (
    account_code
  ),

  constraint
    gl_accounts_name_not_empty
  check (
    length(
      trim(
        account_name
      )
    ) >
    0
  ),

  constraint
    gl_accounts_code_not_empty
  check (
    length(
      trim(
        account_code
      )
    ) >
    0
  ),

  constraint
    gl_accounts_class_check
  check (
    account_class in (
      'asset',
      'liability',
      'equity',
      'revenue',
      'cogs',
      'expense',
      'other_income',
      'other_expense'
    )
  ),

  constraint
    gl_accounts_statement_type_check
  check (
    statement_type in (
      'balance_sheet',
      'profit_loss'
    )
  ),

  constraint
    gl_accounts_normal_balance_check
  check (
    normal_balance in (
      'debit',
      'credit'
    )
  ),

  constraint
    gl_accounts_parent_not_self
  check (
    parent_id is null
    or
    parent_id <>
      id
  )
);


/* =========================================================
 * 5. GL Journal Entries
 *
 * One header represents one economic accounting event.
 *
 * Examples:
 *
 * sales_dispatch
 * customer_receipt
 * quick_purchase
 * supplier_payment
 * expense
 * financial_transfer
 * inventory_adjustment
 * opening_balance
 * manual_journal
 *
 *
 * source_type deliberately remains TEXT rather than a rigid
 * CHECK list so future ERP modules can integrate without
 * requiring a schema migration merely to add a source type.
 * ========================================================= */

create table if not exists
  public.gl_journal_entries
(
  id uuid
    primary key
    default gen_random_uuid(),

  journal_number text
    not null,

  journal_date date
    not null,

  posting_date date
    not null,

  accounting_period_id uuid
    not null
    references public.accounting_periods(id)
    on delete restrict,

  source_type text
    not null,

  source_id uuid,

  source_number text,

  description text
    not null,

  currency_code text
    not null
    default 'AED',

  exchange_rate numeric(18, 6)
    not null
    default 1,

  status text
    not null
    default 'draft',

  /*
   * Reversal architecture.
   *
   * original_entry_id:
   *   populated on a reversal journal.
   *
   * reversal_entry_id:
   *   populated on the original journal once reversed.
   */
  original_entry_id uuid
    references public.gl_journal_entries(id)
    on delete restrict,

  reversal_entry_id uuid
    references public.gl_journal_entries(id)
    on delete restrict,

  reversal_reason text,

  posted_at timestamptz,

  posted_by uuid
    references public.profiles(id)
    on delete set null,

  reversed_at timestamptz,

  reversed_by uuid
    references public.profiles(id)
    on delete set null,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  updated_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint
    gl_journal_entries_number_unique
  unique (
    journal_number
  ),

  constraint
    gl_journal_entries_source_type_not_empty
  check (
    length(
      trim(
        source_type
      )
    ) >
    0
  ),

  constraint
    gl_journal_entries_description_not_empty
  check (
    length(
      trim(
        description
      )
    ) >
    0
  ),

  constraint
    gl_journal_entries_status_check
  check (
    status in (
      'draft',
      'posted',
      'reversed'
    )
  ),

  constraint
    gl_journal_entries_exchange_rate_positive
  check (
    exchange_rate >
      0
  ),

  constraint
    gl_journal_entries_currency_check
  check (
    currency_code ~
      '^[A-Z]{3}$'
  ),

  constraint
    gl_journal_entries_original_not_self
  check (
    original_entry_id is null
    or
    original_entry_id <>
      id
  ),

  constraint
    gl_journal_entries_reversal_not_self
  check (
    reversal_entry_id is null
    or
    reversal_entry_id <>
      id
  )
);


/* =========================================================
 * 6. GL Journal Lines
 *
 * Both document-currency and base-currency amounts are stored.
 *
 * In the first accounting implementation:
 *
 * base currency = AED
 *
 *
 * A line must contain:
 *
 * debit > 0, credit = 0
 *
 * OR
 *
 * credit > 0, debit = 0
 *
 *
 * Never both.
 * Never neither.
 * ========================================================= */

create table if not exists
  public.gl_journal_lines
(
  id uuid
    primary key
    default gen_random_uuid(),

  journal_entry_id uuid
    not null
    references public.gl_journal_entries(id)
    on delete restrict,

  line_number integer
    not null,

  gl_account_id uuid
    not null
    references public.gl_accounts(id)
    on delete restrict,

  description text,

  debit numeric(18, 2)
    not null
    default 0,

  credit numeric(18, 2)
    not null
    default 0,

  base_debit numeric(18, 2)
    not null
    default 0,

  base_credit numeric(18, 2)
    not null
    default 0,

  /*
   * Subledger / management dimensions.
   *
   * These do not replace operational ledgers.
   * They make GL drill-down and reconciliation possible.
   */
  customer_id uuid
    references public.customers(id)
    on delete restrict,

  supplier_id uuid
    references public.suppliers(id)
    on delete restrict,

  product_id uuid
    references public.products(id)
    on delete restrict,

  warehouse_id uuid
    references public.warehouses(id)
    on delete restrict,

  financial_account_id uuid
    references public.financial_accounts(id)
    on delete restrict,

  expense_category_id uuid
    references public.expense_categories(id)
    on delete restrict,

  /*
   * Optional line-level operational trace.
   *
   * Example:
   *
   * source_line_type =
   *   inventory_transaction_item
   *
   * source_line_id =
   *   inventory_transaction_items.id
   */
  source_line_type text,

  source_line_id uuid,

  source_line_number integer,

  created_at timestamptz
    not null
    default now(),

  constraint
    gl_journal_lines_entry_line_unique
  unique (
    journal_entry_id,
    line_number
  ),

  constraint
    gl_journal_lines_line_number_positive
  check (
    line_number >
      0
  ),

  constraint
    gl_journal_lines_debit_non_negative
  check (
    debit >=
      0
  ),

  constraint
    gl_journal_lines_credit_non_negative
  check (
    credit >=
      0
  ),

  constraint
    gl_journal_lines_base_debit_non_negative
  check (
    base_debit >=
      0
  ),

  constraint
    gl_journal_lines_base_credit_non_negative
  check (
    base_credit >=
      0
  ),

  constraint
    gl_journal_lines_one_side_only
  check (
    (
      debit >
        0

      and

      credit =
        0
    )

    or

    (
      credit >
        0

      and

      debit =
        0
    )
  ),

  constraint
    gl_journal_lines_base_one_side_only
  check (
    (
      base_debit >
        0

      and

      base_credit =
        0
    )

    or

    (
      base_credit >
        0

      and

      base_debit =
        0
    )
  ),

  constraint
    gl_journal_lines_direction_matches
  check (
    (
      debit >
        0

      and

      base_debit >
        0
    )

    or

    (
      credit >
        0

      and

      base_credit >
        0
    )
  )
);


/* =========================================================
 * 7. System Account Mappings
 *
 * Posting code should NEVER hard-code UUIDs.
 *
 * Posting engine asks for a mapping key.
 *
 * Example:
 *
 * accounts_receivable -> GL account 1200
 * sales_revenue       -> GL account 4100
 * ========================================================= */

create table if not exists
  public.gl_account_mappings
(
  id uuid
    primary key
    default gen_random_uuid(),

  mapping_key text
    not null,

  gl_account_id uuid
    not null
    references public.gl_accounts(id)
    on delete restrict,

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
    gl_account_mappings_key_unique
  unique (
    mapping_key
  ),

  constraint
    gl_account_mappings_key_not_empty
  check (
    length(
      trim(
        mapping_key
      )
    ) >
    0
  )
);


/* =========================================================
 * 8. Connect Existing Operational Masters to GL
 *
 * Treasury account:
 *
 *   financial_accounts.gl_account_id
 *
 * Expense category:
 *
 *   expense_categories.gl_account_id
 *
 *
 * These mappings do NOT replace operational accounts.
 * ========================================================= */

alter table
  public.financial_accounts

add column if not exists
  gl_account_id uuid
  references public.gl_accounts(id)
  on delete restrict;


alter table
  public.expense_categories

add column if not exists
  gl_account_id uuid
  references public.gl_accounts(id)
  on delete restrict;


/* =========================================================
 * 9. Performance Indexes
 * ========================================================= */

create index if not exists
  gl_accounts_parent_idx

on public.gl_accounts (
  parent_id
);


create index if not exists
  gl_accounts_class_idx

on public.gl_accounts (
  account_class
);


create index if not exists
  gl_accounts_active_idx

on public.gl_accounts (
  is_active
)

where
  is_active =
    true;


create index if not exists
  gl_accounts_statement_idx

on public.gl_accounts (
  statement_type,
  display_order,
  account_code
);


create index if not exists
  gl_journal_entries_date_idx

on public.gl_journal_entries (
  posting_date desc
);


create index if not exists
  gl_journal_entries_period_idx

on public.gl_journal_entries (
  accounting_period_id
);


create index if not exists
  gl_journal_entries_status_idx

on public.gl_journal_entries (
  status
);


create index if not exists
  gl_journal_entries_source_idx

on public.gl_journal_entries (
  source_type,
  source_id
)

where
  source_id is not null;


create index if not exists
  gl_journal_lines_entry_idx

on public.gl_journal_lines (
  journal_entry_id
);


create index if not exists
  gl_journal_lines_account_idx

on public.gl_journal_lines (
  gl_account_id
);


create index if not exists
  gl_journal_lines_customer_idx

on public.gl_journal_lines (
  customer_id
)

where
  customer_id is not null;


create index if not exists
  gl_journal_lines_supplier_idx

on public.gl_journal_lines (
  supplier_id
)

where
  supplier_id is not null;


create index if not exists
  gl_journal_lines_product_idx

on public.gl_journal_lines (
  product_id
)

where
  product_id is not null;


create index if not exists
  gl_journal_lines_warehouse_idx

on public.gl_journal_lines (
  warehouse_id
)

where
  warehouse_id is not null;


create index if not exists
  gl_journal_lines_financial_account_idx

on public.gl_journal_lines (
  financial_account_id
)

where
  financial_account_id is not null;


create index if not exists
  gl_journal_lines_expense_category_idx

on public.gl_journal_lines (
  expense_category_id
)

where
  expense_category_id is not null;


/* =========================================================
 * 10. Prevent Duplicate Posted Source Accounting
 *
 * Once posting integration begins, one operational source
 * should have only one active posted journal.
 *
 * Reversal journals use their own source identity.
 * ========================================================= */

create unique index if not exists
  gl_journal_entries_posted_source_unique

on public.gl_journal_entries (
  source_type,
  source_id
)

where
  status =
    'posted'

  and
  source_id
    is not null;


/* =========================================================
 * 11. Updated At Helper
 * ========================================================= */

create or replace function
  public.set_gl_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  new.updated_at :=
    now();


  return
    new;

end;
$$;


/* =========================================================
 * 12. Updated At Triggers
 * ========================================================= */

drop trigger if exists
  set_accounting_periods_updated_at
on
  public.accounting_periods;


create trigger
  set_accounting_periods_updated_at

before update
on public.accounting_periods

for each row

execute function
  public.set_gl_updated_at();


drop trigger if exists
  set_gl_accounts_updated_at
on
  public.gl_accounts;


create trigger
  set_gl_accounts_updated_at

before update
on public.gl_accounts

for each row

execute function
  public.set_gl_updated_at();


drop trigger if exists
  set_gl_journal_entries_updated_at
on
  public.gl_journal_entries;


create trigger
  set_gl_journal_entries_updated_at

before update
on public.gl_journal_entries

for each row

execute function
  public.set_gl_updated_at();


drop trigger if exists
  set_gl_account_mappings_updated_at
on
  public.gl_account_mappings;


create trigger
  set_gl_account_mappings_updated_at

before update
on public.gl_account_mappings

for each row

execute function
  public.set_gl_updated_at();


/* =========================================================
 * 13. Seed Main Chart of Accounts
 * ========================================================= */


/* ---------------------------------------------------------
 * Assets
 * --------------------------------------------------------- */

insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '1000',
  'Assets',
  null,
  'asset',
  'balance_sheet',
  'debit',
  'All company assets.',
  false,
  false,
  false,
  true,
  1000
)
on conflict (account_code)
do nothing;


insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '1100',
  'Current Assets',
  (
    select id
    from public.gl_accounts
    where account_code = '1000'
  ),
  'asset',
  'balance_sheet',
  'debit',
  'Current and liquid assets.',
  false,
  false,
  false,
  true,
  1100
),
(
  '1110',
  'Cash on Hand',
  (
    select id
    from public.gl_accounts
    where account_code = '1100'
  ),
  'asset',
  'balance_sheet',
  'debit',
  'Parent account for operational cash accounts.',
  false,
  false,
  false,
  true,
  1110
),
(
  '1120',
  'Bank Accounts',
  (
    select id
    from public.gl_accounts
    where account_code = '1100'
  ),
  'asset',
  'balance_sheet',
  'debit',
  'Parent account for bank accounts.',
  false,
  false,
  false,
  true,
  1120
),
(
  '1130',
  'Card / POS Clearing',
  (
    select id
    from public.gl_accounts
    where account_code = '1100'
  ),
  'asset',
  'balance_sheet',
  'debit',
  'Parent account for card and POS balances.',
  false,
  false,
  false,
  true,
  1130
),
(
  '1140',
  'Payment Gateways',
  (
    select id
    from public.gl_accounts
    where account_code = '1100'
  ),
  'asset',
  'balance_sheet',
  'debit',
  'Parent account for online payment gateways.',
  false,
  false,
  false,
  true,
  1140
),
(
  '1150',
  'Clearing Accounts',
  (
    select id
    from public.gl_accounts
    where account_code = '1100'
  ),
  'asset',
  'balance_sheet',
  'debit',
  'Parent account for treasury clearing accounts.',
  false,
  false,
  false,
  true,
  1150
),
(
  '1190',
  'Other Treasury Accounts',
  (
    select id
    from public.gl_accounts
    where account_code = '1100'
  ),
  'asset',
  'balance_sheet',
  'debit',
  'Other operational treasury accounts.',
  false,
  false,
  false,
  true,
  1190
),
(
  '1200',
  'Accounts Receivable',
  (
    select id
    from public.gl_accounts
    where account_code = '1100'
  ),
  'asset',
  'balance_sheet',
  'debit',
  'Customer trade receivables.',
  true,
  true,
  false,
  true,
  1200
),
(
  '1300',
  'Inventory',
  (
    select id
    from public.gl_accounts
    where account_code = '1100'
  ),
  'asset',
  'balance_sheet',
  'debit',
  'Inventory asset at recognized accounting cost.',
  true,
  true,
  false,
  true,
  1300
),
(
  '1400',
  'VAT Recoverable',
  (
    select id
    from public.gl_accounts
    where account_code = '1100'
  ),
  'asset',
  'balance_sheet',
  'debit',
  'Recoverable input VAT.',
  true,
  true,
  false,
  true,
  1400
),
(
  '1410',
  'VAT Pending',
  (
    select id
    from public.gl_accounts
    where account_code = '1100'
  ),
  'asset',
  'balance_sheet',
  'debit',
  'Input VAT awaiting verification/classification.',
  true,
  true,
  false,
  true,
  1410
),
(
  '1500',
  'Supplier Advances',
  (
    select id
    from public.gl_accounts
    where account_code = '1100'
  ),
  'asset',
  'balance_sheet',
  'debit',
  'Payments made to suppliers before allocation to payables.',
  true,
  true,
  false,
  true,
  1500
),
(
  '1600',
  'Prepayments & Other Current Assets',
  (
    select id
    from public.gl_accounts
    where account_code = '1100'
  ),
  'asset',
  'balance_sheet',
  'debit',
  'Prepayments and other current assets.',
  true,
  false,
  true,
  true,
  1600
)
on conflict (account_code)
do nothing;


/* ---------------------------------------------------------
 * Liabilities
 * --------------------------------------------------------- */

insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '2000',
  'Liabilities',
  null,
  'liability',
  'balance_sheet',
  'credit',
  'All company liabilities.',
  false,
  false,
  false,
  true,
  2000
)
on conflict (account_code)
do nothing;


insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '2100',
  'Accounts Payable',
  (
    select id
    from public.gl_accounts
    where account_code = '2000'
  ),
  'liability',
  'balance_sheet',
  'credit',
  'Supplier trade payables.',
  true,
  true,
  false,
  true,
  2100
),
(
  '2200',
  'VAT Payable',
  (
    select id
    from public.gl_accounts
    where account_code = '2000'
  ),
  'liability',
  'balance_sheet',
  'credit',
  'Output VAT payable.',
  true,
  true,
  false,
  true,
  2200
),
(
  '2300',
  'Customer Advances',
  (
    select id
    from public.gl_accounts
    where account_code = '2000'
  ),
  'liability',
  'balance_sheet',
  'credit',
  'Customer money received before allocation to receivables.',
  true,
  true,
  false,
  true,
  2300
),
(
  '2400',
  'Accrued Liabilities',
  (
    select id
    from public.gl_accounts
    where account_code = '2000'
  ),
  'liability',
  'balance_sheet',
  'credit',
  'Accruals and other current liabilities.',
  true,
  false,
  true,
  true,
  2400
)
on conflict (account_code)
do nothing;


/* ---------------------------------------------------------
 * Equity
 * --------------------------------------------------------- */

insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '3000',
  'Equity',
  null,
  'equity',
  'balance_sheet',
  'credit',
  'Owners equity and retained earnings.',
  false,
  false,
  false,
  true,
  3000
)
on conflict (account_code)
do nothing;


insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '3100',
  'Owner Capital',
  (
    select id
    from public.gl_accounts
    where account_code = '3000'
  ),
  'equity',
  'balance_sheet',
  'credit',
  'Owner/shareholder capital.',
  true,
  false,
  true,
  true,
  3100
),
(
  '3200',
  'Retained Earnings',
  (
    select id
    from public.gl_accounts
    where account_code = '3000'
  ),
  'equity',
  'balance_sheet',
  'credit',
  'Accumulated prior-period earnings.',
  true,
  true,
  false,
  true,
  3200
),
(
  '3300',
  'Current Year Earnings',
  (
    select id
    from public.gl_accounts
    where account_code = '3000'
  ),
  'equity',
  'balance_sheet',
  'credit',
  'Current-year earnings presentation account.',
  true,
  true,
  false,
  true,
  3300
)
on conflict (account_code)
do nothing;


/* ---------------------------------------------------------
 * Revenue
 * --------------------------------------------------------- */

insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '4000',
  'Revenue',
  null,
  'revenue',
  'profit_loss',
  'credit',
  'Operating revenue.',
  false,
  false,
  false,
  true,
  4000
)
on conflict (account_code)
do nothing;


insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '4100',
  'Sales Revenue',
  (
    select id
    from public.gl_accounts
    where account_code = '4000'
  ),
  'revenue',
  'profit_loss',
  'credit',
  'Recognized merchandise/service sales revenue excluding VAT.',
  true,
  true,
  false,
  true,
  4100
),
(
  '4200',
  'Sales Returns & Discounts',
  (
    select id
    from public.gl_accounts
    where account_code = '4000'
  ),
  'revenue',
  'profit_loss',
  'debit',
  'Contra-revenue for sales returns and separately posted discounts.',
  true,
  false,
  false,
  true,
  4200
),
(
  '4300',
  'Other Operating Income',
  (
    select id
    from public.gl_accounts
    where account_code = '4000'
  ),
  'revenue',
  'profit_loss',
  'credit',
  'Other operating revenue.',
  true,
  false,
  true,
  true,
  4300
)
on conflict (account_code)
do nothing;


/* ---------------------------------------------------------
 * Cost of Goods Sold
 * --------------------------------------------------------- */

insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '5000',
  'Cost of Sales',
  null,
  'cogs',
  'profit_loss',
  'debit',
  'Cost of goods and inventory-related sales costs.',
  false,
  false,
  false,
  true,
  5000
)
on conflict (account_code)
do nothing;


insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '5100',
  'Cost of Goods Sold',
  (
    select id
    from public.gl_accounts
    where account_code = '5000'
  ),
  'cogs',
  'profit_loss',
  'debit',
  'Actual inventory cost recognized when goods are dispatched.',
  true,
  true,
  false,
  true,
  5100
),
(
  '5200',
  'Inventory Adjustments & Losses',
  (
    select id
    from public.gl_accounts
    where account_code = '5000'
  ),
  'cogs',
  'profit_loss',
  'debit',
  'Stock shortages, losses and accounting inventory adjustments.',
  true,
  false,
  false,
  true,
  5200
)
on conflict (account_code)
do nothing;


/* ---------------------------------------------------------
 * Operating Expenses
 * --------------------------------------------------------- */

insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '6000',
  'Operating Expenses',
  null,
  'expense',
  'profit_loss',
  'debit',
  'Direct and operating expenses.',
  false,
  false,
  false,
  true,
  6000
)
on conflict (account_code)
do nothing;


insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '6100',
  'Direct Expenses',
  (
    select id
    from public.gl_accounts
    where account_code = '6000'
  ),
  'expense',
  'profit_loss',
  'debit',
  'Direct business and sales-related expenses.',
  false,
  false,
  false,
  true,
  6100
),
(
  '6190',
  'Direct Expense — General',
  (
    select id
    from public.gl_accounts
    where account_code = '6100'
  ),
  'expense',
  'profit_loss',
  'debit',
  'Fallback direct expense account.',
  true,
  false,
  true,
  true,
  6190
),
(
  '6200',
  'Operating Expenses',
  (
    select id
    from public.gl_accounts
    where account_code = '6000'
  ),
  'expense',
  'profit_loss',
  'debit',
  'General operating expenses.',
  false,
  false,
  false,
  true,
  6200
),
(
  '6290',
  'Operating Expense — General',
  (
    select id
    from public.gl_accounts
    where account_code = '6200'
  ),
  'expense',
  'profit_loss',
  'debit',
  'Fallback operating expense account.',
  true,
  false,
  true,
  true,
  6290
)
on conflict (account_code)
do nothing;


/* ---------------------------------------------------------
 * Other / Financial
 * --------------------------------------------------------- */

insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '7000',
  'Financial & Other Items',
  null,
  'other_expense',
  'profit_loss',
  'debit',
  'Financial expenses, other expenses and other income.',
  false,
  false,
  false,
  true,
  7000
)
on conflict (account_code)
do nothing;


insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '7100',
  'Financial Expenses',
  (
    select id
    from public.gl_accounts
    where account_code = '7000'
  ),
  'other_expense',
  'profit_loss',
  'debit',
  'Bank charges, finance costs and similar items.',
  false,
  false,
  false,
  true,
  7100
),
(
  '7190',
  'Financial Expense — General',
  (
    select id
    from public.gl_accounts
    where account_code = '7100'
  ),
  'other_expense',
  'profit_loss',
  'debit',
  'Fallback financial expense account.',
  true,
  false,
  true,
  true,
  7190
),
(
  '7200',
  'Other Expenses',
  (
    select id
    from public.gl_accounts
    where account_code = '7000'
  ),
  'other_expense',
  'profit_loss',
  'debit',
  'Other non-operating expenses.',
  false,
  false,
  false,
  true,
  7200
),
(
  '7290',
  'Other Expense — General',
  (
    select id
    from public.gl_accounts
    where account_code = '7200'
  ),
  'other_expense',
  'profit_loss',
  'debit',
  'Fallback other expense account.',
  true,
  false,
  true,
  true,
  7290
),
(
  '7300',
  'Other Income',
  (
    select id
    from public.gl_accounts
    where account_code = '7000'
  ),
  'other_income',
  'profit_loss',
  'credit',
  'Other non-operating income.',
  false,
  false,
  false,
  true,
  7300
),
(
  '7390',
  'Other Income — General',
  (
    select id
    from public.gl_accounts
    where account_code = '7300'
  ),
  'other_income',
  'profit_loss',
  'credit',
  'Fallback other income account.',
  true,
  false,
  true,
  true,
  7390
),
(
  '7410',
  'Foreign Exchange Gain',
  (
    select id
    from public.gl_accounts
    where account_code = '7300'
  ),
  'other_income',
  'profit_loss',
  'credit',
  'Realized foreign exchange gains.',
  true,
  false,
  false,
  true,
  7410
),
(
  '7420',
  'Foreign Exchange Loss',
  (
    select id
    from public.gl_accounts
    where account_code = '7200'
  ),
  'other_expense',
  'profit_loss',
  'debit',
  'Realized foreign exchange losses.',
  true,
  false,
  false,
  true,
  7420
)
on conflict (account_code)
do nothing;


/* =========================================================
 * 14. Seed System Account Mappings
 * ========================================================= */

insert into public.gl_account_mappings
(
  mapping_key,
  gl_account_id,
  description
)
values

(
  'accounts_receivable',
  (
    select id
    from public.gl_accounts
    where account_code = '1200'
  ),
  'Customer trade receivables.'
),

(
  'inventory',
  (
    select id
    from public.gl_accounts
    where account_code = '1300'
  ),
  'Inventory asset.'
),

(
  'vat_recoverable',
  (
    select id
    from public.gl_accounts
    where account_code = '1400'
  ),
  'Recoverable input VAT.'
),

(
  'vat_pending',
  (
    select id
    from public.gl_accounts
    where account_code = '1410'
  ),
  'VAT awaiting verification.'
),

(
  'supplier_advances',
  (
    select id
    from public.gl_accounts
    where account_code = '1500'
  ),
  'Unallocated supplier advance asset.'
),

(
  'accounts_payable',
  (
    select id
    from public.gl_accounts
    where account_code = '2100'
  ),
  'Supplier trade payables.'
),

(
  'vat_payable',
  (
    select id
    from public.gl_accounts
    where account_code = '2200'
  ),
  'Output VAT payable.'
),

(
  'customer_advances',
  (
    select id
    from public.gl_accounts
    where account_code = '2300'
  ),
  'Unallocated customer advance liability.'
),

(
  'owner_capital',
  (
    select id
    from public.gl_accounts
    where account_code = '3100'
  ),
  'Owner/shareholder capital.'
),

(
  'retained_earnings',
  (
    select id
    from public.gl_accounts
    where account_code = '3200'
  ),
  'Retained earnings.'
),

(
  'current_year_earnings',
  (
    select id
    from public.gl_accounts
    where account_code = '3300'
  ),
  'Current year earnings.'
),

(
  'sales_revenue',
  (
    select id
    from public.gl_accounts
    where account_code = '4100'
  ),
  'Recognized sales revenue.'
),

(
  'sales_returns_discounts',
  (
    select id
    from public.gl_accounts
    where account_code = '4200'
  ),
  'Sales returns and separately posted discounts.'
),

(
  'other_operating_income',
  (
    select id
    from public.gl_accounts
    where account_code = '4300'
  ),
  'Other operating income.'
),

(
  'cogs',
  (
    select id
    from public.gl_accounts
    where account_code = '5100'
  ),
  'Actual inventory COGS.'
),

(
  'inventory_adjustment_loss',
  (
    select id
    from public.gl_accounts
    where account_code = '5200'
  ),
  'Inventory accounting losses/adjustments.'
),

(
  'direct_expense_default',
  (
    select id
    from public.gl_accounts
    where account_code = '6190'
  ),
  'Fallback direct expense account.'
),

(
  'operating_expense_default',
  (
    select id
    from public.gl_accounts
    where account_code = '6290'
  ),
  'Fallback operating expense account.'
),

(
  'financial_expense_default',
  (
    select id
    from public.gl_accounts
    where account_code = '7190'
  ),
  'Fallback financial expense account.'
),

(
  'other_expense_default',
  (
    select id
    from public.gl_accounts
    where account_code = '7290'
  ),
  'Fallback other expense account.'
),

(
  'other_income_default',
  (
    select id
    from public.gl_accounts
    where account_code = '7390'
  ),
  'Fallback other income account.'
),

(
  'foreign_exchange_gain',
  (
    select id
    from public.gl_accounts
    where account_code = '7410'
  ),
  'Realized foreign exchange gain.'
),

(
  'foreign_exchange_loss',
  (
    select id
    from public.gl_accounts
    where account_code = '7420'
  ),
  'Realized foreign exchange loss.'
)

on conflict (
  mapping_key
)

do update

set
  gl_account_id =
    excluded.gl_account_id,

  description =
    excluded.description,

  is_active =
    true,

  updated_at =
    now();


/* =========================================================
 * 15. Create GL Subaccounts for Existing Financial Accounts
 *
 * Existing treasury accounts are already uniquely identified
 * by financial_accounts.account_code.
 *
 * GL code:
 *
 *   FA-{operational account code}
 *
 * Examples:
 *
 *   FA-CASH-001
 *   FA-BANK-001
 *
 *
 * Parent depends on operational account_type.
 * ========================================================= */

insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)

select
  'FA-'
  ||
  financial_account.account_code,

  financial_account.account_name,

  case

    when
      financial_account.account_type =
        'cash'
    then
      (
        select id
        from public.gl_accounts
        where account_code = '1110'
      )


    when
      financial_account.account_type =
        'bank'
    then
      (
        select id
        from public.gl_accounts
        where account_code = '1120'
      )


    when
      financial_account.account_type =
        'card'
    then
      (
        select id
        from public.gl_accounts
        where account_code = '1130'
      )


    when
      financial_account.account_type =
        'payment_gateway'
    then
      (
        select id
        from public.gl_accounts
        where account_code = '1140'
      )


    when
      financial_account.account_type =
        'clearing'
    then
      (
        select id
        from public.gl_accounts
        where account_code = '1150'
      )


    else
      (
        select id
        from public.gl_accounts
        where account_code = '1190'
      )

  end,

  'asset',

  'balance_sheet',

  'debit',

  'Operational treasury account: '
  ||
  financial_account.account_name,

  true,

  false,

  false,

  true,

  1100

from
  public.financial_accounts
    financial_account

on conflict (
  account_code
)

do update

set
  account_name =
    excluded.account_name,

  parent_id =
    excluded.parent_id,

  updated_at =
    now();


/* =========================================================
 * 16. Link Existing Financial Accounts to Their GL Accounts
 * ========================================================= */

update
  public.financial_accounts
    financial_account

set
  gl_account_id =
    gl_account.id

from
  public.gl_accounts
    gl_account

where
  gl_account.account_code =
    'FA-'
    ||
    financial_account.account_code

  and
    financial_account.gl_account_id
      is distinct from
    gl_account.id;


/* =========================================================
 * 17. Create Dedicated GL Accounts for Existing Expense
 *     Categories
 *
 * GL code:
 *
 *   EXP-{expense category code}
 *
 * Parent:
 *
 * direct     -> 6100
 * operating  -> 6200
 * financial  -> 7100
 * other      -> 7200
 * ========================================================= */

insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)

select
  'EXP-'
  ||
  expense_category.code,

  expense_category.name,

  case

    when
      expense_category.expense_type =
        'direct'
    then
      (
        select id
        from public.gl_accounts
        where account_code = '6100'
      )


    when
      expense_category.expense_type =
        'financial'
    then
      (
        select id
        from public.gl_accounts
        where account_code = '7100'
      )


    when
      expense_category.expense_type =
        'other'
    then
      (
        select id
        from public.gl_accounts
        where account_code = '7200'
      )


    else
      (
        select id
        from public.gl_accounts
        where account_code = '6200'
      )

  end,

  case

    when
      expense_category.expense_type in (
        'financial',
        'other'
      )
    then
      'other_expense'

    else
      'expense'

  end,

  'profit_loss',

  'debit',

  coalesce(
    expense_category.description,
    'Expense category: '
    ||
    expense_category.name
  ),

  true,

  false,

  true,

  false,

  6500

from
  public.expense_categories
    expense_category

on conflict (
  account_code
)

do update

set
  account_name =
    excluded.account_name,

  parent_id =
    excluded.parent_id,

  account_class =
    excluded.account_class,

  description =
    excluded.description,

  updated_at =
    now();


/* =========================================================
 * 18. Link Existing Expense Categories to GL
 * ========================================================= */

update
  public.expense_categories
    expense_category

set
  gl_account_id =
    gl_account.id

from
  public.gl_accounts
    gl_account

where
  gl_account.account_code =
    'EXP-'
    ||
    expense_category.code

  and
    expense_category.gl_account_id
      is distinct from
    gl_account.id;


/* =========================================================
 * 19. Seed Accounting Periods
 *
 * Automatically creates:
 *
 * previous fiscal year
 * current fiscal year
 * next fiscal year
 *
 * This avoids hard-coding 2026 into the migration.
 * ========================================================= */

insert into public.accounting_periods
(
  period_code,
  fiscal_year,
  period_number,
  date_from,
  date_to,
  status
)

select
  year_value::text
  ||
  '-'
  ||
  lpad(
    month_value::text,
    2,
    '0'
  ),

  year_value,

  month_value,

  make_date(
    year_value,
    month_value,
    1
  ),

  (
    make_date(
      year_value,
      month_value,
      1
    )
    +
    interval '1 month'
    -
    interval '1 day'
  )::date,

  'open'

from
  generate_series(
    extract(
      year
      from
      current_date
    )::integer
    -
    1,

    extract(
      year
      from
      current_date
    )::integer
    +
    1
  )
    as year_value

cross join
  generate_series(
    1,
    12
  )
    as month_value

on conflict (
  fiscal_year,
  period_number
)

do nothing;


/* =========================================================
 * 20. Journal Balance View
 *
 * This does NOT post journals.
 *
 * It is diagnostic infrastructure used by migration 088 and
 * future accounting screens.
 * ========================================================= */

create or replace view
  public.gl_journal_balance

with (
  security_invoker = true
)

as

select
  journal.id
    as journal_entry_id,

  journal.journal_number,

  journal.journal_date,

  journal.posting_date,

  journal.status,

  journal.source_type,

  journal.source_id,

  journal.source_number,

  count(
    line.id
  )
    as line_count,

  round(
    coalesce(
      sum(
        line.debit
      ),
      0
    ),
    2
  )
    as total_debit,

  round(
    coalesce(
      sum(
        line.credit
      ),
      0
    ),
    2
  )
    as total_credit,

  round(
    coalesce(
      sum(
        line.base_debit
      ),
      0
    ),
    2
  )
    as total_base_debit,

  round(
    coalesce(
      sum(
        line.base_credit
      ),
      0
    ),
    2
  )
    as total_base_credit,

  round(
    coalesce(
      sum(
        line.base_debit
      ),
      0
    )
    -
    coalesce(
      sum(
        line.base_credit
      ),
      0
    ),
    2
  )
    as base_difference,

  case

    when
      count(
        line.id
      )
      >=
      2

      and

      round(
        coalesce(
          sum(
            line.base_debit
          ),
          0
        ),
        2
      )
      =
      round(
        coalesce(
          sum(
            line.base_credit
          ),
          0
        ),
        2
      )

      and

      round(
        coalesce(
          sum(
            line.base_debit
          ),
          0
        ),
        2
      )
      >
      0

    then
      true

    else
      false

  end
    as is_balanced

from
  public.gl_journal_entries
    journal

left join
  public.gl_journal_lines
    line

  on
    line.journal_entry_id =
      journal.id

group by
  journal.id;


/* =========================================================
 * 21. Chart of Accounts Read View
 *
 * Exposes parent information and current operational mapping.
 * ========================================================= */

create or replace view
  public.gl_chart_of_accounts

with (
  security_invoker = true
)

as

select
  account.id,

  account.account_code,

  account.account_name,

  account.parent_id,

  parent.account_code
    as parent_account_code,

  parent.account_name
    as parent_account_name,

  account.account_class,

  account.statement_type,

  account.normal_balance,

  account.description,

  account.is_posting_account,

  account.is_control_account,

  account.allow_manual_posting,

  account.is_system_account,

  account.is_active,

  account.display_order,

  account.created_at,

  account.updated_at

from
  public.gl_accounts
    account

left join
  public.gl_accounts
    parent

  on
    parent.id =
      account.parent_id;


/* =========================================================
 * 22. RLS
 * ========================================================= */

alter table
  public.accounting_periods
enable row level security;


alter table
  public.gl_accounts
enable row level security;


alter table
  public.gl_journal_entries
enable row level security;


alter table
  public.gl_journal_lines
enable row level security;


alter table
  public.gl_account_mappings
enable row level security;


/* =========================================================
 * 23. Accounting Period Policies
 * ========================================================= */

drop policy if exists
  accounting_periods_admin_select
on
  public.accounting_periods;


create policy
  accounting_periods_admin_select

on
  public.accounting_periods

for select

to authenticated

using (
  public.is_admin()
);


drop policy if exists
  accounting_periods_admin_manage
on
  public.accounting_periods;


create policy
  accounting_periods_admin_manage

on
  public.accounting_periods

for all

to authenticated

using (
  public.is_admin()
)

with check (
  public.is_admin()
);


/* =========================================================
 * 24. Chart of Accounts Policies
 * ========================================================= */

drop policy if exists
  gl_accounts_admin_select
on
  public.gl_accounts;


create policy
  gl_accounts_admin_select

on
  public.gl_accounts

for select

to authenticated

using (
  public.is_admin()
);


drop policy if exists
  gl_accounts_admin_manage
on
  public.gl_accounts;


create policy
  gl_accounts_admin_manage

on
  public.gl_accounts

for all

to authenticated

using (
  public.is_admin()
)

with check (
  public.is_admin()
);


/* =========================================================
 * 25. Mapping Policies
 * ========================================================= */

drop policy if exists
  gl_account_mappings_admin_select
on
  public.gl_account_mappings;


create policy
  gl_account_mappings_admin_select

on
  public.gl_account_mappings

for select

to authenticated

using (
  public.is_admin()
);


drop policy if exists
  gl_account_mappings_admin_manage
on
  public.gl_account_mappings;


create policy
  gl_account_mappings_admin_manage

on
  public.gl_account_mappings

for all

to authenticated

using (
  public.is_admin()
)

with check (
  public.is_admin()
);


/* =========================================================
 * 26. Journal Policies
 *
 * IMPORTANT:
 *
 * Journals are READ ONLY to normal authenticated application
 * queries.
 *
 * We intentionally DO NOT create authenticated insert/update/
 * delete policies for journal entries and lines.
 *
 * Migration 088 will introduce controlled SECURITY DEFINER
 * posting/reversal RPCs.
 * ========================================================= */

drop policy if exists
  gl_journal_entries_admin_select
on
  public.gl_journal_entries;


create policy
  gl_journal_entries_admin_select

on
  public.gl_journal_entries

for select

to authenticated

using (
  public.is_admin()
);


drop policy if exists
  gl_journal_lines_admin_select
on
  public.gl_journal_lines;


create policy
  gl_journal_lines_admin_select

on
  public.gl_journal_lines

for select

to authenticated

using (
  public.is_admin()
);


/* =========================================================
 * 27. Grants
 * ========================================================= */

grant select
on
  public.accounting_periods
to authenticated;


grant select
on
  public.gl_accounts
to authenticated;


grant select
on
  public.gl_account_mappings
to authenticated;


grant select
on
  public.gl_journal_entries
to authenticated;


grant select
on
  public.gl_journal_lines
to authenticated;


grant select
on
  public.gl_journal_balance
to authenticated;


grant select
on
  public.gl_chart_of_accounts
to authenticated;


/*
 * Admin RLS permits management of Chart of Accounts,
 * mappings and accounting periods.
 *
 * Explicit table privileges are therefore also required.
 */

grant insert,
      update
on
  public.accounting_periods
to authenticated;


grant insert,
      update
on
  public.gl_accounts
to authenticated;


grant insert,
      update
on
  public.gl_account_mappings
to authenticated;


/*
 * No direct journal INSERT / UPDATE / DELETE grants.
 *
 * Posting will only happen through controlled RPC functions
 * beginning in migration 088.
 */


/* =========================================================
 * 28. RPC Permissions
 * ========================================================= */

revoke all
on function
  public.next_gl_journal_number(
    date
  )
from public;


grant execute
on function
  public.next_gl_journal_number(
    date
  )
to authenticated;


/* =========================================================
 * 29. Documentation
 * ========================================================= */

comment on table
  public.accounting_periods
is
  'Controls accounting posting periods. Closed periods cannot accept normal GL postings once the posting engine is enabled.';


comment on table
  public.gl_accounts
is
  'Hierarchical Chart of Accounts used by the formal double-entry General Ledger. Operational financial_accounts remain treasury subledger accounts and map into this table.';


comment on table
  public.gl_journal_entries
is
  'General Ledger journal headers. One journal represents one economic accounting event and is immutable after posting except through formal reversal.';


comment on table
  public.gl_journal_lines
is
  'Double-entry General Ledger lines containing document-currency and AED base-currency debit/credit amounts plus operational reconciliation dimensions.';


comment on table
  public.gl_account_mappings
is
  'Stable system accounting keys mapped to GL accounts so posting functions never hard-code GL account UUIDs.';


comment on column
  public.financial_accounts.gl_account_id
is
  'Maps an operational Cash/Bank/Card/Gateway/Clearing account to its formal General Ledger account.';


comment on column
  public.expense_categories.gl_account_id
is
  'Maps an operational expense category to its formal General Ledger expense account.';


comment on view
  public.gl_journal_balance
is
  'Diagnostic journal balance view showing debit/credit totals and whether every journal is balanced in AED base currency.';


comment on view
  public.gl_chart_of_accounts
is
  'Chart of Accounts read model including parent account information.';


comment on function
  public.next_gl_journal_number(
    date
  )
is
  'Generates the next General Ledger journal number in JE-YYYY-NNNNNN format.';