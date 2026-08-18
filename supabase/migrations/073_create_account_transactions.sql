/*
 * =========================================================
 * 073 — Account Transactions
 *
 * Purpose:
 *
 * Operational cash / bank / card ledger.
 *
 * Supports:
 *
 * - Customer receipts
 * - Supplier payments
 * - Expenses
 * - Internal transfers
 * - Opening balances
 * - Manual adjustments
 *
 * Financial account balance is maintained from posted
 * transactions only.
 * =========================================================
 */


/* =========================================================
 * Account Transactions
 * ========================================================= */

create table if not exists
  public.account_transactions
(
  id uuid
    primary key
    default gen_random_uuid(),

  transaction_number text
    not null,

  transaction_date date
    not null
    default current_date,

  account_id uuid
    not null
    references public.financial_accounts(id),

  direction text
    not null,

  transaction_type text
    not null,

  status text
    not null
    default 'posted',

  amount numeric(18, 2)
    not null,

  currency_code text
    not null
    default 'AED',

  exchange_rate numeric(18, 6)
    not null
    default 1,

  base_amount numeric(18, 2)
    not null,

  reference_type text,

  reference_id uuid,

  reference_number text,

  description text,

  notes text,

  transfer_group_id uuid,

  posted_at timestamptz,

  cancelled_at timestamptz,

  cancellation_reason text,

  created_by uuid
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
    account_transactions_number_unique
  unique (
    transaction_number
  ),

  constraint
    account_transactions_direction_check
  check (
    direction in (
      'in',
      'out'
    )
  ),

  constraint
    account_transactions_type_check
  check (
    transaction_type in (
      'opening_balance',
      'customer_receipt',
      'supplier_payment',
      'expense',
      'transfer_in',
      'transfer_out',
      'adjustment_in',
      'adjustment_out',
      'other_in',
      'other_out'
    )
  ),

  constraint
    account_transactions_status_check
  check (
    status in (
      'posted',
      'cancelled'
    )
  ),

  constraint
    account_transactions_amount_positive
  check (
    amount > 0
  ),

  constraint
    account_transactions_exchange_rate_positive
  check (
    exchange_rate > 0
  ),

  constraint
    account_transactions_currency_check
  check (
    currency_code ~
      '^[A-Z]{3}$'
  )
);


/* =========================================================
 * Indexes
 * ========================================================= */

create index if not exists
  account_transactions_account_id_idx
on public.account_transactions (
  account_id
);


create index if not exists
  account_transactions_date_idx
on public.account_transactions (
  transaction_date desc
);


create index if not exists
  account_transactions_type_idx
on public.account_transactions (
  transaction_type
);


create index if not exists
  account_transactions_status_idx
on public.account_transactions (
  status
);


create index if not exists
  account_transactions_reference_idx
on public.account_transactions (
  reference_type,
  reference_id
)
where
  reference_type is not null
  and reference_id is not null;


create index if not exists
  account_transactions_transfer_group_idx
on public.account_transactions (
  transfer_group_id
)
where
  transfer_group_id is not null;


/* =========================================================
 * Prevent Duplicate Source Posting
 *
 * Example:
 * one account transaction per Customer Receipt.
 * ========================================================= */

create unique index if not exists
  account_transactions_posted_reference_unique
on public.account_transactions (
  transaction_type,
  reference_type,
  reference_id
)
where
  status = 'posted'
  and reference_type is not null
  and reference_id is not null;


/* =========================================================
 * Updated At Trigger
 * ========================================================= */

create or replace function
  public.set_account_transaction_updated_at()
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
  set_account_transactions_updated_at
on public.account_transactions;


create trigger
  set_account_transactions_updated_at
before update
on public.account_transactions
for each row
execute function
  public.set_account_transaction_updated_at();


/* =========================================================
 * Transaction Number
 * ========================================================= */

create sequence if not exists
  public.account_transaction_number_seq
start 1;


