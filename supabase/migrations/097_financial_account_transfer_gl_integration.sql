/*
 * =========================================================
 * 097 — Financial Account Transfer GL Integration
 *
 * PURPOSE
 * -------
 *
 * Posts operational Financial Account Transfers to the
 * formal General Ledger.
 *
 *
 * EXISTING OPERATIONAL WORKFLOW
 * -----------------------------
 *
 * public.post_financial_account_transfer(...)
 *
 * already creates:
 *
 *   Source account:
 *     account_transactions.transaction_type = transfer_out
 *
 *   Destination account:
 *     account_transactions.transaction_type = transfer_in
 *
 * Both:
 *
 *   - are posted
 *   - reference the same financial_account_transfer
 *   - share one transfer_group_id
 *   - contain their AED base_amount
 *
 *
 * ACCOUNTING
 * ----------
 *
 *   Dr Destination Financial Account
 *      Cr Source Financial Account
 *
 *
 * NO PROFIT IMPACT
 * ----------------
 *
 * Financial-account transfers are balance-sheet movements.
 *
 * Therefore:
 *
 *   source base_amount
 *
 * must equal
 *
 *   destination base_amount
 *
 * within accounting rounding tolerance.
 *
 * If they do not match, GL posting is rejected instead of
 * creating an artificial FX gain or loss.
 *
 *
 * FORMAL GL CURRENCY
 * ------------------
 *
 * The GL journal is posted in AED base currency.
 *
 * This allows AED-to-AED and foreign-currency treasury
 * transfers to use the exact base amounts already recorded
 * by the operational account_transactions ledger.
 *
 *
 * SOURCE
 * ------
 *
 * source_type = financial_account_transfer
 * source_id   = financial_account_transfers.id
 *
 *
 * Idempotency:
 *
 * public.post_erp_gl_journal(...)
 * =========================================================
 */


/* =========================================================
 * 1. Financial Account Transfer → GL Adapter
 * ========================================================= */

