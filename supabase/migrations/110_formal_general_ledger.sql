/*
 * =========================================================
 * 110 — Formal General Ledger / Account Ledger
 *
 * PURPOSE
 * -------
 *
 * Provides the detailed General Ledger for one posting
 * account over a selected reporting period.
 *
 * The report is derived directly from:
 *
 *   gl_journal_entries
 *   gl_journal_lines
 *   gl_accounts
 *
 *
 * ACCOUNTING MODEL
 * ----------------
 *
 * Opening Balance
 *
 *   all posted/reversed GL activity before p_date_from
 *
 *
 * Period Activity
 *
 *   all posted/reversed GL activity between:
 *
 *     p_date_from
 *     p_date_to
 *
 *
 * Closing Balance
 *
 *   Opening Balance
 *   +
 *   Period Net Movement
 *
 *
 * BASE CURRENCY
 * -------------
 *
 * AED using:
 *
 *   base_debit
 *   base_credit
 *
 *
 * REVERSALS
 * ---------
 *
 * Includes journal headers whose status is:
 *
 *   posted
 *   reversed
 *
 * A reversed original journal remains part of accounting
 * history. Its reversing journal is a separate posted
 * accounting event.
 *
 *
 * RECONCILIATION
 * --------------
 *
 * Closing balance produced by this report must reconcile
 * with the same account in the Formal Trial Balance.
 * =========================================================
 */


