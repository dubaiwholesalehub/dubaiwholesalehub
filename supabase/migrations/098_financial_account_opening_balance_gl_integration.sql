/*
 * =========================================================
 * 098 — Financial Account Opening Balance GL Integration
 *
 * PURPOSE
 * -------
 *
 * Posts operational Financial Account Opening Balances to
 * the formal General Ledger.
 *
 *
 * EXISTING OPERATIONAL WORKFLOW
 * -----------------------------
 *
 * public.post_financial_account_opening_balance(...)
 *
 * stores:
 *
 *   financial_accounts.opening_balance
 *
 * and creates one posted audit transaction:
 *
 *   account_transactions.transaction_type =
 *     opening_balance
 *
 *
 * POSITIVE OPENING BALANCE
 * ------------------------
 *
 *   Dr Financial Account
 *      Cr Opening Balance Equity
 *
 *
 * NEGATIVE OPENING BALANCE
 * ------------------------
 *
 *   Dr Opening Balance Equity
 *      Cr Financial Account
 *
 *
 * OPENING EQUITY
 * --------------
 *
 * Mapping:
 *
 *   opening_balance_equity
 *
 * Account:
 *
 *   3400 — Opening Balance Equity
 *
 *
 * IMPORTANT FX LIMITATION
 * -----------------------
 *
 * Migration 077 currently posts Financial Account Opening
 * Balance account_transactions with exchange_rate = 1.
 *
 * Therefore this GL adapter accepts AED accounts only.
 *
 * Non-AED opening balances are rejected until the
 * operational opening-balance workflow supports an explicit
 * historical AED exchange rate.
 *
 *
 * SOURCE
 * ------
 *
 * source_type = financial_account_opening_balance
 * source_id   = financial_accounts.id
 *
 *
 * SOURCE LINE
 * -----------
 *
 * account_transactions.id
 *
 *
 * IDEMPOTENCY
 * -----------
 *
 * public.post_erp_gl_journal(...)
 * =========================================================
 */


/* =========================================================
 * 1. Financial Account Opening Balance → GL
 * ========================================================= */

