/* =========================================================
 * Migration 183
 * Customer & Supplier Opening Balances
 *
 * Production opening date: 2026-09-01
 *
 * PURPOSE
 * ---------------------------------------------------------
 * Introduce dedicated operational opening-balance sources for:
 *
 *   Customer Opening Receivable
 *     Dr Accounts Receivable
 *     Cr Opening Balance Equity
 *
 *   Supplier Opening Payable
 *     Dr Opening Balance Equity
 *     Cr Accounts Payable
 *
 * Opening balances:
 *
 *   - do NOT create Sales Orders
 *   - do NOT create Quick Purchases
 *   - do NOT post Revenue / Purchases
 *   - do NOT post VAT
 *   - do NOT move Inventory
 *   - do NOT move Cash / Bank
 *   - do NOT affect current-period P&L
 *
 * Later Customer Receipts / Supplier Payments may settle these
 * balances through the normal operational payment workflows.
 * ========================================================= */
/* =========================================================
 * 1. CUSTOMER OPENING BALANCES
 * ========================================================= */
create table public.customer_opening_balances (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  opening_date date not null,
  due_date date,
  reference_number text,
  currency_code text not null,
  exchange_rate numeric(18, 6) not null default 1,
  original_amount numeric(18, 2) not null,
  notes text,
  status text not null default 'posted',
  posted_at timestamptz not null default now(),
  posted_by uuid references auth.users(id) on delete restrict,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete restrict,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete restrict,
  constraint customer_opening_balances_currency_check check (
    upper(trim(currency_code)) ~ '^[A-Z]{3}$'
  ),
  constraint customer_opening_balances_exchange_rate_check check (exchange_rate > 0),
  constraint customer_opening_balances_amount_check check (original_amount > 0),
  constraint customer_opening_balances_status_check check (
    status in (
      'posted',
      'settled',
      'cancelled'
    )
  ),
  constraint customer_opening_balances_due_date_check check (
    due_date is null
    or due_date >= opening_date
  )
);

create index customer_opening_balances_customer_idx on public.customer_opening_balances (customer_id);

create index customer_opening_balances_open_idx on public.customer_opening_balances (customer_id, opening_date)
where
  status in ('posted', 'settled');

comment on table public.customer_opening_balances is 'Dedicated customer opening receivables. These balances represent pre-ERP Accounts Receivable and must not create revenue, VAT, inventory, treasury or Sales Order activity.';

/* =========================================================
 * 2. SUPPLIER OPENING BALANCES
 * ========================================================= */
create table public.supplier_opening_balances (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  opening_date date not null,
  due_date date,
  reference_number text,
  currency_code text not null,
  exchange_rate numeric(18, 6) not null default 1,
  original_amount numeric(18, 2) not null,
  notes text,
  status text not null default 'posted',
  posted_at timestamptz not null default now(),
  posted_by uuid references auth.users(id) on delete restrict,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete restrict,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete restrict,
  constraint supplier_opening_balances_currency_check check (
    upper(trim(currency_code)) ~ '^[A-Z]{3}$'
  ),
  constraint supplier_opening_balances_exchange_rate_check check (exchange_rate > 0),
  constraint supplier_opening_balances_amount_check check (original_amount > 0),
  constraint supplier_opening_balances_status_check check (
    status in (
      'posted',
      'settled',
      'cancelled'
    )
  ),
  constraint supplier_opening_balances_due_date_check check (
    due_date is null
    or due_date >= opening_date
  )
);

create index supplier_opening_balances_supplier_idx on public.supplier_opening_balances (supplier_id);

create index supplier_opening_balances_open_idx on public.supplier_opening_balances (supplier_id, opening_date)
where
  status in ('posted', 'settled');

comment on table public.supplier_opening_balances is 'Dedicated supplier opening payables. These balances represent pre-ERP Accounts Payable and must not create purchases, VAT, inventory, treasury or Quick Purchase activity.';

/* =========================================================
 * 3. CUSTOMER RECEIPT ALLOCATION TARGET
 *
 * Existing:
 *   Customer Receipt -> Sales Order
 *
 * New:
 *   Customer Receipt -> Sales Order
 *                    OR Customer Opening Balance
 * ========================================================= */
alter table
  public.customer_receipt_allocations
add
  column customer_opening_balance_id uuid;

alter table
  public.customer_receipt_allocations
alter column
  sales_order_id drop not null;

alter table
  public.customer_receipt_allocations
add
  constraint customer_receipt_allocations_opening_balance_fk foreign key (customer_opening_balance_id) references public.customer_opening_balances(id) on delete restrict;

/*
 * Remove the historical composite uniqueness constraint.
 *
 * The original model required every allocation to point to
 * a Sales Order. We now support two mutually-exclusive
 * allocation targets.
 */
alter table
  public.customer_receipt_allocations drop constraint if exists customer_receipt_allocation_unique;

/*
 * Exactly one target must be supplied.
 */
alter table
  public.customer_receipt_allocations
add
  constraint customer_receipt_allocation_target_check check (
    (sales_order_id is not null) :: integer + (
      customer_opening_balance_id is not null
    ) :: integer = 1
  );

/*
 * One allocation per target per receipt.
 */
create unique index customer_receipt_allocation_sales_order_unique on public.customer_receipt_allocations (receipt_id, sales_order_id)
where
  sales_order_id is not null;

create unique index customer_receipt_allocation_opening_balance_unique on public.customer_receipt_allocations (receipt_id, customer_opening_balance_id)
where
  customer_opening_balance_id is not null;

create index customer_receipt_allocations_opening_balance_idx on public.customer_receipt_allocations (customer_opening_balance_id)
where
  customer_opening_balance_id is not null;

/* =========================================================
 * 4. SUPPLIER PAYMENT ALLOCATION TARGET
 *
 * Existing:
 *   Supplier Payment -> Quick Purchase
 *                    OR Goods Receipt
 *
 * New:
 *   Supplier Payment -> Quick Purchase
 *                    OR Goods Receipt
 *                    OR Supplier Opening Balance
 * ========================================================= */
alter table
  public.supplier_payment_allocations
add
  column supplier_opening_balance_id uuid;

alter table
  public.supplier_payment_allocations
add
  constraint supplier_payment_allocations_opening_balance_fk foreign key (supplier_opening_balance_id) references public.supplier_opening_balances(id) on delete restrict;

/*
 * Replace the existing two-target constraint with a
 * three-target constraint.
 */
alter table
  public.supplier_payment_allocations drop constraint if exists supplier_payment_allocation_source_check;

alter table
  public.supplier_payment_allocations
add
  constraint supplier_payment_allocation_source_check check (
    (quick_purchase_id is not null) :: integer + (goods_receipt_id is not null) :: integer + (
      supplier_opening_balance_id is not null
    ) :: integer = 1
  );

/*
 * Opening balance allocations require their own uniqueness
 * and lookup indexes.
 */
create unique index supplier_payment_allocation_opening_balance_unique on public.supplier_payment_allocations (
  supplier_payment_id,
  supplier_opening_balance_id
)
where
  supplier_opening_balance_id is not null;

create index supplier_payment_allocations_opening_balance_idx on public.supplier_payment_allocations (supplier_opening_balance_id)
where
  supplier_opening_balance_id is not null;

/* =========================================================
 * 5. RLS
 * ========================================================= */
alter table
  public.customer_opening_balances enable row level security;

alter table
  public.supplier_opening_balances enable row level security;

/*
 * Authenticated ERP users may read opening balances.
 * Mutation is deliberately restricted to controlled
 * SECURITY DEFINER functions added later in this migration.
 */
create policy customer_opening_balances_select_authenticated on public.customer_opening_balances for
select
  to authenticated using (auth.uid() is not null);

create policy supplier_opening_balances_select_authenticated on public.supplier_opening_balances for
select
  to authenticated using (auth.uid() is not null);

/*
 * Explicit table grants.
 *
 * No direct INSERT / UPDATE / DELETE grants are provided.
 * Posting and cancellation must use the controlled functions.
 */
revoke
insert
,
update
,
  delete on public.customer_opening_balances
from
  authenticated;

revoke
insert
,
update
,
  delete on public.supplier_opening_balances
from
  authenticated;

grant
select
  on public.customer_opening_balances to authenticated;

grant
select
  on public.supplier_opening_balances to authenticated;

/* =========================================================
 * 6. CUSTOMER OPENING BALANCE OUTSTANDING AMOUNT
 * ========================================================= */
create
or replace function public.get_customer_opening_balance_outstanding(p_customer_opening_balance_id uuid) returns numeric language plpgsql security definer
set
  search_path = public as $$ declare v_original_amount numeric(18, 2);

v_status text;

v_allocated_amount numeric(18, 2);

begin
select
  original_amount,
  status into v_original_amount,
  v_status
from
  public.customer_opening_balances
where
  id = p_customer_opening_balance_id;

if not found then raise exception 'Customer Opening Balance was not found.';

end if;

if v_status = 'cancelled' then return 0;

end if;

select
  coalesce(sum(allocation.amount), 0) into v_allocated_amount
from
  public.customer_receipt_allocations allocation
  join public.customer_receipts receipt on receipt.id = allocation.receipt_id
where
  allocation.customer_opening_balance_id = p_customer_opening_balance_id
  and receipt.status = 'posted';

return greatest(
  round(
    v_original_amount - v_allocated_amount,
    2
  ),
  0
);

end;

$$;

/* =========================================================
 * 7. SUPPLIER OPENING BALANCE OUTSTANDING AMOUNT
 * ========================================================= */
create
or replace function public.get_supplier_opening_balance_outstanding(p_supplier_opening_balance_id uuid) returns numeric language plpgsql security definer
set
  search_path = public as $$ declare v_original_amount numeric(18, 2);

v_status text;

v_allocated_amount numeric(18, 2);

begin
select
  original_amount,
  status into v_original_amount,
  v_status
from
  public.supplier_opening_balances
where
  id = p_supplier_opening_balance_id;

if not found then raise exception 'Supplier Opening Balance was not found.';

end if;

if v_status = 'cancelled' then return 0;

end if;

select
  coalesce(sum(allocation.amount), 0) into v_allocated_amount
from
  public.supplier_payment_allocations allocation
  join public.supplier_payments payment on payment.id = allocation.supplier_payment_id
where
  allocation.supplier_opening_balance_id = p_supplier_opening_balance_id
  and payment.status = 'posted';

return greatest(
  round(
    v_original_amount - v_allocated_amount,
    2
  ),
  0
);

end;

$$;

