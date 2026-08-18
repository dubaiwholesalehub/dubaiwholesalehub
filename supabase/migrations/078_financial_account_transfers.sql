/*
 * =========================================================
 * 078 — Financial Account Transfers
 *
 * Transfers money between Cash / Bank / other treasury
 * accounts.
 *
 * Same currency:
 *   AED Cash -> AED Bank
 *
 * Different currency:
 *   supported using source and destination amounts.
 *
 * A transfer creates two linked account transactions:
 *
 *   Source      transfer_out
 *   Destination transfer_in
 *
 * Both use the same transfer_group_id.
 *
 * Transfers have NO profit impact.
 * =========================================================
 */


/* =========================================================
 * Transfer Master
 * ========================================================= */

create table if not exists
  public.financial_account_transfers
(
  id uuid
    primary key
    default gen_random_uuid(),

  transfer_number text
    not null
    unique,

  transfer_date date
    not null
    default current_date,

  from_account_id uuid
    not null
    references public.financial_accounts(id)
    on delete restrict,

  to_account_id uuid
    not null
    references public.financial_accounts(id)
    on delete restrict,

  from_amount numeric(18, 2)
    not null,

  to_amount numeric(18, 2)
    not null,

  exchange_rate numeric(18, 6)
    not null
    default 1,

  from_currency_code text
    not null,

  to_currency_code text
    not null,

  status text
    not null
    default 'posted',

  reference_number text,

  notes text,

  transfer_group_id uuid
    not null
    unique,

  out_transaction_id uuid
    references public.account_transactions(id)
    on delete restrict,

  in_transaction_id uuid
    references public.account_transactions(id)
    on delete restrict,

  posted_at timestamptz,

  cancelled_at timestamptz,

  cancellation_reason text,

  created_by uuid
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
    financial_account_transfers_accounts_different
  check (
    from_account_id <>
    to_account_id
  ),

  constraint
    financial_account_transfers_from_amount_positive
  check (
    from_amount > 0
  ),

  constraint
    financial_account_transfers_to_amount_positive
  check (
    to_amount > 0
  ),

  constraint
    financial_account_transfers_exchange_rate_positive
  check (
    exchange_rate > 0
  ),

  constraint
    financial_account_transfers_status_check
  check (
    status in (
      'posted',
      'cancelled'
    )
  ),

  constraint
    financial_account_transfers_from_currency_check
  check (
    from_currency_code ~
      '^[A-Z]{3}$'
  ),

  constraint
    financial_account_transfers_to_currency_check
  check (
    to_currency_code ~
      '^[A-Z]{3}$'
  )
);


/* =========================================================
 * Indexes
 * ========================================================= */

create index if not exists
  financial_account_transfers_date_idx
on public.financial_account_transfers (
  transfer_date desc
);


create index if not exists
  financial_account_transfers_from_account_idx
on public.financial_account_transfers (
  from_account_id
);


create index if not exists
  financial_account_transfers_to_account_idx
on public.financial_account_transfers (
  to_account_id
);


/* =========================================================
 * Transfer Number Sequence
 * ========================================================= */

create sequence if not exists
  public.financial_account_transfer_number_seq
start 1;


/* =========================================================
 * Next Transfer Number
 * ========================================================= */

create or replace function
  public.next_financial_account_transfer_number()
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
      'public.financial_account_transfer_number_seq'
    );


  return
    'TRF-'
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
 * Post Transfer
 * ========================================================= */

