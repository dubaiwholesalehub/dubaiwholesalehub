/*
 * =========================================================
 * 077 — Financial Account Opening Balances
 *
 * Opening balance is stored on financial_accounts.
 *
 * An opening_balance account transaction is also created
 * for audit/history, but sync_financial_account_balance()
 * excludes opening_balance transactions from transaction
 * totals so the balance is never counted twice.
 * =========================================================
 */


/* =========================================================
 * Post Financial Account Opening Balance
 * ========================================================= */

create or replace function
  public.post_financial_account_opening_balance(
    p_financial_account_id uuid,
    p_transaction_date date,
    p_amount numeric,
    p_description text default null
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_account
    public.financial_accounts%rowtype;

  v_transaction_id uuid;

  v_direction text;

  v_amount
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
      'You are not authorized to post financial account opening balances.';
  end if;


  /* =======================================================
   * Validate Amount
   * ======================================================= */

  v_amount :=
    round(
      coalesce(
        p_amount,
        0
      ),
      2
    );


  if
    v_amount = 0
  then
    raise exception
      'Opening balance cannot be zero.';
  end if;


  /* =======================================================
   * Lock Financial Account
   * ======================================================= */

  select
    *

  into
    v_account

  from
    public.financial_accounts

  where
    id =
      p_financial_account_id

  for update;


  if not found then
    raise exception
      'Financial account was not found.';
  end if;


  if
    not v_account.is_active
  then
    raise exception
      'Financial account is inactive.';
  end if;


  /* =======================================================
   * Opening Balance Must Be Set Only Once
   * ======================================================= */

  if exists (
    select
      1

    from
      public.account_transactions

    where
      account_id =
        p_financial_account_id

      and transaction_type =
        'opening_balance'

      and status =
        'posted'
  )
  then
    raise exception
      'An opening balance has already been posted for this account.';
  end if;


  /*
   * Also protect against an account whose opening balance
   * was manually populated before this workflow existed.
   */

  if
    round(
      coalesce(
        v_account.opening_balance,
        0
      ),
      2
    ) <> 0
  then
    raise exception
      'This financial account already has an opening balance.';
  end if;


  /* =======================================================
   * Negative Opening Balance Validation
   * ======================================================= */

  if
    v_amount < 0
    and
    not v_account.allow_negative_balance
  then
    raise exception
      'This account does not allow a negative opening balance.';
  end if;


  /* =======================================================
   * Store Master Opening Balance FIRST
   *
   * Everything is inside the same PostgreSQL transaction.
   * If account transaction posting fails, this update also
   * rolls back automatically.
   * ======================================================= */

  update
    public.financial_accounts

  set
    opening_balance =
      v_amount,

    updated_at =
      now()

  where
    id =
      p_financial_account_id;


  /* =======================================================
   * Direction
   * ======================================================= */

  if
    v_amount > 0
  then
    v_direction :=
      'in';
  else
    v_direction :=
      'out';
  end if;


  /* =======================================================
   * Create Audit Ledger Transaction
   *
   * IMPORTANT:
   * sync_financial_account_balance() excludes transaction
   * type opening_balance from its transaction sum because
   * the amount already exists in financial_accounts.
   * opening_balance.
   * ======================================================= */

  v_transaction_id :=
    public.post_account_transaction(
      p_financial_account_id,

      coalesce(
        p_transaction_date,
        current_date
      ),

      v_direction,

      'opening_balance',

      abs(
        v_amount
      ),

      v_account.currency_code,

      1,

      'financial_account',

      p_financial_account_id,

      v_account.account_code,

      coalesce(
        nullif(
          trim(
            p_description
          ),
          ''
        ),
        concat(
          'Opening Balance - ',
          v_account.account_name
        )
      ),

      'Financial account opening balance.'
    );


  /*
   * post_account_transaction() already runs
   * sync_financial_account_balance().
   */


  return
    v_transaction_id;

end;
$$;


/* =========================================================
 * Cancel Financial Account Opening Balance
 *
 * We provide a dedicated cancellation function because
 * cancelling only the transaction would leave the master
 * opening_balance amount on financial_accounts.
 * ========================================================= */

create or replace function
  public.cancel_financial_account_opening_balance(
    p_financial_account_id uuid,
    p_reason text
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_transaction_id uuid;

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
      'You are not authorized to cancel financial account opening balances.';
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


  /*
   * Lock the account.
   */

  perform
    1

  from
    public.financial_accounts

  where
    id =
      p_financial_account_id

  for update;


  if not found then
    raise exception
      'Financial account was not found.';
  end if;


  select
    id

  into
    v_transaction_id

  from
    public.account_transactions

  where
    account_id =
      p_financial_account_id

    and transaction_type =
      'opening_balance'

    and status =
      'posted'

  order by
    created_at desc

  limit 1

  for update;


  if not found then
    raise exception
      'No posted opening balance was found for this account.';
  end if;


  /*
   * Reset master opening balance before cancelling.
   *
   * cancel_account_transaction() will subsequently run
   * sync_financial_account_balance().
   */

  update
    public.financial_accounts

  set
    opening_balance =
      0,

    updated_at =
      now()

  where
    id =
      p_financial_account_id;


  perform
    public.cancel_account_transaction(
      v_transaction_id,
      v_reason
    );

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.post_financial_account_opening_balance(
    uuid,
    date,
    numeric,
    text
  )
from public;


grant execute
on function
  public.post_financial_account_opening_balance(
    uuid,
    date,
    numeric,
    text
  )
to authenticated;


revoke all
on function
  public.cancel_financial_account_opening_balance(
    uuid,
    text
  )
from public;


grant execute
on function
  public.cancel_financial_account_opening_balance(
    uuid,
    text
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.post_financial_account_opening_balance(
    uuid,
    date,
    numeric,
    text
  )
is
  'Posts the initial financial account balance while creating an auditable opening_balance account transaction without double counting it in the account balance.';


comment on function
  public.cancel_financial_account_opening_balance(
    uuid,
    text
  )
is
  'Cancels a financial account opening balance, resets the master opening balance and recalculates the account balance.';