/* =========================================================
 * 8. SYNCHRONIZE CUSTOMER OPENING BALANCE STATUS
 * ========================================================= */
create
or replace function public.sync_customer_opening_balance_status(p_customer_opening_balance_id uuid) returns void language plpgsql security definer
set
  search_path = public as $$ declare v_status text;

v_outstanding numeric(18, 2);

begin
select
  status into v_status
from
  public.customer_opening_balances
where
  id = p_customer_opening_balance_id for
update
;

if not found then raise exception 'Customer Opening Balance was not found.';

end if;

if v_status = 'cancelled' then return;

end if;

v_outstanding := public.get_customer_opening_balance_outstanding(p_customer_opening_balance_id);

perform set_config(
  'erp.customer_opening_balance_sync',
  '1',
  true
);

update
  public.customer_opening_balances
set
  status = case
    when v_outstanding <= 0 then 'settled'
    else 'posted'
  end
where
  id = p_customer_opening_balance_id;

perform set_config(
  'erp.customer_opening_balance_sync',
  '',
  true
);

end;

$$;

/* =========================================================
 * 9. SYNCHRONIZE SUPPLIER OPENING BALANCE STATUS
 * ========================================================= */
create
or replace function public.sync_supplier_opening_balance_status(p_supplier_opening_balance_id uuid) returns void language plpgsql security definer
set
  search_path = public as $$ declare v_status text;

v_outstanding numeric(18, 2);

begin
select
  status into v_status
from
  public.supplier_opening_balances
where
  id = p_supplier_opening_balance_id for
update
;

if not found then raise exception 'Supplier Opening Balance was not found.';

end if;

if v_status = 'cancelled' then return;

end if;

v_outstanding := public.get_supplier_opening_balance_outstanding(p_supplier_opening_balance_id);

perform set_config(
  'erp.supplier_opening_balance_sync',
  '1',
  true
);

update
  public.supplier_opening_balances
set
  status = case
    when v_outstanding <= 0 then 'settled'
    else 'posted'
  end
where
  id = p_supplier_opening_balance_id;

perform set_config(
  'erp.supplier_opening_balance_sync',
  '',
  true
);

end;

$$;

/* =========================================================
 * 10. POST CUSTOMER OPENING BALANCE
 *
 * Dr Accounts Receivable
 * Cr Opening Balance Equity
 * ========================================================= */
create
or replace function public.post_customer_opening_balance(
  p_customer_id uuid,
  p_opening_date date,
  p_due_date date,
  p_reference_number text,
  p_currency_code text,
  p_exchange_rate numeric,
  p_amount numeric,
  p_notes text
) returns uuid language plpgsql security definer
set
  search_path = public as $$ declare v_user_id uuid;

v_opening_balance_id uuid;

v_ar_account_id uuid;

v_equity_account_id uuid;

v_currency_code text;

v_base_amount numeric(18, 2);

v_lines jsonb;

v_journal_id uuid;

begin v_user_id := auth.uid();

if v_user_id is null then raise exception 'Authentication is required.';

end if;

if not public.is_admin() then raise exception 'Administrator access is required.';

end if;

perform 1
from
  public.customers
where
  id = p_customer_id
  and status = 'active';

if not found then raise exception 'The selected customer was not found or is inactive.';

end if;

if p_opening_date is null then raise exception 'Opening date is required.';

end if;

if p_due_date is not null
and p_due_date < p_opening_date then raise exception 'Due date cannot be earlier than opening date.';

end if;

if p_amount is null
or p_amount <= 0 then raise exception 'Customer opening receivable must be greater than zero.';

end if;

if p_exchange_rate is null
or p_exchange_rate <= 0 then raise exception 'Exchange rate must be greater than zero.';

end if;

v_currency_code := upper(
  trim(
    coalesce(p_currency_code, '')
  )
);

if v_currency_code !~ '^[A-Z]{3}$' then raise exception 'A valid three-letter currency code is required.';

end if;

/*
 * Initial production opening-balance workflow is AED only.
 *
 * Foreign-currency historical balances require a separate
 * FX opening/revaluation policy and must not be silently
 * introduced through this migration.
 */
if v_currency_code <> 'AED' then raise exception 'Customer opening balances currently support AED only.';

end if;

if abs(p_exchange_rate - 1) > 0.000001 then raise exception 'AED customer opening balances require exchange rate 1.';

end if;

insert into
  public.customer_opening_balances (
    customer_id,
    opening_date,
    due_date,
    reference_number,
    currency_code,
    exchange_rate,
    original_amount,
    notes,
    status,
    posted_at,
    posted_by,
    created_by
  )
values
  (
    p_customer_id,
    p_opening_date,
    p_due_date,
    nullif(
      trim(
        coalesce(
          p_reference_number,
          ''
        )
      ),
      ''
    ),
    v_currency_code,
    p_exchange_rate,
    round(p_amount, 2),
    nullif(
      trim(coalesce(p_notes, '')),
      ''
    ),
    'posted',
    now(),
    v_user_id,
    v_user_id
  ) returning id into v_opening_balance_id;

v_ar_account_id := public.get_mapped_gl_account('accounts_receivable');

v_equity_account_id := public.get_mapped_gl_account('opening_balance_equity');

v_base_amount := round(p_amount * p_exchange_rate, 2);

v_lines := jsonb_build_array(
  jsonb_build_object(
    'glAccountId',
    v_ar_account_id,
    'debit',
    round(p_amount, 2),
    'credit',
    0,
    'baseDebit',
    v_base_amount,
    'baseCredit',
    0,
    'description',
    'Customer Opening Receivable',
    'customerId',
    p_customer_id
  ),
  jsonb_build_object(
    'glAccountId',
    v_equity_account_id,
    'debit',
    0,
    'credit',
    round(p_amount, 2),
    'baseDebit',
    0,
    'baseCredit',
    v_base_amount,
    'description',
    'Customer Opening Balance Equity',
    'customerId',
    p_customer_id
  )
);

v_journal_id := public.post_erp_gl_journal(
  'customer_opening_balance',
  v_opening_balance_id,
  coalesce(
    nullif(
      trim(
        coalesce(
          p_reference_number,
          ''
        )
      ),
      ''
    ),
    v_opening_balance_id :: text
  ),
  p_opening_date,
  p_opening_date,
  'Customer Opening Receivable',
  v_currency_code,
  p_exchange_rate,
  v_lines
);

if v_journal_id is null then raise exception 'Customer Opening Balance GL posting did not return a journal.';

end if;

return v_opening_balance_id;

end;

$$;

/* =========================================================
 * 11. POST SUPPLIER OPENING BALANCE
 *
 * Dr Opening Balance Equity
 * Cr Accounts Payable
 * ========================================================= */
create
or replace function public.post_supplier_opening_balance(
  p_supplier_id uuid,
  p_opening_date date,
  p_due_date date,
  p_reference_number text,
  p_currency_code text,
  p_exchange_rate numeric,
  p_amount numeric,
  p_notes text
) returns uuid language plpgsql security definer
set
  search_path = public as $$ declare v_user_id uuid;

v_opening_balance_id uuid;

v_ap_account_id uuid;

v_equity_account_id uuid;

v_currency_code text;

v_base_amount numeric(18, 2);

v_lines jsonb;

v_journal_id uuid;

begin v_user_id := auth.uid();

if v_user_id is null then raise exception 'Authentication is required.';

end if;

if not public.is_admin() then raise exception 'Administrator access is required.';

end if;

perform 1
from
  public.suppliers
where
  id = p_supplier_id
  and is_active = true;

if not found then raise exception 'The selected supplier was not found or is inactive.';

end if;

if p_opening_date is null then raise exception 'Opening date is required.';

end if;

if p_due_date is not null
and p_due_date < p_opening_date then raise exception 'Due date cannot be earlier than opening date.';

end if;

if p_amount is null
or p_amount <= 0 then raise exception 'Supplier opening payable must be greater than zero.';

end if;

if p_exchange_rate is null
or p_exchange_rate <= 0 then raise exception 'Exchange rate must be greater than zero.';

end if;

v_currency_code := upper(
  trim(
    coalesce(p_currency_code, '')
  )
);

if v_currency_code !~ '^[A-Z]{3}$' then raise exception 'A valid three-letter currency code is required.';

end if;

if v_currency_code <> 'AED' then raise exception 'Supplier opening balances currently support AED only.';

end if;

if abs(p_exchange_rate - 1) > 0.000001 then raise exception 'AED supplier opening balances require exchange rate 1.';

end if;

insert into
  public.supplier_opening_balances (
    supplier_id,
    opening_date,
    due_date,
    reference_number,
    currency_code,
    exchange_rate,
    original_amount,
    notes,
    status,
    posted_at,
    posted_by,
    created_by
  )
values
  (
    p_supplier_id,
    p_opening_date,
    p_due_date,
    nullif(
      trim(
        coalesce(
          p_reference_number,
          ''
        )
      ),
      ''
    ),
    v_currency_code,
    p_exchange_rate,
    round(p_amount, 2),
    nullif(
      trim(coalesce(p_notes, '')),
      ''
    ),
    'posted',
    now(),
    v_user_id,
    v_user_id
  ) returning id into v_opening_balance_id;

v_ap_account_id := public.get_mapped_gl_account('accounts_payable');

v_equity_account_id := public.get_mapped_gl_account('opening_balance_equity');

v_base_amount := round(p_amount * p_exchange_rate, 2);

v_lines := jsonb_build_array(
  jsonb_build_object(
    'glAccountId',
    v_equity_account_id,
    'debit',
    round(p_amount, 2),
    'credit',
    0,
    'baseDebit',
    v_base_amount,
    'baseCredit',
    0,
    'description',
    'Supplier Opening Balance Equity',
    'supplierId',
    p_supplier_id
  ),
  jsonb_build_object(
    'glAccountId',
    v_ap_account_id,
    'debit',
    0,
    'credit',
    round(p_amount, 2),
    'baseDebit',
    0,
    'baseCredit',
    v_base_amount,
    'description',
    'Supplier Opening Payable',
    'supplierId',
    p_supplier_id
  )
);

v_journal_id := public.post_erp_gl_journal(
  'supplier_opening_balance',
  v_opening_balance_id,
  coalesce(
    nullif(
      trim(
        coalesce(
          p_reference_number,
          ''
        )
      ),
      ''
    ),
    v_opening_balance_id :: text
  ),
  p_opening_date,
  p_opening_date,
  'Supplier Opening Payable',
  v_currency_code,
  p_exchange_rate,
  v_lines
);