create or replace function
  public.post_financial_account_transfer(
    p_transfer_date date,
    p_from_account_id uuid,
    p_to_account_id uuid,
    p_from_amount numeric,
    p_to_amount numeric,
    p_exchange_rate numeric default 1,
    p_reference_number text default null,
    p_notes text default null
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_transfer_id uuid;

  v_transfer_number text;

  v_transfer_group_id uuid;

  v_out_transaction_id uuid;

  v_in_transaction_id uuid;

  v_from_currency text;

  v_to_currency text;

  v_from_active boolean;

  v_to_active boolean;

begin

  /* =======================================================
   * Security
   * ======================================================= */

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'You are not authorized to transfer financial account funds.';
  end if;


  /* =======================================================
   * Basic Validation
   * ======================================================= */

  if
    p_from_account_id is null
    or
    p_to_account_id is null
  then
    raise exception
      'From Account and To Account are required.';
  end if;


  if
    p_from_account_id =
    p_to_account_id
  then
    raise exception
      'From Account and To Account must be different.';
  end if;


  if
    p_from_amount is null
    or
    p_from_amount <= 0
  then
    raise exception
      'Transfer amount must be greater than zero.';
  end if;


  if
    p_to_amount is null
    or
    p_to_amount <= 0
  then
    raise exception
      'Destination amount must be greater than zero.';
  end if;


  if
    p_exchange_rate is null
    or
    p_exchange_rate <= 0
  then
    raise exception
      'Exchange rate must be greater than zero.';
  end if;


  /* =======================================================
   * Lock Accounts
   *
   * Always lock in deterministic UUID order to reduce
   * deadlock risk when two transfers happen concurrently.
   * ======================================================= */

  perform
    1

  from
    public.financial_accounts

  where
    id in (
      p_from_account_id,
      p_to_account_id
    )

  order by
    id

  for update;


  /* =======================================================
   * Source Account
   * ======================================================= */

  select
    currency_code,
    is_active

  into
    v_from_currency,
    v_from_active

  from
    public.financial_accounts

  where
    id =
      p_from_account_id;


  if not found then
    raise exception
      'Source financial account was not found.';
  end if;


  if not v_from_active then
    raise exception
      'Source financial account is inactive.';
  end if;


  /* =======================================================
   * Destination Account
   * ======================================================= */

  select
    currency_code,
    is_active

  into
    v_to_currency,
    v_to_active

  from
    public.financial_accounts

  where
    id =
      p_to_account_id;


  if not found then
    raise exception
      'Destination financial account was not found.';
  end if;


  if not v_to_active then
    raise exception
      'Destination financial account is inactive.';
  end if;


  /* =======================================================
   * Same Currency Protection
   * ======================================================= */

  if
    upper(v_from_currency) =
    upper(v_to_currency)

    and
    round(p_from_amount, 2) <>
    round(p_to_amount, 2)
  then
    raise exception
      'Same-currency transfers must have equal source and destination amounts.';
  end if;


  /* =======================================================
   * Create Transfer Header
   * ======================================================= */

  v_transfer_id :=
    gen_random_uuid();

  v_transfer_group_id :=
    gen_random_uuid();

  v_transfer_number :=
    public.next_financial_account_transfer_number();


  insert into
    public.financial_account_transfers
  (
    id,
    transfer_number,
    transfer_date,

    from_account_id,
    to_account_id,

    from_amount,
    to_amount,

    exchange_rate,

    from_currency_code,
    to_currency_code,

    status,

    reference_number,
    notes,

    transfer_group_id,

    posted_at,
    created_by
  )

  values
  (
    v_transfer_id,
    v_transfer_number,

    coalesce(
      p_transfer_date,
      current_date
    ),

    p_from_account_id,
    p_to_account_id,

    round(
      p_from_amount,
      2
    ),

    round(
      p_to_amount,
      2
    ),

    p_exchange_rate,

    upper(
      v_from_currency
    ),

    upper(
      v_to_currency
    ),

    'posted',

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
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    ),

    v_transfer_group_id,

    now(),

    v_user_id
  );


  /* =======================================================
   * Source — Money Out
   * ======================================================= */

  v_out_transaction_id :=
    public.post_account_transaction(
      p_from_account_id,

      coalesce(
        p_transfer_date,
        current_date
      ),

      'out',

      'transfer_out',

      round(
        p_from_amount,
        2
      ),

      upper(
        v_from_currency
      ),

      1,

      'financial_account_transfer',

      v_transfer_id,

      v_transfer_number,

      concat(
        'Transfer ',
        v_transfer_number
      ),

      p_notes
    );


  /* =======================================================
   * Destination — Money In
   * ======================================================= */

  v_in_transaction_id :=
    public.post_account_transaction(
      p_to_account_id,

      coalesce(
        p_transfer_date,
        current_date
      ),

      'in',

      'transfer_in',

      round(
        p_to_amount,
        2
      ),

      upper(
        v_to_currency
      ),

      p_exchange_rate,

      'financial_account_transfer',

      v_transfer_id,

      v_transfer_number,

      concat(
        'Transfer ',
        v_transfer_number
      ),

      p_notes
    );


  /* =======================================================
   * Link Transfer Group
   * ======================================================= */

  update
    public.account_transactions

  set
    transfer_group_id =
      v_transfer_group_id

  where
    id in (
      v_out_transaction_id,
      v_in_transaction_id
    );


  update
    public.financial_account_transfers

  set
    out_transaction_id =
      v_out_transaction_id,

    in_transaction_id =
      v_in_transaction_id,

    updated_at =
      now()

  where
    id =
      v_transfer_id;


  return
    v_transfer_id;

end;
$$;


/* =========================================================
 * Cancel Transfer
 * ========================================================= */

create or replace function
  public.cancel_financial_account_transfer(
    p_transfer_id uuid,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_out_transaction_id uuid;

  v_in_transaction_id uuid;

  v_status text;

  v_reason text;

begin

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'You are not authorized to cancel financial account transfers.';
  end if;


  v_reason :=
    nullif(
      trim(
        coalesce(
          p_reason,
          ''
        )
      ),
      ''
    );


  if
    v_reason is null
  then
    raise exception
      'Cancellation reason is required.';
  end if;


  select
    status,
    out_transaction_id,
    in_transaction_id

  into
    v_status,
    v_out_transaction_id,
    v_in_transaction_id

  from
    public.financial_account_transfers

  where
    id =
      p_transfer_id

  for update;


  if not found then
    raise exception
      'Financial account transfer was not found.';
  end if;


  if
    v_status =
    'cancelled'
  then
    raise exception
      'Financial account transfer is already cancelled.';
  end if;


  /*
   * Cancel both sides.
   *
   * cancel_account_transaction() recalculates each
   * financial account balance.
   */

  perform
    public.cancel_account_transaction(
      v_out_transaction_id,
      v_reason
    );


  perform
    public.cancel_account_transaction(
      v_in_transaction_id,
      v_reason
    );


  update
    public.financial_account_transfers

  set
    status =
      'cancelled',

    cancelled_at =
      now(),

    cancellation_reason =
      v_reason,

    cancelled_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      p_transfer_id;


  return
    p_transfer_id;

end;
$$;


/* =========================================================
 * RLS
 * ========================================================= */

alter table
  public.financial_account_transfers
enable row level security;


drop policy if exists
  financial_account_transfers_admin_select
on
  public.financial_account_transfers;


create policy
  financial_account_transfers_admin_select
on
  public.financial_account_transfers
for select
to authenticated
using (
  public.is_admin()
);


/* =========================================================
 * RPC Permissions
 * ========================================================= */

revoke all
on function
  public.post_financial_account_transfer(
    date,
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    text,
    text
  )
from public;


grant execute
on function
  public.post_financial_account_transfer(
    date,
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    text,
    text
  )
to authenticated;


revoke all
on function
  public.cancel_financial_account_transfer(
    uuid,
    text
  )
from public;


grant execute
on function
  public.cancel_financial_account_transfer(
    uuid,
    text
  )
to authenticated;