create or replace function
  public.get_formal_general_ledger(
    p_gl_account_id uuid,
    p_date_from date,
    p_date_to date
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_account
    public.gl_accounts%rowtype;

  v_opening_debit
    numeric(18, 2);

  v_opening_credit
    numeric(18, 2);

  v_opening_net
    numeric(18, 2);

  v_period_debit
    numeric(18, 2);

  v_period_credit
    numeric(18, 2);

  v_closing_net
    numeric(18, 2);

  v_transactions
    jsonb;

  v_result
    jsonb;

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
      'You are not authorized to view the formal General Ledger.';
  end if;


  /* =======================================================
   * Validate Parameters
   * ======================================================= */

  if
    p_gl_account_id is null
  then
    raise exception
      'GL Account is required.';
  end if;


  if
    p_date_from is null
    or
    p_date_to is null
  then
    raise exception
      'Date From and Date To are required.';
  end if;


  if
    p_date_from >
      p_date_to
  then
    raise exception
      'Date From cannot be after Date To.';
  end if;


  /* =======================================================
   * Resolve GL Account
   * ======================================================= */

  select
    *
  into
    v_account
  from
    public.gl_accounts
  where
    id =
      p_gl_account_id;


  if not found then
    raise exception
      'GL account % does not exist.',
      p_gl_account_id;
  end if;


  if
    not v_account.is_posting_account
  then
    raise exception
      'GL account % - % is not a posting account.',
      v_account.account_code,
      v_account.account_name;
  end if;


  /* =======================================================
   * Opening Activity
   * ======================================================= */

  select

    round(
      coalesce(
        sum(
          line.base_debit
        ),
        0
      ),
      2
    ),

    round(
      coalesce(
        sum(
          line.base_credit
        ),
        0
      ),
      2
    )

  into
    v_opening_debit,
    v_opening_credit

  from
    public.gl_journal_lines line

  inner join
    public.gl_journal_entries journal

    on
      journal.id =
        line.journal_entry_id

  where
    line.gl_account_id =
      p_gl_account_id

    and
    journal.posting_date <
      p_date_from

    and
    journal.status in (
      'posted',
      'reversed'
    );


  v_opening_net :=
    round(
      v_opening_debit
      -
      v_opening_credit,
      2
    );


  /* =======================================================
   * Period Totals
   * ======================================================= */

  select

    round(
      coalesce(
        sum(
          line.base_debit
        ),
        0
      ),
      2
    ),

    round(
      coalesce(
        sum(
          line.base_credit
        ),
        0
      ),
      2
    )

  into
    v_period_debit,
    v_period_credit

  from
    public.gl_journal_lines line

  inner join
    public.gl_journal_entries journal

    on
      journal.id =
        line.journal_entry_id

  where
    line.gl_account_id =
      p_gl_account_id

    and
    journal.posting_date
      between
        p_date_from
        and
        p_date_to

    and
    journal.status in (
      'posted',
      'reversed'
    );


  v_closing_net :=
    round(
      v_opening_net
      +
      v_period_debit
      -
      v_period_credit,
      2
    );


  /* =======================================================
   * Detailed Ledger Transactions
   *
   * Running balance uses accounting chronology:
   *
   *   posting_date
   *   journal_number
   *   line_number
   *   line.id
   * ======================================================= */

  with

  period_lines as (

    select

      line.id
        as journal_line_id,

      journal.id
        as journal_entry_id,

      journal.journal_number,

      journal.journal_date,

      journal.posting_date,

      journal.source_type,

      journal.source_id,

      journal.source_number,

      journal.description
        as journal_description,

      journal.status
        as journal_status,

      journal.original_entry_id,

      journal.reversal_entry_id,

      journal.reversal_reason,

      line.line_number,

      line.description
        as line_description,

      line.base_debit,

      line.base_credit,

      line.customer_id,

      line.supplier_id,

      line.product_id,

      line.warehouse_id,

      line.financial_account_id,

      line.expense_category_id,

      line.source_line_type,

      line.source_line_id,

      line.source_line_number,

      round(
        v_opening_net
        +
        sum(
          line.base_debit
          -
          line.base_credit
        )
        over (
          order by
            journal.posting_date,
            journal.journal_number,
            line.line_number,
            line.id
          rows between
            unbounded preceding
            and
            current row
        ),
        2
      )
        as running_net

    from
      public.gl_journal_lines line

    inner join
      public.gl_journal_entries journal

      on
        journal.id =
          line.journal_entry_id

    where
      line.gl_account_id =
        p_gl_account_id

      and
      journal.posting_date
        between
          p_date_from
          and
          p_date_to

      and
      journal.status in (
        'posted',
        'reversed'
      )

  )

  select
    coalesce(
      jsonb_agg(

        jsonb_build_object(

          'journalLineId',
            journal_line_id,

          'journalEntryId',
            journal_entry_id,

          'journalNumber',
            journal_number,

          'journalDate',
            journal_date,

          'postingDate',
            posting_date,

          'sourceType',
            source_type,

          'sourceId',
            source_id,

          'sourceNumber',
            source_number,

          'journalDescription',
            journal_description,

          'journalStatus',
            journal_status,

          'originalEntryId',
            original_entry_id,

          'reversalEntryId',
            reversal_entry_id,

          'reversalReason',
            reversal_reason,

          'lineNumber',
            line_number,

          'lineDescription',
            line_description,

          'debit',
            round(
              base_debit,
              2
            ),

          'credit',
            round(
              base_credit,
              2
            ),

          'runningDebit',
            case
              when running_net >
                0
              then
                running_net
              else
                0
            end,

          'runningCredit',
            case
              when running_net <
                0
              then
                abs(
                  running_net
                )
              else
                0
            end,

          'balanceSide',
            case

              when running_net >
                0
              then
                'debit'

              when running_net <
                0
              then
                'credit'

              else
                'zero'

            end,

          'customerId',
            customer_id,

          'supplierId',
            supplier_id,

          'productId',
            product_id,

          'warehouseId',
            warehouse_id,

          'financialAccountId',
            financial_account_id,

          'expenseCategoryId',
            expense_category_id,

          'sourceLineType',
            source_line_type,

          'sourceLineId',
            source_line_id,

          'sourceLineNumber',
            source_line_number

        )

        order by
          posting_date,
          journal_number,
          line_number,
          journal_line_id

      ),
      '[]'::jsonb
    )

  into
    v_transactions

  from
    period_lines;


  /* =======================================================
   * Final Report
   * ======================================================= */

  v_result :=
    jsonb_build_object(

      'statementType',
        'general_ledger',

      'currencyCode',
        'AED',

      'dateFrom',
        p_date_from,

      'dateTo',
        p_date_to,


      'account',
        jsonb_build_object(

          'glAccountId',
            v_account.id,

          'accountCode',
            v_account.account_code,

          'accountName',
            v_account.account_name,

          'accountClass',
            v_account.account_class,

          'statementType',
            v_account.statement_type,

          'normalBalance',
            v_account.normal_balance,

          'isControlAccount',
            v_account.is_control_account,

          'isActive',
            v_account.is_active

        ),


      'openingDebit',
        case
          when v_opening_net >
            0
          then
            v_opening_net
          else
            0
        end,

      'openingCredit',
        case
          when v_opening_net <
            0
          then
            abs(
              v_opening_net
            )
          else
            0
        end,


      'periodDebit',
        v_period_debit,

      'periodCredit',
        v_period_credit,


      'closingDebit',
        case
          when v_closing_net >
            0
          then
            v_closing_net
          else
            0
        end,

      'closingCredit',
        case
          when v_closing_net <
            0
          then
            abs(
              v_closing_net
            )
          else
            0
        end,


      'transactionCount',
        jsonb_array_length(
          v_transactions
        ),

      'transactions',
        v_transactions

    );


  return
    v_result;

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.get_formal_general_ledger(
    uuid,
    date,
    date
  )
from public;


grant execute
on function
  public.get_formal_general_ledger(
    uuid,
    date,
    date
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.get_formal_general_ledger(
    uuid,
    date,
    date
  )
is
  'Returns the formal AED General Ledger / Account Ledger for one posting GL account over a selected period, including opening balance, detailed posted/reversed journal activity, running debit/credit balance, period totals and closing balance. Closing balance reconciles to the Formal Trial Balance for the same account and reporting date.';