if v_journal_id is null then raise exception 'Supplier Opening Balance GL posting did not return a journal.';

end if;

return v_opening_balance_id;

end;

$$;

/* =========================================================
 * 12. CANCEL CUSTOMER OPENING BALANCE
 * ========================================================= */
create
or replace function public.cancel_customer_opening_balance(
  p_customer_opening_balance_id uuid,
  p_reversal_date date,
  p_reason text
) returns uuid language plpgsql security definer
set
  search_path = public as $$ declare v_user_id uuid;

v_status text;

v_allocation_count integer;

v_reversal_id uuid;

begin v_user_id := auth.uid();

if v_user_id is null then raise exception 'Authentication is required.';

end if;

if not public.is_admin() then raise exception 'Administrator access is required.';

end if;

if p_reversal_date is null then raise exception 'Reversal date is required.';

end if;

if nullif(
  trim(coalesce(p_reason, '')),
  ''
) is null then raise exception 'Cancellation reason is required.';

end if;

select
  status into v_status
from
  public.customer_opening_balances
where
  id = p_customer_opening_balance_id for
update
;

if not found then raise exception 'Customer Opening Balance was not found.';

end if;

if v_status = 'cancelled' then raise exception 'Customer Opening Balance is already cancelled.';

end if;

select
  count(*) into v_allocation_count
from
  public.customer_receipt_allocations allocation
  join public.customer_receipts receipt on receipt.id = allocation.receipt_id
where
  allocation.customer_opening_balance_id = p_customer_opening_balance_id
  and receipt.status = 'posted';

if v_allocation_count > 0 then raise exception 'Customer Opening Balance cannot be cancelled while posted Customer Receipt allocations exist.';

end if;

v_reversal_id := public.reverse_erp_source_gl_journal(
  'customer_opening_balance',
  p_customer_opening_balance_id,
  p_reversal_date,
  trim(p_reason)
);

perform set_config(
  'erp.customer_opening_balance_cancel',
  '1',
  true
);

update
  public.customer_opening_balances
set
  status = 'cancelled',
  cancelled_at = now(),
  cancelled_by = v_user_id,
  cancellation_reason = trim(p_reason)
where
  id = p_customer_opening_balance_id;

perform set_config(
  'erp.customer_opening_balance_cancel',
  '',
  true
);

return v_reversal_id;

end;

$$;

/* =========================================================
 * 13. CANCEL SUPPLIER OPENING BALANCE
 * ========================================================= */
create
or replace function public.cancel_supplier_opening_balance(
  p_supplier_opening_balance_id uuid,
  p_reversal_date date,
  p_reason text
) returns uuid language plpgsql security definer
set
  search_path = public as $$ declare v_user_id uuid;

v_status text;

v_allocation_count integer;

v_reversal_id uuid;

begin v_user_id := auth.uid();

if v_user_id is null then raise exception 'Authentication is required.';

end if;

if not public.is_admin() then raise exception 'Administrator access is required.';

end if;

if p_reversal_date is null then raise exception 'Reversal date is required.';

end if;

if nullif(
  trim(coalesce(p_reason, '')),
  ''
) is null then raise exception 'Cancellation reason is required.';

end if;

select
  status into v_status
from
  public.supplier_opening_balances
where
  id = p_supplier_opening_balance_id for
update
;

if not found then raise exception 'Supplier Opening Balance was not found.';

end if;

if v_status = 'cancelled' then raise exception 'Supplier Opening Balance is already cancelled.';

end if;

select
  count(*) into v_allocation_count
from
  public.supplier_payment_allocations allocation
  join public.supplier_payments payment on payment.id = allocation.supplier_payment_id
where
  allocation.supplier_opening_balance_id = p_supplier_opening_balance_id
  and payment.status = 'posted';

if v_allocation_count > 0 then raise exception 'Supplier Opening Balance cannot be cancelled while posted Supplier Payment allocations exist.';

end if;

v_reversal_id := public.reverse_erp_source_gl_journal(
  'supplier_opening_balance',
  p_supplier_opening_balance_id,
  p_reversal_date,
  trim(p_reason)
);

perform set_config(
  'erp.supplier_opening_balance_cancel',
  '1',
  true
);

update
  public.supplier_opening_balances
set
  status = 'cancelled',
  cancelled_at = now(),
  cancelled_by = v_user_id,
  cancellation_reason = trim(p_reason)
where
  id = p_supplier_opening_balance_id;

perform set_config(
  'erp.supplier_opening_balance_cancel',
  '',
  true
);

return v_reversal_id;

end;

$$;

/* =========================================================
 * 14. CUSTOMER RECEIPT ALLOCATION LIFECYCLE
 *
 * Supported targets:
 *
 *   - Sales Order
 *   - Customer Opening Balance
 *
 * Exactly-one-target is additionally enforced by the table
 * CHECK constraint created earlier in this migration.
 * ========================================================= */
create
or replace function public.guard_customer_receipt_allocation_lifecycle() returns trigger language plpgsql
set
  search_path = public as $$ declare v_receipt_status text;

v_sales_order_status text;

v_opening_status text;

v_opening_customer_id uuid;

v_receipt_customer_id uuid;

v_advance_guard boolean := coalesce(
  current_setting(
    'erp.customer_advance_application',
    true
  ),
  ''
) = '1';

begin
/* =======================================================
 * INSERT
 * ======================================================= */
if tg_op = 'INSERT' then
select
  status,
  customer_id into v_receipt_status,
  v_receipt_customer_id
from
  public.customer_receipts
where
  id = new.receipt_id;

if not found then raise exception 'Customer Receipt was not found.';

end if;

/* -----------------------------------------------------
 * Sales Order target
 * ----------------------------------------------------- */
if new.sales_order_id is not null then
select
  status into v_sales_order_status
from
  public.sales_orders
where
  id = new.sales_order_id;

if not found then raise exception 'Sales Order was not found.';

end if;

if v_sales_order_status in ('draft', 'cancelled') then raise exception 'Customer Receipt allocations cannot be applied to Draft or Cancelled Sales Orders.';

end if;

/* -----------------------------------------------------
 * Customer Opening Balance target
 * ----------------------------------------------------- */
elsif new.customer_opening_balance_id is not null then
select
  status,
  customer_id into v_opening_status,
  v_opening_customer_id
from
  public.customer_opening_balances
where
  id = new.customer_opening_balance_id;

if not found then raise exception 'Customer Opening Balance was not found.';

end if;

if v_opening_status = 'cancelled' then raise exception 'Customer Receipt allocations cannot be applied to a Cancelled Customer Opening Balance.';

end if;

if v_opening_customer_id <> v_receipt_customer_id then raise exception 'Customer Receipt and Customer Opening Balance must belong to the same customer.';

end if;

else raise exception 'Customer Receipt allocation requires a Sales Order or Customer Opening Balance target.';

end if;

/*
 * Initial allocations are created while the receipt
 * itself is Draft.
 */
if v_receipt_status = 'draft' then return new;

end if;

/*
 * Later allocations against an already Posted receipt
 * remain controlled Customer Advance applications.
 */
if v_receipt_status = 'posted'
and v_advance_guard then return new;

end if;

if v_receipt_status = 'cancelled' then raise exception 'Allocations cannot be added to a Cancelled Customer Receipt.';

end if;

raise exception 'Allocations cannot be added to a Posted Customer Receipt outside the controlled Customer Advance workflow.';

end if;

/* =======================================================
 * UPDATE
 * ======================================================= */
if tg_op = 'UPDATE' then
select
  status into v_receipt_status
from
  public.customer_receipts
where
  id = old.receipt_id;

if not found then raise exception 'Original Customer Receipt was not found.';

end if;

if v_receipt_status in ('posted', 'cancelled') then raise exception 'Allocations belonging to Posted or Cancelled Customer Receipts are immutable.';

end if;

/*
 * If receipt_id changes, destination receipt must
 * still be Draft.
 */
if new.receipt_id <> old.receipt_id then
select
  status,
  customer_id into v_receipt_status,
  v_receipt_customer_id
from
  public.customer_receipts
where
  id = new.receipt_id;

if not found then raise exception 'Destination Customer Receipt was not found.';

end if;

if v_receipt_status <> 'draft' then raise exception 'Allocations can only be moved to Draft Customer Receipts.';

end if;

else
select
  customer_id into v_receipt_customer_id
from
  public.customer_receipts
where
  id = new.receipt_id;

end if;

/* -----------------------------------------------------
 * Validate new Sales Order target
 * ----------------------------------------------------- */
if new.sales_order_id is not null then
select
  status into v_sales_order_status
from
  public.sales_orders
where
  id = new.sales_order_id;

if not found then raise exception 'Sales Order was not found.';

end if;

if v_sales_order_status in ('draft', 'cancelled') then raise exception 'Customer Receipt allocations cannot be applied to Draft or Cancelled Sales Orders.';

end if;

/* -----------------------------------------------------
 * Validate new Customer Opening Balance target
 * ----------------------------------------------------- */
elsif new.customer_opening_balance_id is not null then
select
  status,
  customer_id into v_opening_status,
  v_opening_customer_id
from
  public.customer_opening_balances
where
  id = new.customer_opening_balance_id;

if not found then raise exception 'Customer Opening Balance was not found.';

end if;

if v_opening_status = 'cancelled' then raise exception 'Customer Receipt allocations cannot be applied to a Cancelled Customer Opening Balance.';

end if;

if v_opening_customer_id <> v_receipt_customer_id then raise exception 'Customer Receipt and Customer Opening Balance must belong to the same customer.';

end if;

else raise exception 'Customer Receipt allocation requires a Sales Order or Customer Opening Balance target.';

end if;

return new;

end if;

/* =======================================================
 * DELETE
 * ======================================================= */
if tg_op = 'DELETE' then
select
  status into v_receipt_status
from
  public.customer_receipts
where
  id = old.receipt_id;

if not found then raise exception 'Customer Receipt was not found.';

end if;

if v_receipt_status in ('posted', 'cancelled') then raise exception 'Allocations belonging to Posted or Cancelled Customer Receipts cannot be deleted.';

end if;

return old;

end if;

raise exception 'Unsupported Customer Receipt Allocation lifecycle operation.';

end;

$$;

/* =========================================================
 * 15. CUSTOMER RECEIPT POSTING
 *
 * Extends the existing Customer Receipt engine to support:
 *
 *   - Sales Order allocations
 *   - Customer Opening Balance allocations
 *
 * Existing external signature is intentionally unchanged.
 * ========================================================= */