create or replace function
  public.next_account_transaction_number()
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
      'public.account_transaction_number_seq'
    );

  return
    'ACCT-'
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
 * Recalculate One Account Balance
 * ========================================================= */

create or replace function
  public.sync_financial_account_balance(
    p_account_id uuid
  )
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opening_balance
    numeric(18, 2);

  v_transaction_balance
    numeric(18, 2);

  v_final_balance
    numeric(18, 2);

begin

  select
    opening_balance

  into
    v_opening_balance

  from
    public.financial_accounts

  where
    id =
      p_account_id

  for update;


  if not found then
    raise exception
      'Financial account was not found.';
  end if;


  select
    coalesce(
      sum(
        case
          when direction = 'in'
          then base_amount

          when direction = 'out'
          then -base_amount

          else 0
        end
      ),
      0
    )

  into
    v_transaction_balance

  from
    public.account_transactions

  where
  account_id =
    p_account_id

  and status =
    'posted'

  and transaction_type <>
    'opening_balance';


  v_final_balance :=
    round(
      v_opening_balance +
      v_transaction_balance,
      2
    );


  update
    public.financial_accounts

  set
    current_balance =
      v_final_balance,

    updated_at =
      now()

  where
    id =
      p_account_id;


  return
    v_final_balance;

end;
$$;


/* =========================================================
 * Post Account Transaction
 * ========================================================= */