create or replace function
  public.post_financial_account_opening_balance_gl(
    p_financial_account_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_account
    public.financial_accounts%rowtype;


  v_transaction
    public.account_transactions%rowtype;


  v_financial_gl_account_id uuid;

  v_opening_equity_gl_account_id uuid;


  v_signed_opening_balance
    numeric(18, 2);

  v_accounting_amount
    numeric(18, 2);


  v_lines jsonb;

  v_journal_id uuid;

begin

  /* =======================================================
   * Authentication / Authorization
   * ======================================================= */

  if
    auth.uid() is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if
    not public.is_admin()
  then
    raise exception
      'Administrator access is required.';
  end if;


  if
    p_financial_account_id
      is null
  then
    raise exception
      'Financial Account ID is required.';
  end if;


  /* =======================================================
   * Load + Lock Financial Account
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


  if not found
  then
    raise exception
      'Financial Account was not found.';
  end if;


  /* =======================================================
   * Opening Balance Required
   * ======================================================= */

  v_signed_opening_balance :=
    round(
      coalesce(
        v_account.opening_balance,
        0
      ),
      2
    );


  if
    v_signed_opening_balance =
      0
  then
    raise exception
      'Financial Account % does not have a posted opening balance.',
      v_account.account_code;
  end if;


  /* =======================================================
   * Base Currency Safety
   *
   * Current operational opening-balance workflow uses
   * exchange_rate = 1.
   *
   * Until it becomes FX-aware, only AED opening balances may
   * enter the formal GL.
   * ======================================================= */

  if
    upper(
      v_account.currency_code
    ) <>
    'AED'
  then
    raise exception
      'Financial Account % uses currency %. Non-AED opening balances require an FX-aware opening-balance workflow before GL posting.',
      v_account.account_code,
      v_account.currency_code;
  end if;


  /* =======================================================
   * Find Posted Operational Opening-Balance Transaction
   * ======================================================= */

  select
    *

  into
    v_transaction

  from
    public.account_transactions

  where
    account_id =
      v_account.id

    and
    transaction_type =
      'opening_balance'

    and
    status =
      'posted'

  order by
    created_at desc

  limit 1

  for update;


  if not found
  then
    raise exception
      'Financial Account % does not have its posted opening-balance account transaction.',
      v_account.account_code;
  end if;


  /* =======================================================
   * Validate Source Link
   * ======================================================= */

  if
    v_transaction.reference_type
      is distinct from
      'financial_account'

    or

    v_transaction.reference_id
      is distinct from
      v_account.id
  then
    raise exception
      'Financial Account % opening-balance transaction has invalid source linkage.',
      v_account.account_code;
  end if;


  if
    v_transaction.account_id <>
      v_account.id
  then
    raise exception
      'Financial Account % opening-balance transaction references the wrong account.',
      v_account.account_code;
  end if;


  /* =======================================================
   * Validate Currency
   * ======================================================= */

  if
    upper(
      v_transaction.currency_code
    ) <>
    upper(
      v_account.currency_code
    )
  then
    raise exception
      'Financial Account % opening-balance transaction currency does not match the account.',
      v_account.account_code;
  end if;


  if
    abs(
      v_transaction.exchange_rate
      -
      1
    ) >
      0.000001
  then
    raise exception
      'Financial Account % AED opening-balance transaction must use exchange rate 1.',
      v_account.account_code;
  end if;


  /* =======================================================
   * Validate Sign / Direction
   * ======================================================= */

  if
    v_signed_opening_balance >
      0

    and

    v_transaction.direction <>
      'in'
  then
    raise exception
      'Financial Account % has a positive opening balance but its audit transaction is not money-in.',
      v_account.account_code;
  end if;


  if
    v_signed_opening_balance <
      0

    and

    v_transaction.direction <>
      'out'
  then
    raise exception
      'Financial Account % has a negative opening balance but its audit transaction is not money-out.',
      v_account.account_code;
  end if;


  /* =======================================================
   * Validate Amount
   * ======================================================= */

  v_accounting_amount :=
    abs(
      v_signed_opening_balance
    );


  if
    abs(
      round(
        v_transaction.amount,
        2
      )
      -
      v_accounting_amount
    ) >
      0.01
  then
    raise exception
      'Financial Account % opening balance does not match its audit transaction amount.',
      v_account.account_code;
  end if;


  if
    abs(
      round(
        v_transaction.base_amount,
        2
      )
      -
      v_accounting_amount
    ) >
      0.01
  then
    raise exception
      'Financial Account % opening balance does not match its AED base amount.',
      v_account.account_code;
  end if;


  /* =======================================================
   * Resolve Formal GL Accounts
   * ======================================================= */

  v_financial_gl_account_id :=
    public.get_financial_account_gl_account(
      v_account.id
    );


  v_opening_equity_gl_account_id :=
    public.get_mapped_gl_account(
      'opening_balance_equity'
    );


  if
    v_financial_gl_account_id =
      v_opening_equity_gl_account_id
  then
    raise exception
      'Financial Account % resolves to Opening Balance Equity, which is not a valid treasury mapping.',
      v_account.account_code;
  end if;


  /* =======================================================
   * Build Journal
   * ======================================================= */

  if
    v_signed_opening_balance >
      0
  then

    /*
     * Positive opening asset.
     *
     * Dr Financial Account
     *    Cr Opening Balance Equity
     */

    v_lines :=
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_financial_gl_account_id,

          'debit',
            v_accounting_amount,

          'credit',
            0,

          'baseDebit',
            v_accounting_amount,

          'baseCredit',
            0,

          'description',
            'Financial Account Opening Balance - '
            ||
            v_account.account_name,

          'financialAccountId',
            v_account.id,

          'sourceLineType',
            'account_transaction',

          'sourceLineId',
            v_transaction.id,

          'sourceLineNumber',
            1
        ),


        jsonb_build_object(
          'glAccountId',
            v_opening_equity_gl_account_id,

          'debit',
            0,

          'credit',
            v_accounting_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_accounting_amount,

          'description',
            'Opening Balance Equity - '
            ||
            v_account.account_name,

          'financialAccountId',
            v_account.id,

          'sourceLineType',
            'account_transaction',

          'sourceLineId',
            v_transaction.id,

          'sourceLineNumber',
            2
        )
      );


  else

    /*
     * Negative opening balance.
     *
     * Dr Opening Balance Equity
     *    Cr Financial Account
     */

    v_lines :=
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_opening_equity_gl_account_id,

          'debit',
            v_accounting_amount,

          'credit',
            0,

          'baseDebit',
            v_accounting_amount,

          'baseCredit',
            0,

          'description',
            'Opening Balance Equity - '
            ||
            v_account.account_name,

          'financialAccountId',
            v_account.id,

          'sourceLineType',
            'account_transaction',

          'sourceLineId',
            v_transaction.id,

          'sourceLineNumber',
            1
        ),


        jsonb_build_object(
          'glAccountId',
            v_financial_gl_account_id,

          'debit',
            0,

          'credit',
            v_accounting_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_accounting_amount,

          'description',
            'Financial Account Negative Opening Balance - '
            ||
            v_account.account_name,

          'financialAccountId',
            v_account.id,

          'sourceLineType',
            'account_transaction',

          'sourceLineId',
            v_transaction.id,

          'sourceLineNumber',
            2
        )
      );

  end if;


  /* =======================================================
   * Post Through Controlled GL Engine
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'financial_account_opening_balance',

      v_account.id,

      v_transaction.transaction_number,

      v_transaction.transaction_date,

      v_transaction.transaction_date,

      'Financial Account Opening Balance - '
      ||
      v_account.account_name,

      'AED',

      1,

      v_lines
    );


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 2. Permissions
 * ========================================================= */

revoke all
on function
  public.post_financial_account_opening_balance_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_financial_account_opening_balance_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.post_financial_account_opening_balance_gl(
    uuid
  )
is
  'Posts an existing AED Financial Account Opening Balance to the formal General Ledger. Positive balances debit the Financial Account GL and credit Opening Balance Equity; negative balances reverse the entry. Uses the existing posted opening_balance account transaction for audit/source linkage and rejects non-AED opening balances until the operational workflow supports explicit FX valuation.';