create
or replace function public.post_customer_receipt(
  p_customer_id uuid,
  p_receipt_date date,
  p_payment_method text,
  p_currency_code text,
  p_exchange_rate numeric,
  p_amount numeric,
  p_reference_number text,
  p_bank_name text,
  p_cheque_number text,
  p_cheque_date date,
  p_notes text,
  p_allocations jsonb
) returns uuid language plpgsql security definer
set
  search_path = public as $$ declare v_user_id uuid;

v_receipt_id uuid;

v_receipt_number text;

v_allocation jsonb;

v_sales_order_id uuid;

v_customer_opening_balance_id uuid;

v_allocation_amount numeric(18, 2);

v_order_customer_id uuid;

v_order_currency text;

v_order_grand_total numeric(18, 2);

v_opening_customer_id uuid;

v_opening_currency text;

v_opening_original_amount numeric(18, 2);

v_opening_status text;

v_existing_other_allocations numeric(18, 2);

v_total_allocated numeric(18, 2) := 0;

v_target_key text;

begin
/* =======================================================
 * Security
 * ======================================================= */
v_user_id := auth.uid();

if v_user_id is null then raise exception 'Authentication is required.';

end if;

if not public.is_admin() then raise exception 'You are not authorized to post customer receipts.';

end if;

/* =======================================================
 * Customer
 * ======================================================= */
perform 1
from
  public.customers
where
  id = p_customer_id
  and status = 'active';

if not found then raise exception 'The selected customer was not found or is inactive.';

end if;

/* =======================================================
 * Receipt Validation
 * ======================================================= */
if p_amount is null
or p_amount <= 0 then raise exception 'Receipt amount must be greater than zero.';

end if;

if p_exchange_rate is null
or p_exchange_rate <= 0 then raise exception 'Exchange rate must be greater than zero.';

end if;

if upper(
  trim(
    coalesce(p_currency_code, '')
  )
) !~ '^[A-Z]{3}$' then raise exception 'A valid three-letter currency code is required.';

end if;

if p_payment_method not in (
  'cash',
  'bank',
  'card',
  'cheque',
  'other'
) then raise exception 'Invalid payment method.';

end if;

/* =======================================================
 * Allocation Array
 * ======================================================= */
if p_allocations is null then p_allocations := '[]' :: jsonb;

end if;

if jsonb_typeof(p_allocations) <> 'array' then raise exception 'Receipt allocations must be an array.';

end if;

/*
 * Every allocation must contain exactly one target.
 */
for v_allocation in
select
  *
from
  jsonb_array_elements(p_allocations) loop if (
    nullif(
      trim(
        coalesce(
          v_allocation ->> 'sales_order_id',
          ''
        )
      ),
      ''
    ) is not null
  ) :: integer + (
    nullif(
      trim(
        coalesce(
          v_allocation ->> 'customer_opening_balance_id',
          ''
        )
      ),
      ''
    ) is not null
  ) :: integer <> 1 then raise exception 'Each Customer Receipt allocation must contain exactly one Sales Order ID or Customer Opening Balance ID.';

end if;

end loop;

/*
 * Prevent duplicate targets inside the same receipt.
 */
if (
  select
    count(*)
  from
    jsonb_array_elements(p_allocations)
) <> (
  select
    count(
      distinct case
        when nullif(
          allocation ->> 'sales_order_id',
          ''
        ) is not null then 'sales_order:' || (
          allocation ->> 'sales_order_id'
        )
        else 'customer_opening_balance:' || (
          allocation ->> 'customer_opening_balance_id'
        )
      end
    )
  from
    jsonb_array_elements(p_allocations) as allocation
) then raise exception 'The same receivable source cannot appear more than once in one Customer Receipt.';

end if;

/* =======================================================
 * Validate Allocations
 * ======================================================= */
for v_allocation in
select
  *
from
  jsonb_array_elements(p_allocations) loop v_sales_order_id := null;

v_customer_opening_balance_id := null;

v_target_key := null;

begin v_allocation_amount := (v_allocation ->> 'amount') :: numeric;

exception
when others then raise exception 'A valid allocation amount is required.';

end;

if v_allocation_amount is null
or v_allocation_amount <= 0 then raise exception 'Allocation amount must be greater than zero.';

end if;

/* -----------------------------------------------------
 * Sales Order
 * ----------------------------------------------------- */
if nullif(
  trim(
    coalesce(
      v_allocation ->> 'sales_order_id',
      ''
    )
  ),
  ''
) is not null then begin v_sales_order_id := (v_allocation ->> 'sales_order_id') :: uuid;

exception
when others then raise exception 'A valid Sales Order ID is required.';

end;

select
  customer_id,
  currency_code,
  grand_total into v_order_customer_id,
  v_order_currency,
  v_order_grand_total
from
  public.sales_orders
where
  id = v_sales_order_id
  and status <> 'cancelled' for
update
;

if not found then raise exception 'The selected Sales Order was not found or is cancelled.';

end if;

if v_order_customer_id <> p_customer_id then raise exception 'All receipt allocations must belong to the selected customer.';

end if;

if upper(v_order_currency) <> upper(p_currency_code) then raise exception 'Receipt currency must match the Sales Order currency.';

end if;

select
  coalesce(sum(allocation.amount), 0) into v_existing_other_allocations
from
  public.customer_receipt_allocations allocation
  join public.customer_receipts receipt on receipt.id = allocation.receipt_id
where
  allocation.sales_order_id = v_sales_order_id
  and receipt.status = 'posted';

if v_existing_other_allocations + v_allocation_amount > v_order_grand_total then raise exception 'Receipt allocation exceeds the outstanding Sales Order balance.';

end if;

v_target_key := 'sales_order:' || v_sales_order_id :: text;

/* -----------------------------------------------------
 * Customer Opening Balance
 * ----------------------------------------------------- */
else begin v_customer_opening_balance_id := (
  v_allocation ->> 'customer_opening_balance_id'
) :: uuid;

exception
when others then raise exception 'A valid Customer Opening Balance ID is required.';

end;

select
  customer_id,
  currency_code,
  original_amount,
  status into v_opening_customer_id,
  v_opening_currency,
  v_opening_original_amount,
  v_opening_status
from
  public.customer_opening_balances
where
  id = v_customer_opening_balance_id for
update
;

if not found then raise exception 'The selected Customer Opening Balance was not found.';

end if;

if v_opening_status = 'cancelled' then raise exception 'The selected Customer Opening Balance is cancelled.';

end if;

if v_opening_status = 'settled' then raise exception 'The selected Customer Opening Balance is already settled.';

end if;

if v_opening_customer_id <> p_customer_id then raise exception 'Customer Opening Balance does not belong to the selected customer.';

end if;

if upper(v_opening_currency) <> upper(p_currency_code) then raise exception 'Receipt currency must match the Customer Opening Balance currency.';

end if;

select
  coalesce(sum(allocation.amount), 0) into v_existing_other_allocations
from
  public.customer_receipt_allocations allocation
  join public.customer_receipts receipt on receipt.id = allocation.receipt_id
where
  allocation.customer_opening_balance_id = v_customer_opening_balance_id
  and receipt.status = 'posted';

if v_existing_other_allocations + v_allocation_amount > v_opening_original_amount then raise exception 'Receipt allocation exceeds the outstanding Customer Opening Balance.';

end if;

v_target_key := 'customer_opening_balance:' || v_customer_opening_balance_id :: text;

end if;

if v_target_key is null then raise exception 'Unable to resolve Customer Receipt allocation target.';

end if;

v_total_allocated := v_total_allocated + v_allocation_amount;

end loop;

if v_total_allocated > p_amount then raise exception 'Total allocations cannot exceed the receipt amount.';

end if;

/* =======================================================
 * Receipt Header
 * ======================================================= */
v_receipt_number := public.generate_customer_receipt_number();

insert into
  public.customer_receipts (
    receipt_number,
    customer_id,
    receipt_date,
    payment_method,
    currency_code,
    exchange_rate,
    amount,
    allocated_amount,
    unallocated_amount,
    reference_number,
    bank_name,
    cheque_number,
    cheque_date,
    notes,
    status,
    posted_at,
    posted_by,
    created_by
  )
values
  (
    v_receipt_number,
    p_customer_id,
    coalesce(
      p_receipt_date,
      current_date
    ),
    p_payment_method,
    upper(trim(p_currency_code)),
    p_exchange_rate,
    round(p_amount, 2),
    0,
    round(p_amount, 2),
    nullif(
      trim(
        coalesce(
          p_reference_number,
          ''
        )
      ),
      ''
    ),
    nullif(
      trim(coalesce(p_bank_name, '')),
      ''
    ),
    nullif(
      trim(
        coalesce(
          p_cheque_number,
          ''
        )
      ),
      ''
    ),
    p_cheque_date,
    nullif(
      trim(coalesce(p_notes, '')),
      ''
    ),
    'draft',
    null,
    null,
    v_user_id
  ) returning id into v_receipt_id;

/* =======================================================
 * Allocation Rows
 * ======================================================= */
for v_allocation in
select
  *
from
  jsonb_array_elements(p_allocations) loop v_sales_order_id := null;

v_customer_opening_balance_id := null;

v_allocation_amount := (v_allocation ->> 'amount') :: numeric;

if nullif(
  trim(
    coalesce(
      v_allocation ->> 'sales_order_id',
      ''
    )
  ),
  ''
) is not null then v_sales_order_id := (v_allocation ->> 'sales_order_id') :: uuid;

else v_customer_opening_balance_id := (
  v_allocation ->> 'customer_opening_balance_id'
) :: uuid;

end if;

insert into
  public.customer_receipt_allocations (
    receipt_id,
    sales_order_id,
    customer_opening_balance_id,
    amount
  )
values
  (
    v_receipt_id,
    v_sales_order_id,
    v_customer_opening_balance_id,
    round(v_allocation_amount, 2)
  );

end loop;

perform public.sync_customer_receipt_totals(v_receipt_id);

/* =======================================================
 * Post Receipt
 * ======================================================= */
update
  public.customer_receipts
set
  status = 'posted',
  posted_at = now(),
  posted_by = v_user_id
where
  id = v_receipt_id;

/* =======================================================
 * Synchronize Receivable Targets
 * ======================================================= */
for v_allocation in
select
  *
from
  jsonb_array_elements(p_allocations) loop if nullif(
    trim(
      coalesce(
        v_allocation ->> 'sales_order_id',
        ''
      )
    ),
    ''
  ) is not null then perform public.sync_sales_order_paid_amount(
    (v_allocation ->> 'sales_order_id') :: uuid
  );