create or replace function
  public.post_financial_account_transfer_gl(
    p_transfer_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_transfer
    public.financial_account_transfers%rowtype;


  v_out_transaction
    public.account_transactions%rowtype;

  v_in_transaction
    public.account_transactions%rowtype;


  v_from_gl_account_id uuid;

  v_to_gl_account_id uuid;


  v_source_base_amount
    numeric(18, 2);

  v_destination_base_amount
    numeric(18, 2);

  v_gl_amount
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
    p_transfer_id is null
  then
    raise exception
      'Financial Account Transfer ID is required.';
  end if;


  /* =======================================================
   * Load + Lock Transfer
   * ======================================================= */

  select
    *

  into
    v_transfer

  from
    public.financial_account_transfers

  where
    id =
      p_transfer_id

  for update;


  if not found
  then
    raise exception
      'Financial Account Transfer was not found.';
  end if;


  /* =======================================================
   * Transfer Must Be Posted
   * ======================================================= */

  if
    v_transfer.status <>
      'posted'
  then
    raise exception
      'Financial Account Transfer % must be posted before General Ledger posting.',
      v_transfer.transfer_number;
  end if;


  if
    v_transfer.from_account_id
      is null
    or
    v_transfer.to_account_id
      is null
  then
    raise exception
      'Financial Account Transfer % does not contain valid source and destination accounts.',
      v_transfer.transfer_number;
  end if;


  if
    v_transfer.from_account_id =
      v_transfer.to_account_id
  then
    raise exception
      'Financial Account Transfer % cannot use the same source and destination account.',
      v_transfer.transfer_number;
  end if;


  /* =======================================================
   * Operational Account Transactions Must Exist
   * ======================================================= */

  if
    v_transfer.out_transaction_id
      is null
  then
    raise exception
      'Financial Account Transfer % does not have its transfer-out transaction.',
      v_transfer.transfer_number;
  end if;


  if
    v_transfer.in_transaction_id
      is null
  then
    raise exception
      'Financial Account Transfer % does not have its transfer-in transaction.',
      v_transfer.transfer_number;
  end if;


  /* =======================================================
   * Load Transfer-Out Transaction
   * ======================================================= */

  select
    *

  into
    v_out_transaction

  from
    public.account_transactions

  where
    id =
      v_transfer.out_transaction_id;


  if not found
  then
    raise exception
      'Financial Account Transfer % transfer-out transaction was not found.',
      v_transfer.transfer_number;
  end if;


  /* =======================================================
   * Load Transfer-In Transaction
   * ======================================================= */

  select
    *

  into
    v_in_transaction

  from
    public.account_transactions

  where
    id =
      v_transfer.in_transaction_id;


  if not found
  then
    raise exception
      'Financial Account Transfer % transfer-in transaction was not found.',
      v_transfer.transfer_number;
  end if;


  /* =======================================================
   * Validate Transfer-Out Transaction
   * ======================================================= */

  if
    v_out_transaction.status <>
      'posted'
  then
    raise exception
      'Financial Account Transfer % transfer-out transaction is not posted.',
      v_transfer.transfer_number;
  end if;


  if
    v_out_transaction.direction <>
      'out'
    or
    v_out_transaction.transaction_type <>
      'transfer_out'
  then
    raise exception
      'Financial Account Transfer % has an invalid transfer-out transaction.',
      v_transfer.transfer_number;
  end if;


  if
    v_out_transaction.account_id <>
      v_transfer.from_account_id
  then
    raise exception
      'Financial Account Transfer % transfer-out account does not match the source account.',
      v_transfer.transfer_number;
  end if;


  if
    v_out_transaction.reference_type is distinct from
      'financial_account_transfer'
    or
    v_out_transaction.reference_id is distinct from
      v_transfer.id
  then
    raise exception
      'Financial Account Transfer % transfer-out source linkage is invalid.',
      v_transfer.transfer_number;
  end if;


  /* =======================================================
   * Validate Transfer-In Transaction
   * ======================================================= */

  if
    v_in_transaction.status <>
      'posted'
  then
    raise exception
      'Financial Account Transfer % transfer-in transaction is not posted.',
      v_transfer.transfer_number;
  end if;


  if
    v_in_transaction.direction <>
      'in'
    or
    v_in_transaction.transaction_type <>
      'transfer_in'
  then
    raise exception
      'Financial Account Transfer % has an invalid transfer-in transaction.',
      v_transfer.transfer_number;
  end if;


  if
    v_in_transaction.account_id <>
      v_transfer.to_account_id
  then
    raise exception
      'Financial Account Transfer % transfer-in account does not match the destination account.',
      v_transfer.transfer_number;
  end if;


  if
    v_in_transaction.reference_type is distinct from
      'financial_account_transfer'
    or
    v_in_transaction.reference_id is distinct from
      v_transfer.id
  then
    raise exception
      'Financial Account Transfer % transfer-in source linkage is invalid.',
      v_transfer.transfer_number;
  end if;


  /* =======================================================
   * Validate Shared Transfer Group
   * ======================================================= */

  if
    v_transfer.transfer_group_id
      is null
    or
    v_out_transaction.transfer_group_id
      is null
    or
    v_in_transaction.transfer_group_id
      is null
  then
    raise exception
      'Financial Account Transfer % does not contain complete transfer-group linkage.',
      v_transfer.transfer_number;
  end if;


  if
    v_out_transaction.transfer_group_id <>
      v_transfer.transfer_group_id
    or
    v_in_transaction.transfer_group_id <>
      v_transfer.transfer_group_id
  then
    raise exception
      'Financial Account Transfer % account transactions do not share the transfer group.',
      v_transfer.transfer_number;
  end if;


  /* =======================================================
   * Validate Transaction Amounts Against Transfer Header
   * ======================================================= */

  if
    abs(
      round(
        v_out_transaction.amount,
        2
      )
      -
      round(
        v_transfer.from_amount,
        2
      )
    ) > 0.01
  then
    raise exception
      'Financial Account Transfer % source amount does not match its transfer-out transaction.',
      v_transfer.transfer_number;
  end if;


  if
    abs(
      round(
        v_in_transaction.amount,
        2
      )
      -
      round(
        v_transfer.to_amount,
        2
      )
    ) > 0.01
  then
    raise exception
      'Financial Account Transfer % destination amount does not match its transfer-in transaction.',
      v_transfer.transfer_number;
  end if;


  if
    upper(
      v_out_transaction.currency_code
    )
    <>
    upper(
      v_transfer.from_currency_code
    )
  then
    raise exception
      'Financial Account Transfer % source currency does not match its transfer-out transaction.',
      v_transfer.transfer_number;
  end if;


  if
    upper(
      v_in_transaction.currency_code
    )
    <>
    upper(
      v_transfer.to_currency_code
    )
  then
    raise exception
      'Financial Account Transfer % destination currency does not match its transfer-in transaction.',
      v_transfer.transfer_number;
  end if;


  /* =======================================================
   * Base Currency Validation
   *
   * account_transactions.base_amount is the authoritative
   * operational AED value.
   *
   * Transfers have no P&L impact, so both sides MUST have
   * the same AED value.
   * ======================================================= */

  v_source_base_amount :=
    round(
      v_out_transaction.base_amount,
      2
    );


  v_destination_base_amount :=
    round(
      v_in_transaction.base_amount,
      2
    );


  if
    v_source_base_amount <= 0
    or
    v_destination_base_amount <= 0
  then
    raise exception
      'Financial Account Transfer % contains an invalid base amount.',
      v_transfer.transfer_number;
  end if;


  if
    abs(
      v_source_base_amount
      -
      v_destination_base_amount
    ) > 0.01
  then
    raise exception
      'Financial Account Transfer % is not balanced in AED base currency. Source %, destination %.',
      v_transfer.transfer_number,
      v_source_base_amount,
      v_destination_base_amount;
  end if;


  v_gl_amount :=
    v_source_base_amount;


  /* =======================================================
   * Resolve Source / Destination Formal GL Accounts
   * ======================================================= */

  v_from_gl_account_id :=
    public.get_financial_account_gl_account(
      v_transfer.from_account_id
    );


  v_to_gl_account_id :=
    public.get_financial_account_gl_account(
      v_transfer.to_account_id
    );


  if
    v_from_gl_account_id =
      v_to_gl_account_id
  then
    raise exception
      'Financial Account Transfer % source and destination financial accounts resolve to the same formal GL account.',
      v_transfer.transfer_number;
  end if;


  /* =======================================================
   * Build Formal GL Journal
   *
   * Formal treasury transfer journals are expressed in AED
   * base currency.
   * ======================================================= */

  v_lines :=
    jsonb_build_array(

      /* ---------------------------------------------------
       * Destination Financial Account Debit
       * --------------------------------------------------- */

      jsonb_build_object(
        'glAccountId',
          v_to_gl_account_id,

        'debit',
          v_gl_amount,

        'credit',
          0,

        'baseDebit',
          v_gl_amount,

        'baseCredit',
          0,

        'description',
          'Transfer In - '
          ||
          v_transfer.transfer_number,

        'financialAccountId',
          v_transfer.to_account_id,

        'sourceLineType',
          'account_transaction',

        'sourceLineId',
          v_in_transaction.id,

        'sourceLineNumber',
          1
      ),


      /* ---------------------------------------------------
       * Source Financial Account Credit
       * --------------------------------------------------- */

      jsonb_build_object(
        'glAccountId',
          v_from_gl_account_id,

        'debit',
          0,

        'credit',
          v_gl_amount,

        'baseDebit',
          0,

        'baseCredit',
          v_gl_amount,

        'description',
          'Transfer Out - '
          ||
          v_transfer.transfer_number,

        'financialAccountId',
          v_transfer.from_account_id,

        'sourceLineType',
          'account_transaction',

        'sourceLineId',
          v_out_transaction.id,

        'sourceLineNumber',
          2
      )
    );


  /* =======================================================
   * Post Through Controlled GL Engine
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'financial_account_transfer',

      v_transfer.id,

      v_transfer.transfer_number,

      v_transfer.transfer_date,

      v_transfer.transfer_date,

      case
        when
          v_transfer.reference_number is not null
          and
          btrim(
            v_transfer.reference_number
          ) <> ''
        then
          'Financial Account Transfer - '
          ||
          v_transfer.transfer_number
          ||
          ' - '
          ||
          v_transfer.reference_number

        else
          'Financial Account Transfer - '
          ||
          v_transfer.transfer_number
      end,

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
  public.post_financial_account_transfer_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_financial_account_transfer_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.post_financial_account_transfer_gl(
    uuid
  )
is
  'Posts one operationally-posted Financial Account Transfer to the formal General Ledger. Debits the destination Financial Account GL and credits the source Financial Account GL using the exact AED base_amount stored on the linked transfer account transactions. Rejects transfers whose source and destination AED base amounts differ instead of creating an artificial FX gain or loss.';