create or replace function
  public.post_account_transaction(
    p_account_id uuid,
    p_transaction_date date,
    p_direction text,
    p_transaction_type text,
    p_amount numeric,
    p_currency_code text,
    p_exchange_rate numeric,
    p_reference_type text,
    p_reference_id uuid,
    p_reference_number text,
    p_description text,
    p_notes text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_transaction_id uuid;

  v_transaction_number text;

  v_base_amount
    numeric(18, 2);

  v_account_currency text;

  v_account_active boolean;

  v_allow_negative boolean;

  v_current_balance
    numeric(18, 2);

  v_new_balance
    numeric(18, 2);

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
      'You are not authorized to post account transactions.';
  end if;


  /* =======================================================
   * Validate Account
   * ======================================================= */

  select
    currency_code,
    is_active,
    allow_negative_balance,
    current_balance

  into
    v_account_currency,
    v_account_active,
    v_allow_negative,
    v_current_balance

  from
    public.financial_accounts

  where
    id =
      p_account_id

  for update;


  if not found then
    raise exception
      'Financial account was not found.';
  end if;


  if not v_account_active then
    raise exception
      'Financial account is inactive.';
  end if;


  /* =======================================================
   * Validate Transaction
   * ======================================================= */

  if
    p_direction not in (
      'in',
      'out'
    )
  then
    raise exception
      'Invalid account transaction direction.';
  end if;


  if
    p_transaction_type not in (
      'opening_balance',
      'customer_receipt',
      'supplier_payment',
      'expense',
      'transfer_in',
      'transfer_out',
      'adjustment_in',
      'adjustment_out',
      'other_in',
      'other_out'
    )
  then
    raise exception
      'Invalid account transaction type.';
  end if;


  if
    p_amount is null
    or p_amount <= 0
  then
    raise exception
      'Transaction amount must be greater than zero.';
  end if;


  if
    p_exchange_rate is null
    or p_exchange_rate <= 0
  then
    raise exception
      'Exchange rate must be greater than zero.';
  end if;


  if
    upper(
      trim(
        coalesce(
          p_currency_code,
          ''
        )
      )
    )
    !~ '^[A-Z]{3}$'
  then
    raise exception
      'A valid three-letter currency code is required.';
  end if;


  /*
   * For now, account currency and transaction currency must
   * match.
   *
   * Multi-currency treasury conversion can be added later
   * with explicit FX transfer handling.
   */

  if
    upper(
      p_currency_code
    )
    <>
    upper(
      v_account_currency
    )
  then
    raise exception
      'Transaction currency does not match the financial account currency.';
  end if;


  v_base_amount :=
    round(
      p_amount *
      p_exchange_rate,
      2
    );


  v_new_balance :=
    case
      when p_direction = 'in'
      then
        v_current_balance +
        v_base_amount

      else
        v_current_balance -
        v_base_amount
    end;


  if
    not v_allow_negative
    and v_new_balance < 0
  then
    raise exception
      'This account does not allow a negative balance.';
  end if;


  /* =======================================================
   * Transaction Header
   * ======================================================= */

  v_transaction_number :=
    public.next_account_transaction_number();


  insert into
    public.account_transactions
  (
    transaction_number,

    transaction_date,

    account_id,

    direction,

    transaction_type,

    status,

    amount,

    currency_code,

    exchange_rate,

    base_amount,

    reference_type,

    reference_id,

    reference_number,

    description,

    notes,

    posted_at,

    created_by,

    posted_by
  )

  values
  (
    v_transaction_number,

    coalesce(
      p_transaction_date,
      current_date
    ),

    p_account_id,

    p_direction,

    p_transaction_type,

    'posted',

    round(
      p_amount,
      2
    ),

    upper(
      p_currency_code
    ),

    p_exchange_rate,

    v_base_amount,

    nullif(
      trim(
        coalesce(
          p_reference_type,
          ''
        )
      ),
      ''
    ),

    p_reference_id,

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
          p_description,
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

    now(),

    v_user_id,

    v_user_id
  )

  returning
    id

  into
    v_transaction_id;


  perform
    public.sync_financial_account_balance(
      p_account_id
    );


  return
    v_transaction_id;

end;
$$;


/* =========================================================
 * Cancel Account Transaction
 * ========================================================= */

create or replace function
  public.cancel_account_transaction(
    p_transaction_id uuid,
    p_reason text
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_account_id uuid;

  v_status text;

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
      'You are not authorized to cancel account transactions.';
  end if;


  select
    account_id,
    status

  into
    v_account_id,
    v_status

  from
    public.account_transactions

  where
    id =
      p_transaction_id

  for update;


  if not found then
    raise exception
      'Account transaction was not found.';
  end if;


  if
    v_status =
    'cancelled'
  then
    return;
  end if;


  update
    public.account_transactions

  set
    status =
      'cancelled',

    cancelled_at =
      now(),

    cancelled_by =
      v_user_id,

    cancellation_reason =
      nullif(
        trim(
          coalesce(
            p_reason,
            ''
          )
        ),
        ''
      ),

    updated_at =
      now()

  where
    id =
      p_transaction_id;


  perform
    public.sync_financial_account_balance(
      v_account_id
    );

end;
$$;


/* =========================================================
 * Security
 * ========================================================= */

alter table
  public.account_transactions
enable row level security;


drop policy if exists
  "Management can manage account transactions"
on public.account_transactions;


create policy
  "Management can manage account transactions"
on public.account_transactions
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
      update
on public.account_transactions
to authenticated;


revoke all
on function
  public.next_account_transaction_number()
from public;


grant execute
on function
  public.next_account_transaction_number()
to authenticated;


revoke all
on function
  public.sync_financial_account_balance(
    uuid
  )
from public;


grant execute
on function
  public.sync_financial_account_balance(
    uuid
  )
to authenticated;


revoke all
on function
  public.post_account_transaction(
    uuid,
    date,
    text,
    text,
    numeric,
    text,
    numeric,
    text,
    uuid,
    text,
    text,
    text
  )
from public;


grant execute
on function
  public.post_account_transaction(
    uuid,
    date,
    text,
    text,
    numeric,
    text,
    numeric,
    text,
    uuid,
    text,
    text,
    text
  )
to authenticated;


revoke all
on function
  public.cancel_account_transaction(
    uuid,
    text
  )
from public;


grant execute
on function
  public.cancel_account_transaction(
    uuid,
    text
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on table
  public.account_transactions
is
  'Posted operational money movements for cash, bank, card, gateway and clearing accounts.';