else perform public.sync_customer_opening_balance_status(
  (
    v_allocation ->> 'customer_opening_balance_id'
  ) :: uuid
);

end if;

end loop;

return v_receipt_id;

end;

$$;

/* =========================================================
 * 16. SECURITY
 *
 * post_customer_receipt() remains an internal lower-level
 * accounting function.
 *
 * ERP UI must continue through:
 *   post_customer_receipt_with_account(...)
 * ========================================================= */
revoke all on function public.post_customer_receipt(
  uuid,
  date,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  text,
  date,
  text,
  jsonb
)
from
  public,
  anon,
  authenticated;

/* =========================================================
 * Migration 183 - Part E
 * Supplier Payment -> Supplier Opening Balance Settlement
 *
 * Existing supported payable targets:
 *   - Quick Purchase
 *   - Goods Receipt
 *
 * New supported payable target:
 *   - Supplier Opening Balance
 *
 * Accounting behaviour is intentionally unchanged.
 *
 * All normal Supplier Payment allocations continue to use:
 *
 *     allocation_source = 'payment_posting'
 *
 * Therefore the existing Supplier Payment GL engine treats
 * an allocated Supplier Opening Balance payment as:
 *
 *     Dr Accounts Payable
 *     Cr Cash / Bank
 *
 * No Purchase, VAT or Inventory transaction is created.
 * ========================================================= */
create
or replace function public.post_supplier_payment(
  p_supplier_id uuid,
  p_payment_date date,
  p_payment_method text,
  p_currency_code text,
  p_exchange_rate numeric,
  p_amount numeric,
  p_reference_number text,
  p_bank_name text,
  p_cheque_number text,
  p_cheque_date date,
  p_notes text,
  p_allocations jsonb
) returns uuid language plpgsql security definer
set
  search_path = public as $$ declare v_user_id uuid;

v_payment_id uuid;

v_payment_number text;

v_allocation jsonb;

v_quick_purchase_id uuid;

v_goods_receipt_id uuid;

v_supplier_opening_balance_id uuid;

v_allocation_amount numeric(18, 2);

v_source_type text;

v_source_key text;

/* Quick Purchase */
v_purchase_supplier_id uuid;

v_purchase_currency text;

v_purchase_grand_total numeric(18, 2);

v_purchase_opening_amount numeric(18, 2);

/* Goods Receipt */
v_receipt_supplier_id uuid;

v_receipt_currency text;

v_receipt_status text;

v_receipt_payable_amount numeric(18, 2);

/* Supplier Opening Balance */
v_opening_supplier_id uuid;

v_opening_currency text;

v_opening_status text;

v_opening_original_amount numeric(18, 2);

/* Shared allocation calculations */
v_existing_allocations numeric(18, 2);

v_current_paid numeric(18, 2);

v_total_allocated numeric(18, 2) := 0;

begin
/* =====================================================
 * Security
 * ===================================================== */
v_user_id := auth.uid();

if v_user_id is null then raise exception 'Authentication is required.';

end if;

if not public.is_admin() then raise exception 'You are not authorized to post supplier payments.';

end if;

/* =====================================================
 * Supplier
 * ===================================================== */
perform 1
from
  public.suppliers
where
  id = p_supplier_id
  and is_active = true;

if not found then raise exception 'The selected supplier was not found or is inactive.';

end if;

/* =====================================================
 * Payment Validation
 * ===================================================== */
if p_amount is null
or p_amount <= 0 then raise exception 'Supplier payment amount must be greater than zero.';

end if;

if p_exchange_rate is null
or p_exchange_rate <= 0 then raise exception 'Exchange rate must be greater than zero.';

end if;

if upper(
  trim(
    coalesce(p_currency_code, '')
  )
) !~ '^[A-Z]{3}$' then raise exception 'A valid three-letter currency code is required.';

end if;

if p_payment_method not in (
  'cash',
  'bank',
  'card',
  'cheque',
  'other'
) then raise exception 'Invalid payment method.';

end if;

if p_payment_method = 'cheque'
and nullif(
  trim(
    coalesce(p_cheque_number, '')
  ),
  ''
) is null then raise exception 'Cheque number is required for cheque payments.';

end if;

/* =====================================================
 * Allocation Array Validation
 * ===================================================== */
if p_allocations is null then p_allocations := '[]' :: jsonb;

end if;

if jsonb_typeof(p_allocations) <> 'array' then raise exception 'Supplier payment allocations must be an array.';

end if;

/*
 * Every allocation must contain exactly ONE payable target:
 *
 *   Quick Purchase
 *      XOR
 *   Goods Receipt
 *      XOR
 *   Supplier Opening Balance
 */
for v_allocation in
select
  *
from
  jsonb_array_elements(p_allocations) loop if (
    (
      case
        when nullif(
          trim(
            coalesce(
              v_allocation ->> 'quick_purchase_id',
              ''
            )
          ),
          ''
        ) is not null then 1
        else 0
      end
    ) + (
      case
        when nullif(
          trim(
            coalesce(
              v_allocation ->> 'goods_receipt_id',
              ''
            )
          ),
          ''
        ) is not null then 1
        else 0
      end
    ) + (
      case
        when nullif(
          trim(
            coalesce(
              v_allocation ->> 'supplier_opening_balance_id',
              ''
            )
          ),
          ''
        ) is not null then 1
        else 0
      end
    )
  ) <> 1 then raise exception 'Each supplier payment allocation must contain exactly one Quick Purchase ID, Goods Receipt ID or Supplier Opening Balance ID.';

end if;

end loop;

/*
 * Prevent duplicate payable targets inside one payment.
 *
 * Prefix UUIDs with the target type so IDs belonging to
 * different tables cannot logically collide.
 */
if (
  select
    count(*)
  from
    jsonb_array_elements(p_allocations)
) <> (
  select
    count(
      distinct case
        when nullif(
          allocation ->> 'quick_purchase_id',
          ''
        ) is not null then 'quick_purchase:' || (allocation ->> 'quick_purchase_id')
        when nullif(
          allocation ->> 'goods_receipt_id',
          ''
        ) is not null then 'goods_receipt:' || (allocation ->> 'goods_receipt_id')
        else 'supplier_opening_balance:' || (allocation ->> 'supplier_opening_balance_id')
      end
    )
  from
    jsonb_array_elements(p_allocations) as allocation
) then raise exception 'The same payable source cannot appear more than once in one supplier payment.';

end if;

/* =====================================================
 * Validate Every Allocation
 * ===================================================== */
for v_allocation in
select
  *
from
  jsonb_array_elements(p_allocations) loop v_quick_purchase_id := null;

v_goods_receipt_id := null;

v_supplier_opening_balance_id := null;

v_source_type := null;

v_source_key := null;

begin v_allocation_amount := (v_allocation ->> 'amount') :: numeric;

exception
when others then raise exception 'A valid supplier payment allocation amount is required.';

end;

if v_allocation_amount is null
or v_allocation_amount <= 0 then raise exception 'Supplier payment allocation must be greater than zero.';

end if;

/* =================================================
 * Quick Purchase Allocation
 * ================================================= */
if nullif(
  trim(
    coalesce(
      v_allocation ->> 'quick_purchase_id',
      ''
    )
  ),
  ''
) is not null then v_source_type := 'quick_purchase';

begin v_quick_purchase_id := (v_allocation ->> 'quick_purchase_id') :: uuid;

exception
when others then raise exception 'A valid Quick Purchase ID is required.';

end;

select
  supplier_id,
  currency_code,
  grand_total,
  payment_opening_amount into v_purchase_supplier_id,
  v_purchase_currency,
  v_purchase_grand_total,
  v_purchase_opening_amount
from
  public.quick_purchases
where
  id = v_quick_purchase_id
  and status = 'posted' for
update
;

if not found then raise exception 'The selected Quick Purchase was not found or is cancelled.';

end if;

if v_purchase_supplier_id is null then raise exception 'Quick Purchases without a registered supplier cannot be allocated to a Supplier Payment.';

end if;

if v_purchase_supplier_id <> p_supplier_id then raise exception 'All allocations must belong to the selected supplier.';

end if;

if upper(v_purchase_currency) <> upper(p_currency_code) then raise exception 'Supplier payment currency must match the Quick Purchase currency.';

end if;

select
  coalesce(sum(allocation.amount), 0) into v_existing_allocations
from
  public.supplier_payment_allocations allocation
  join public.supplier_payments payment on payment.id = allocation.supplier_payment_id
where
  allocation.quick_purchase_id = v_quick_purchase_id
  and payment.status = 'posted';

v_current_paid := coalesce(v_purchase_opening_amount, 0) + coalesce(v_existing_allocations, 0);

if v_current_paid + v_allocation_amount > v_purchase_grand_total then raise exception 'Supplier payment allocation exceeds the outstanding Quick Purchase balance.';

end if;

v_source_key := v_quick_purchase_id :: text;

/* =================================================
 * Goods Receipt Allocation
 * ================================================= */
elsif nullif(
  trim(
    coalesce(
      v_allocation ->> 'goods_receipt_id',
      ''
    )
  ),
  ''
) is not null then v_source_type := 'goods_receipt';

begin v_goods_receipt_id := (v_allocation ->> 'goods_receipt_id') :: uuid;

exception
when others then raise exception 'A valid Goods Receipt ID is required.';

end;

select
  receipt.supplier_id,
  receipt.status,
  purchase_order.currency_code into v_receipt_supplier_id,
  v_receipt_status,
  v_receipt_currency
from
  public.goods_receipts receipt
  join public.purchase_orders purchase_order on purchase_order.id = receipt.purchase_order_id
where
  receipt.id = v_goods_receipt_id for
update
  of receipt;

if not found then raise exception 'The selected Goods Receipt was not found.';

end if;

if v_receipt_status <> 'completed' then raise exception 'Only completed Goods Receipts can be allocated to Supplier Payments.';

end if;

if v_receipt_supplier_id <> p_supplier_id then raise exception 'All allocations must belong to the selected supplier.';

end if;

if upper(v_receipt_currency) <> upper(p_currency_code) then raise exception 'Supplier payment currency must match the Goods Receipt Purchase Order currency.';

end if;

v_receipt_payable_amount := public.get_goods_receipt_payable_amount(v_goods_receipt_id);

select
  coalesce(sum(allocation.amount), 0) into v_existing_allocations
from
  public.supplier_payment_allocations allocation
  join public.supplier_payments payment on payment.id = allocation.supplier_payment_id
where
  allocation.goods_receipt_id = v_goods_receipt_id
  and payment.status = 'posted';

