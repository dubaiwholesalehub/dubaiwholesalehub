/*
 * =========================================================
 * 072 — Financial Accounts
 *
 * Purpose:
 *
 * Foundation for:
 *
 * - Cash in hand
 * - Bank accounts
 * - Card / POS clearing
 * - Payment gateways
 * - Other operational money accounts
 *
 * These are treasury / cash-flow accounts.
 *
 * Full General Ledger / Chart of Accounts will be built
 * later on top of this operational accounting foundation.
 * =========================================================
 */


/* =========================================================
 * Financial Accounts
 * ========================================================= */

create table if not exists
  public.financial_accounts
(
  id uuid
    primary key
    default gen_random_uuid(),

  account_code text
    not null,

  account_name text
    not null,

  account_type text
    not null,

  currency_code text
    not null
    default 'AED',

  bank_name text,

  bank_account_name text,

  bank_account_number text,

  iban text,

  swift_code text,

  branch_name text,

  opening_balance
    numeric(18, 2)
    not null
    default 0,

  opening_balance_date date,

  current_balance
    numeric(18, 2)
    not null
    default 0,

  allow_negative_balance boolean
    not null
    default true,

  is_default boolean
    not null
    default false,

  is_active boolean
    not null
    default true,

  notes text,

  created_by uuid
    references public.profiles(id),

  updated_by uuid
    references public.profiles(id),

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint
    financial_accounts_code_unique
  unique (
    account_code
  ),

  constraint
    financial_accounts_type_check
  check (
    account_type in (
      'cash',
      'bank',
      'card',
      'payment_gateway',
      'clearing',
      'other'
    )
  ),

  constraint
    financial_accounts_currency_check
  check (
    currency_code ~
      '^[A-Z]{3}$'
  )
);


/* =========================================================
 * Indexes
 * ========================================================= */

create index if not exists
  financial_accounts_type_idx
on public.financial_accounts (
  account_type
);


create index if not exists
  financial_accounts_active_idx
on public.financial_accounts (
  is_active
)
where
  is_active = true;


/* =========================================================
 * Updated At
 * ========================================================= */

create or replace function
  public.set_financial_account_updated_at()
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
  set_financial_accounts_updated_at
on public.financial_accounts;


create trigger
  set_financial_accounts_updated_at
before update
on public.financial_accounts
for each row
execute function
  public.set_financial_account_updated_at();


/* =========================================================
 * Ensure One Default Account Per Type / Currency
 * ========================================================= */

create unique index if not exists
  financial_accounts_default_type_currency_unique
on public.financial_accounts (
  account_type,
  currency_code
)
where
  is_default = true
  and is_active = true;


/* =========================================================
 * Security
 * ========================================================= */

alter table
  public.financial_accounts
enable row level security;


drop policy if exists
  "Management can manage financial accounts"
on public.financial_accounts;


create policy
  "Management can manage financial accounts"
on public.financial_accounts
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Seed Basic Accounts
 *
 * Safe defaults.
 * These can later be renamed from the admin UI.
 * ========================================================= */

insert into public.financial_accounts (
  account_code,
  account_name,
  account_type,
  currency_code,
  opening_balance,
  current_balance,
  allow_negative_balance,
  is_default,
  is_active
)
values
(
  'CASH-AED',
  'Cash in Hand',
  'cash',
  'AED',
  0,
  0,
  false,
  true,
  true
)
on conflict (
  account_code
)
do nothing;


insert into public.financial_accounts (
  account_code,
  account_name,
  account_type,
  currency_code,
  opening_balance,
  current_balance,
  allow_negative_balance,
  is_default,
  is_active
)
values
(
  'BANK-AED',
  'Main Bank Account',
  'bank',
  'AED',
  0,
  0,
  true,
  true,
  true
)
on conflict (
  account_code
)
do nothing;


insert into public.financial_accounts (
  account_code,
  account_name,
  account_type,
  currency_code,
  opening_balance,
  current_balance,
  allow_negative_balance,
  is_default,
  is_active
)
values
(
  'CARD-AED',
  'Card / POS Clearing',
  'card',
  'AED',
  0,
  0,
  true,
  true,
  true
)
on conflict (
  account_code
)
do nothing;


/* =========================================================
 * Permissions
 * ========================================================= */

grant select,
      insert,
      update,
      delete
on public.financial_accounts
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on table
  public.financial_accounts
is
  'Operational treasury accounts used for cash, bank, card, gateway and clearing balances.';