v_current_paid := coalesce(v_existing_allocations, 0);

if v_current_paid + v_allocation_amount > v_receipt_payable_amount then raise exception 'Supplier payment allocation exceeds the outstanding Goods Receipt balance.';

end if;

v_source_key := v_goods_receipt_id :: text;

/* =================================================
 * Supplier Opening Balance Allocation
 * ================================================= */
else v_source_type := 'supplier_opening_balance';

begin v_supplier_opening_balance_id := (
  v_allocation ->> 'supplier_opening_balance_id'
) :: uuid;

exception
when others then raise exception 'A valid Supplier Opening Balance ID is required.';

end;

select
  supplier_id,
  currency_code,
  status,
  original_amount into v_opening_supplier_id,
  v_opening_currency,
  v_opening_status,
  v_opening_original_amount
from
  public.supplier_opening_balances
where
  id = v_supplier_opening_balance_id for
update
;

if not found then raise exception 'The selected Supplier Opening Balance was not found.';

end if;

if v_opening_status = 'cancelled' then raise exception 'Cancelled Supplier Opening Balances cannot be allocated to Supplier Payments.';

end if;

if v_opening_supplier_id <> p_supplier_id then raise exception 'All allocations must belong to the selected supplier.';

end if;

if upper(v_opening_currency) <> upper(p_currency_code) then raise exception 'Supplier payment currency must match the Supplier Opening Balance currency.';

end if;

select
  coalesce(sum(allocation.amount), 0) into v_existing_allocations
from
  public.supplier_payment_allocations allocation
  join public.supplier_payments payment on payment.id = allocation.supplier_payment_id
where
  allocation.supplier_opening_balance_id = v_supplier_opening_balance_id
  and payment.status = 'posted';

v_current_paid := coalesce(v_existing_allocations, 0);

if v_current_paid + v_allocation_amount > v_opening_original_amount then raise exception 'Supplier payment allocation exceeds the outstanding Supplier Opening Balance.';

end if;

v_source_key := v_supplier_opening_balance_id :: text;

end if;

if v_source_key is null then raise exception 'Unable to resolve Supplier Payment allocation source.';

end if;

v_total_allocated := v_total_allocated + v_allocation_amount;

end loop;

if v_total_allocated > p_amount then raise exception 'Total allocations cannot exceed the supplier payment amount.';

end if;

/* =====================================================
 * Payment Header
 * ===================================================== */
v_payment_number := public.generate_supplier_payment_number();

insert into
  public.supplier_payments (
    payment_number,
    supplier_id,
    payment_date,
    payment_method,
    currency_code,
    exchange_rate,
    amount,
    allocated_amount,
    unallocated_amount,
    reference_number,
    bank_name,
    cheque_number,
    cheque_date,
    notes,
    status,
    posted_at,
    posted_by,
    created_by
  )
values
  (
    v_payment_number,
    p_supplier_id,
    coalesce(
      p_payment_date,
      current_date
    ),
    p_payment_method,
    upper(p_currency_code),
    p_exchange_rate,
    round(p_amount, 2),
    0,
    round(p_amount, 2),
    nullif(
      trim(
        coalesce(
          p_reference_number,
          ''
        )
      ),
      ''
    ),
    nullif(
      trim(
        coalesce(p_bank_name, '')
      ),
      ''
    ),
    nullif(
      trim(
        coalesce(
          p_cheque_number,
          ''
        )
      ),
      ''
    ),
    p_cheque_date,
    nullif(
      trim(
        coalesce(p_notes, '')
      ),
      ''
    ),
    'draft',
    null,
    null,
    v_user_id
  ) returning id into v_payment_id;

/* =====================================================
 * Allocation Rows
 * ===================================================== */
for v_allocation in
select
  *
from
  jsonb_array_elements(p_allocations) loop v_quick_purchase_id := null;

v_goods_receipt_id := null;

v_supplier_opening_balance_id := null;

v_allocation_amount := (v_allocation ->> 'amount') :: numeric;

if nullif(
  trim(
    coalesce(
      v_allocation ->> 'quick_purchase_id',
      ''
    )
  ),
  ''
) is not null then v_quick_purchase_id := (v_allocation ->> 'quick_purchase_id') :: uuid;

elsif nullif(
  trim(
    coalesce(
      v_allocation ->> 'goods_receipt_id',
      ''
    )
  ),
  ''
) is not null then v_goods_receipt_id := (v_allocation ->> 'goods_receipt_id') :: uuid;

else v_supplier_opening_balance_id := (
  v_allocation ->> 'supplier_opening_balance_id'
) :: uuid;

end if;

insert into
  public.supplier_payment_allocations (
    supplier_payment_id,
    quick_purchase_id,
    goods_receipt_id,
    supplier_opening_balance_id,
    amount,
    allocation_source
  )
values
  (
    v_payment_id,
    v_quick_purchase_id,
    v_goods_receipt_id,
    v_supplier_opening_balance_id,
    round(v_allocation_amount, 2),
    'payment_posting'
  );

end loop;

perform public.sync_supplier_payment_totals(v_payment_id);

/* =====================================================
 * Post Payment
 * ===================================================== */
update
  public.supplier_payments
set
  status = 'posted',
  posted_at = now(),
  posted_by = v_user_id
where
  id = v_payment_id;

/* =====================================================
 * Synchronize Allocated Payables
 * ===================================================== */
for v_allocation in
select
  *
from
  jsonb_array_elements(p_allocations) loop if nullif(
    trim(
      coalesce(
        v_allocation ->> 'quick_purchase_id',
        ''
      )
    ),
    ''
  ) is not null then perform public.sync_quick_purchase_paid_amount(
    (
      v_allocation ->> 'quick_purchase_id'
    ) :: uuid
  );

elsif nullif(
  trim(
    coalesce(
      v_allocation ->> 'goods_receipt_id',
      ''
    )
  ),
  ''
) is not null then perform public.sync_goods_receipt_paid_amount(
  (v_allocation ->> 'goods_receipt_id') :: uuid
);

else perform public.sync_supplier_opening_balance_status(
  (
    v_allocation ->> 'supplier_opening_balance_id'
  ) :: uuid
);

end if;

end loop;

return v_payment_id;

end;

$$;

/*
 * Preserve the existing security architecture.
 *
 * Normal application users must reach this lower-level
 * posting routine only through the approved higher-level
 * Supplier Payment workflow.
 */
revoke all on function public.post_supplier_payment(
  uuid,
  date,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  text,
  date,
  text,
  jsonb
)
from
  public,
  anon,
  authenticated;

/* =========================================================
 * End Migration 183 - Part E
 * ========================================================= */
/* =========================================================
 * Migration 183 - Part F
 * Opening Balances in AR / AP Open-Item Intelligence
 *
 * Customer Opening Balances become AR open items.
 *
 * Supplier Opening Balances become AP open items.
 *
 * Existing public view column contracts are preserved.
 *
 * No Revenue, Purchase, VAT, Inventory or Treasury
 * transaction is created by these reporting views.
 * ========================================================= */
/* =========================================================
 * F1. Receivable Open Items
 *
 * Existing:
 *   Sales Orders
 *
 * New:
 *   Customer Opening Balances
 *
 * IMPORTANT:
 * Preserve the exact existing public column contract.
 * ========================================================= */
create
or replace view public.receivable_open_items with (security_invoker = true) as
/* =======================================================
 * Sales Order Receivables
 * ======================================================= */
select
  sales_order.id as sales_order_id,
  sales_order.order_number,
  sales_order.customer_id,
  customer.customer_number,
  customer.display_name as customer_name,
  customer.company_name,
  customer.currency_code as customer_currency_code,
  customer.credit_limit,
  sales_order.order_date,
  sales_order.payment_terms_days,
  (
    sales_order.order_date + sales_order.payment_terms_days
  ) as due_date,
  greatest(
    current_date - (
      sales_order.order_date + sales_order.payment_terms_days
    ),
    0
  ) as days_overdue,
  case
    when (
      sales_order.order_date + sales_order.payment_terms_days
    ) >= current_date then 'current'
    when current_date - (
      sales_order.order_date + sales_order.payment_terms_days
    ) between 1
    and 30 then '1_30'
    when current_date - (
      sales_order.order_date + sales_order.payment_terms_days
    ) between 31
    and 60 then '31_60'
    when current_date - (
      sales_order.order_date + sales_order.payment_terms_days
    ) between 61
    and 90 then '61_90'
    else '90_plus'
  end as aging_bucket,
  sales_order.currency_code,
  sales_order.exchange_rate,
  sales_order.grand_total,
  sales_order.paid_amount,
  sales_order.balance_due as outstanding_amount,
  round(
    sales_order.balance_due * sales_order.exchange_rate,
    2
  ) as base_outstanding_amount,
  sales_order.payment_status,
  sales_order.status,
  sales_order.source,
  sales_order.customer_reference,
  sales_order.external_reference
from
  public.sales_orders sales_order
  inner join public.customers customer on customer.id = sales_order.customer_id
where
  sales_order.status in (
    'confirmed',
    'processing',
    'partially_fulfilled',
    'fulfilled',
    'completed'
  )
  and sales_order.balance_due > 0
union
all
/* =======================================================
 * Customer Opening Balance Receivables
 * ======================================================= */
select
  opening.id as sales_order_id,
  coalesce(
    nullif(
      trim(opening.reference_number),
      ''
    ),
    'OPENING-' || left(opening.id :: text, 8)
  ) as order_number,
  opening.customer_id,
  customer.customer_number,
  customer.display_name as customer_name,
  customer.company_name,
  customer.currency_code as customer_currency_code,
  customer.credit_limit,
  opening.opening_date as order_date,
  greatest(
    coalesce(
      opening.due_date,
      opening.opening_date
    ) - opening.opening_date,
    0
  ) as payment_terms_days,
  coalesce(
    opening.due_date,
    opening.opening_date
  ) as due_date,
  greatest(
    current_date - coalesce(
      opening.due_date,
      opening.opening_date
    ),
    0
  ) as days_overdue,
  case
    when coalesce(
      opening.due_date,
      opening.opening_date
    ) >= current_date then 'current'
    when current_date - coalesce(
      opening.due_date,
      opening.opening_date
    ) between 1
    and 30 then '1_30'
    when current_date - coalesce(
      opening.due_date,
      opening.opening_date
    ) between 31
    and 60 then '31_60'
    when current_date - coalesce(
      opening.due_date,
      opening.opening_date
    ) between 61
    and 90 then '61_90'
    else '90_plus'
  end as aging_bucket,
  opening.currency_code,
  opening.exchange_rate :: numeric(18, 8) as exchange_rate,
  opening.original_amount :: numeric(18, 2) as grand_total,
  round(
    opening.original_amount - public.get_customer_opening_balance_outstanding(opening.id),
    2
  ) :: numeric(18, 2) as paid_amount,
  round(
    public.get_customer_opening_balance_outstanding(opening.id),
    2
  ) :: numeric(18, 2) as outstanding_amount,
  round(
    public.get_customer_opening_balance_outstanding(opening.id) * opening.exchange_rate,
    2
  ) :: numeric(18, 2) as base_outstanding_amount,
  case
    when public.get_customer_opening_balance_outstanding(opening.id) <= 0 then 'paid'
    when public.get_customer_opening_balance_outstanding(opening.id) < opening.original_amount then 'partially_paid'
    else 'unpaid'
  end as payment_status,
  opening.status,
  'opening_balance' :: text as source,
  opening.reference_number as customer_reference,
  null :: text as external_reference
from
  public.customer_opening_balances opening
  inner join public.customers customer on customer.id = opening.customer_id
where
  opening.status <> 'cancelled'
  and public.get_customer_opening_balance_outstanding(opening.id) > 0;

/* =========================================================
 * F2. Generalized Supplier Payable Open Items
 *
 * Existing:
 *   Quick Purchases
 *   Goods Receipts
 *
 * New:
 *   Supplier Opening Balances
 *
 * Existing public column contract is preserved.
 * ========================================================= */
create
or replace view public.supplier_payable_open_items with (security_invoker = true) as
/* =======================================================
 * Quick Purchase Payables
 * ======================================================= */
select
  'quick_purchase' :: text as source_type,
  purchase.id as source_id,
  purchase.id as quick_purchase_id,
  null :: uuid as goods_receipt_id,
  purchase.purchase_number as document_number,
  purchase.purchase_date as document_date,
  purchase.supplier_id,
  supplier.company_name as supplier_name,
  purchase.store_name,
  purchase.supplier_invoice_number,
  purchase.supplier_invoice_date,
  purchase.payment_terms_days,
  (
    purchase.purchase_date + purchase.payment_terms_days
  ) as due_date,
  greatest(
    current_date - (
      purchase.purchase_date + purchase.payment_terms_days
    ),
    0
  ) as days_overdue,
  case
    when (
      purchase.purchase_date + purchase.payment_terms_days
    ) >= current_date then 'current'
    when current_date - (
      purchase.purchase_date + purchase.payment_terms_days
    ) between 1
    and 30 then '1_30'
    when current_date - (
      purchase.purchase_date + purchase.payment_terms_days
    ) between 31
    and 60 then '31_60'
    when current_date - (
      purchase.purchase_date + purchase.payment_terms_days
    ) between 61
    and 90 then '61_90'
    else '90_plus'
  end as aging_bucket,
  purchase.currency_code,
  purchase.exchange_rate :: numeric(18, 6) as exchange_rate,
  round(purchase.grand_total, 2) as gross_amount,
  round(purchase.paid_amount, 2) as paid_amount,
  round(purchase.balance_due, 2) as outstanding_amount,
  round(
    purchase.balance_due * purchase.exchange_rate,
    2
  ) as base_outstanding_amount,
  purchase.payment_status,
  purchase.status,
  purchase.warehouse_id
from
  public.quick_purchases purchase
  left join public.suppliers supplier on supplier.id = purchase.supplier_id
where
  purchase.status = 'posted'
  and purchase.balance_due > 0
union
all
/* =======================================================
 * Goods Receipt Payables
 * ======================================================= */
select
  'goods_receipt' :: text as source_type,
  receipt.id as source_id,
  null :: uuid as quick_purchase_id,
  receipt.id as goods_receipt_id,
  receipt.receipt_number as document_number,
  coalesce(
    receipt.received_date,
    receipt.completed_at :: date,
    receipt.created_at :: date
  ) as document_date,
  receipt.supplier_id,
  supplier.company_name as supplier_name,
  null :: text as store_name,
  receipt.supplier_invoice_number,
  null :: date as supplier_invoice_date,
  receipt.payment_terms_days,
  (
    coalesce(
      receipt.received_date,
      receipt.completed_at :: date,
      receipt.created_at :: date
    ) + receipt.payment_terms_days
  ) as due_date,
  greatest(
    current_date - (
      coalesce(
        receipt.received_date,
        receipt.completed_at :: date,
        receipt.created_at :: date
      ) + receipt.payment_terms_days
    ),
    0
  ) as days_overdue,
  case
    when (
      coalesce(
        receipt.received_date,
        receipt.completed_at :: date,
        receipt.created_at :: date
      ) + receipt.payment_terms_days
    ) >= current_date then 'current'
    when current_date - (
      coalesce(
        receipt.received_date,
        receipt.completed_at :: date,
        receipt.created_at :: date
      ) + receipt.payment_terms_days
    ) between 1
    and 30 then '1_30'
    when current_date - (
      coalesce(
        receipt.received_date,
        receipt.completed_at :: date,
        receipt.created_at :: date
      ) + receipt.payment_terms_days
    ) between 31
    and 60 then '31_60'
    when current_date - (
      coalesce(
        receipt.received_date,
        receipt.completed_at :: date,
        receipt.created_at :: date
      ) + receipt.payment_terms_days
    ) between 61
    and 90 then '61_90'
    else '90_plus'
  end as aging_bucket,
  purchase_order.currency_code,
  purchase_order.exchange_rate :: numeric(18, 6) as exchange_rate,
  round(
    public.get_goods_receipt_payable_amount(receipt.id),
    2
  ) as gross_amount,
  round(receipt.paid_amount, 2) as paid_amount,
  round(receipt.balance_due, 2) as outstanding_amount,
  round(
    receipt.balance_due * purchase_order.exchange_rate,
    2
  ) as base_outstanding_amount,
  receipt.payment_status,
  receipt.status,
  receipt.warehouse_id
from
  public.goods_receipts receipt
  join public.purchase_orders purchase_order on purchase_order.id = receipt.purchase_order_id
  left join public.suppliers supplier on supplier.id = receipt.supplier_id
where
  receipt.status = 'completed'
  and receipt.balance_due > 0
union
all
/* =======================================================
 * Supplier Opening Balance Payables
 * ======================================================= */
select
  'supplier_opening_balance' :: text as source_type,
  opening.id as source_id,
  null :: uuid as quick_purchase_id,
  null :: uuid as goods_receipt_id,
  coalesce(
    nullif(
      trim(opening.reference_number),
      ''
    ),
    'OPENING-' || left(opening.id :: text, 8)
  ) as document_number,
  opening.opening_date as document_date,
  opening.supplier_id,
  supplier.company_name as supplier_name,
  null :: text as store_name,
  opening.reference_number as supplier_invoice_number,
  null :: date as supplier_invoice_date,
  greatest(
    coalesce(
      opening.due_date,
      opening.opening_date
    ) - opening.opening_date,
    0
  ) as payment_terms_days,
  coalesce(
    opening.due_date,
    opening.opening_date
  ) as due_date,
  greatest(
    current_date - coalesce(
      opening.due_date,
      opening.opening_date
    ),
    0
  ) as days_overdue,
  case
    when coalesce(
      opening.due_date,
      opening.opening_date
    ) >= current_date then 'current'
    when current_date - coalesce(
      opening.due_date,
      opening.opening_date
    ) between 1
    and 30 then '1_30'
    when current_date - coalesce(
      opening.due_date,
      opening.opening_date
    ) between 31
    and 60 then '31_60'
    when current_date - coalesce(
      opening.due_date,
      opening.opening_date
    ) between 61
    and 90 then '61_90'
    else '90_plus'
  end as aging_bucket,
  opening.currency_code,
  opening.exchange_rate :: numeric(18, 6) as exchange_rate,
  round(opening.original_amount, 2) :: numeric(18, 2) as gross_amount,
  round(
    opening.original_amount - public.get_supplier_opening_balance_outstanding(opening.id),
    2
  ) :: numeric(18, 2) as paid_amount,
  round(
    public.get_supplier_opening_balance_outstanding(opening.id),
    2
  ) :: numeric(18, 2) as outstanding_amount,
  round(
    public.get_supplier_opening_balance_outstanding(opening.id) * opening.exchange_rate,
    2
  ) :: numeric(18, 2) as base_outstanding_amount,
  case
    when public.get_supplier_opening_balance_outstanding(opening.id) <= 0 then 'paid'
    when public.get_supplier_opening_balance_outstanding(opening.id) < opening.original_amount then 'partially_paid'
    else 'unpaid'
  end as payment_status,
  opening.status,
  null :: uuid as warehouse_id
from
  public.supplier_opening_balances opening
  left join public.suppliers supplier on supplier.id = opening.supplier_id
where
  opening.status <> 'cancelled'
  and public.get_supplier_opening_balance_outstanding(opening.id) > 0;

/* =========================================================
 * Documentation
 * ========================================================= */
comment on view public.receivable_open_items is 'Customer AR open-item view combining operational Sales Orders and pre-ERP Customer Opening Balances.';

comment on view public.supplier_payable_open_items is 'Generalized Supplier AP open-item view combining posted Quick Purchases, completed Goods Receipts and pre-ERP Supplier Opening Balances.';

/* =========================================================
 * End Migration 183 - Part F
 * ========================================================= */
/* =========================================================
 * Migration 183 - Part G
 * Opening Balance Immutability & Permission Hardening
 *
 * Posted opening balances are accounting source documents.
 *
 * They may not be edited or deleted directly.
 *
 * Permitted mutations:
 *
 *   1. posted <-> settled
 *      through controlled synchronization only.
 *
 *   2. posted / settled -> cancelled
 *      through controlled cancellation RPC only.
 *
 * All commercial/accounting fields remain immutable.
 * ========================================================= */
/* =========================================================
 * G1. CUSTOMER OPENING BALANCE IMMUTABILITY
 * ========================================================= */
create
or replace function public.guard_customer_opening_balance_lifecycle() returns trigger language plpgsql
set
  search_path = public as $$ declare v_sync_guard boolean := coalesce(
    current_setting(
      'erp.customer_opening_balance_sync',
      true
    ),
    ''
  ) = '1';

v_cancel_guard boolean := coalesce(
  current_setting(
    'erp.customer_opening_balance_cancel',
    true
  ),
  ''
) = '1';

begin
/* -----------------------------------------------------
 * Opening balances are never physically deleted.
 * ----------------------------------------------------- */
if tg_op = 'DELETE' then raise exception 'Customer Opening Balances cannot be deleted. Use the controlled cancellation workflow.';

end if;

/* -----------------------------------------------------
 * Only UPDATE requires further lifecycle validation.
 * INSERT is controlled by permissions / posting RPC.
 * ----------------------------------------------------- */
if tg_op <> 'UPDATE' then return new;

end if;

/* -----------------------------------------------------
 * Commercial/accounting identity is immutable.
 * ----------------------------------------------------- */
if new.id is distinct
from
  old.id
  or new.customer_id is distinct
from
  old.customer_id
  or new.opening_date is distinct
from
  old.opening_date
  or new.due_date is distinct
from
  old.due_date
  or new.reference_number is distinct
from
  old.reference_number
  or new.currency_code is distinct
from
  old.currency_code
  or new.exchange_rate is distinct
from
  old.exchange_rate
  or new.original_amount is distinct
from
  old.original_amount
  or new.notes is distinct
from
  old.notes
  or new.posted_at is distinct
from
  old.posted_at
  or new.posted_by is distinct
from
  old.posted_by
  or new.created_at is distinct
from
  old.created_at
  or new.created_by is distinct
from
  old.created_by then raise exception 'Posted Customer Opening Balance accounting fields are immutable.';

end if;

/* -----------------------------------------------------
 * Synchronization may ONLY change status between:
 *
 *   posted <-> settled
 *
 * Cancellation fields must remain unchanged.
 * ----------------------------------------------------- */
if v_sync_guard then if old.status = 'cancelled'
or new.status = 'cancelled' then raise exception 'Customer Opening Balance cancellation cannot be performed by the synchronization workflow.';

end if;

if new.status not in ('posted', 'settled') then raise exception 'Invalid Customer Opening Balance synchronization status.';

end if;

if new.cancelled_at is distinct
from
  old.cancelled_at
  or new.cancelled_by is distinct
from
  old.cancelled_by
  or new.cancellation_reason is distinct
from
  old.cancellation_reason then raise exception 'Customer Opening Balance cancellation fields cannot be changed by synchronization.';

end if;

return new;

end if;

/* -----------------------------------------------------
 * Cancellation may ONLY transition:
 *
 *   posted / settled -> cancelled
 *
 * and populate cancellation metadata.
 * ----------------------------------------------------- */
if v_cancel_guard then if old.status not in ('posted', 'settled') then raise exception 'Only an active Customer Opening Balance can be cancelled.';

end if;

if new.status <> 'cancelled' then raise exception 'Customer Opening Balance cancellation must set status to cancelled.';

end if;

if new.cancelled_at is null then raise exception 'Customer Opening Balance cancellation timestamp is required.';

end if;

if new.cancelled_by is null then raise exception 'Customer Opening Balance cancellation user is required.';

end if;

if nullif(
  trim(
    coalesce(new.cancellation_reason, '')
  ),
  ''
) is null then raise exception 'Customer Opening Balance cancellation reason is required.';

end if;

return new;

end if;

raise exception 'Customer Opening Balances cannot be modified directly. Use the controlled ERP workflow.';

end;

$$;

drop trigger if exists guard_customer_opening_balance_lifecycle on public.customer_opening_balances;

create trigger guard_customer_opening_balance_lifecycle before
update
  or delete on public.customer_opening_balances for each row execute function public.guard_customer_opening_balance_lifecycle();

/* =========================================================
 * G2. SUPPLIER OPENING BALANCE IMMUTABILITY
 * ========================================================= */
create
or replace function public.guard_supplier_opening_balance_lifecycle() returns trigger language plpgsql
set
  search_path = public as $$ declare v_sync_guard boolean := coalesce(
    current_setting(
      'erp.supplier_opening_balance_sync',
      true
    ),
    ''
  ) = '1';

v_cancel_guard boolean := coalesce(
  current_setting(
    'erp.supplier_opening_balance_cancel',
    true
  ),
  ''
) = '1';

begin if tg_op = 'DELETE' then raise exception 'Supplier Opening Balances cannot be deleted. Use the controlled cancellation workflow.';

end if;

if tg_op <> 'UPDATE' then return new;

end if;

/* -----------------------------------------------------
 * Commercial/accounting identity is immutable.
 * ----------------------------------------------------- */
if new.id is distinct
from
  old.id
  or new.supplier_id is distinct
from
  old.supplier_id
  or new.opening_date is distinct
from
  old.opening_date
  or new.due_date is distinct
from
  old.due_date
  or new.reference_number is distinct
from
  old.reference_number
  or new.currency_code is distinct
from
  old.currency_code
  or new.exchange_rate is distinct
from
  old.exchange_rate
  or new.original_amount is distinct
from
  old.original_amount
  or new.notes is distinct
from
  old.notes
  or new.posted_at is distinct
from
  old.posted_at
  or new.posted_by is distinct
from
  old.posted_by
  or new.created_at is distinct
from
  old.created_at
  or new.created_by is distinct
from
  old.created_by then raise exception 'Posted Supplier Opening Balance accounting fields are immutable.';

end if;

/* -----------------------------------------------------
 * Synchronization may ONLY change status between:
 *
 *   posted <-> settled
 * ----------------------------------------------------- */
if v_sync_guard then if old.status = 'cancelled'
or new.status = 'cancelled' then raise exception 'Supplier Opening Balance cancellation cannot be performed by the synchronization workflow.';

end if;

if new.status not in ('posted', 'settled') then raise exception 'Invalid Supplier Opening Balance synchronization status.';

end if;

if new.cancelled_at is distinct
from
  old.cancelled_at
  or new.cancelled_by is distinct
from
  old.cancelled_by
  or new.cancellation_reason is distinct
from
  old.cancellation_reason then raise exception 'Supplier Opening Balance cancellation fields cannot be changed by synchronization.';

end if;

return new;

end if;

/* -----------------------------------------------------
 * Cancellation may ONLY transition:
 *
 *   posted / settled -> cancelled
 * ----------------------------------------------------- */
if v_cancel_guard then if old.status not in ('posted', 'settled') then raise exception 'Only an active Supplier Opening Balance can be cancelled.';

end if;

if new.status <> 'cancelled' then raise exception 'Supplier Opening Balance cancellation must set status to cancelled.';

end if;

if new.cancelled_at is null then raise exception 'Supplier Opening Balance cancellation timestamp is required.';

end if;

if new.cancelled_by is null then raise exception 'Supplier Opening Balance cancellation user is required.';

end if;

if nullif(
  trim(
    coalesce(new.cancellation_reason, '')
  ),
  ''
) is null then raise exception 'Supplier Opening Balance cancellation reason is required.';

end if;

return new;

end if;

raise exception 'Supplier Opening Balances cannot be modified directly. Use the controlled ERP workflow.';

end;

$$;

drop trigger if exists guard_supplier_opening_balance_lifecycle on public.supplier_opening_balances;

create trigger guard_supplier_opening_balance_lifecycle before
update
  or delete on public.supplier_opening_balances for each row execute function public.guard_supplier_opening_balance_lifecycle();

/* =========================================================
 * G3. RPC PERMISSION HARDENING
 *
 * Only approved business workflows are exposed to
 * authenticated application users.
 *
 * Internal synchronization / calculation / lifecycle
 * helpers are not directly executable by application users.
 * ========================================================= */
/* ---------------------------------------------------------
 * Customer Opening Balance helpers
 * --------------------------------------------------------- */
revoke all on function public.get_customer_opening_balance_outstanding(uuid)
from
  public,
  anon,
  authenticated;

revoke all on function public.sync_customer_opening_balance_status(uuid)
from
  public,
  anon,
  authenticated;

revoke all on function public.guard_customer_opening_balance_lifecycle()
from
  public,
  anon,
  authenticated;

/* ---------------------------------------------------------
 * Supplier Opening Balance helpers
 * --------------------------------------------------------- */
revoke all on function public.get_supplier_opening_balance_outstanding(uuid)
from
  public,
  anon,
  authenticated;

revoke all on function public.sync_supplier_opening_balance_status(uuid)
from
  public,
  anon,
  authenticated;

revoke all on function public.guard_supplier_opening_balance_lifecycle()
from
  public,
  anon,
  authenticated;

/* ---------------------------------------------------------
 * Approved Customer Opening Balance workflows
 * --------------------------------------------------------- */
revoke all on function public.post_customer_opening_balance(
  uuid,
  date,
  date,
  text,
  text,
  numeric,
  numeric,
  text
)
from
  public,
  anon;

grant execute on function public.post_customer_opening_balance(
  uuid,
  date,
  date,
  text,
  text,
  numeric,
  numeric,
  text
) to authenticated;

revoke all on function public.cancel_customer_opening_balance(uuid, date, text)
from
  public,
  anon;

grant execute on function public.cancel_customer_opening_balance(uuid, date, text) to authenticated;

/* ---------------------------------------------------------
 * Approved Supplier Opening Balance workflows
 * --------------------------------------------------------- */
revoke all on function public.post_supplier_opening_balance(
  uuid,
  date,
  date,
  text,
  text,
  numeric,
  numeric,
  text
)
from
  public,
  anon;

grant execute on function public.post_supplier_opening_balance(
  uuid,
  date,
  date,
  text,
  text,
  numeric,
  numeric,
  text
) to authenticated;

revoke all on function public.cancel_supplier_opening_balance(uuid, date, text)
from
  public,
  anon;

grant execute on function public.cancel_supplier_opening_balance(uuid, date, text) to authenticated;

/* =========================================================
 * G4. TABLE PERMISSION HARDENING
 *
 * Application users may read opening balance documents,
 * but cannot directly INSERT / UPDATE / DELETE them.
 * ========================================================= */
revoke
insert
,
update
,
  delete on public.customer_opening_balances
from
  authenticated;

revoke
insert
,
update
,
  delete on public.supplier_opening_balances
from
  authenticated;

grant
select
  on public.customer_opening_balances to authenticated;

grant
select
  on public.supplier_opening_balances to authenticated;

/* =========================================================
 * Documentation
 * ========================================================= */
comment on function public.guard_customer_opening_balance_lifecycle() is 'Protects posted Customer Opening Balances from direct mutation or deletion. Only controlled settlement synchronization and cancellation workflows may change lifecycle fields.';

comment on function public.guard_supplier_opening_balance_lifecycle() is 'Protects posted Supplier Opening Balances from direct mutation or deletion. Only controlled settlement synchronization and cancellation workflows may change lifecycle fields.';

/* =========================================================
 * End Migration 183 - Part G
 * ========================================================= */