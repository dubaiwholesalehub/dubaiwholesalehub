/*
 * =========================================================
 * 109 — Formal Trial Balance
 *
 * PURPOSE
 * -------
 *
 * Provides a date-range Trial Balance directly from the
 * General Ledger.
 *
 *
 * REPORTING MODEL
 * ---------------
 *
 * Opening Balance
 *
 *   all posted/reversed GL activity before p_date_from
 *
 *
 * Period Movement
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
 *   Period Movement
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
 * Includes journals whose status is:
 *
 *   posted
 *   reversed
 *
 * A reversed original journal remains part of the accounting
 * history because the reversing journal is a separate posted
 * accounting entry.
 *
 *
 * ACCOUNT SCOPE
 * -------------
 *
 * Only posting GL accounts are returned.
 *
 * Historical activity remains reportable even if an account
 * is later inactive.
 *
 *
 * BALANCE PRESENTATION
 * --------------------
 *
 * Closing debit / credit are derived from the net base
 * balance:
 *
 *   net = debit - credit
 *
 * Positive net  -> Closing Debit
 * Negative net  -> Closing Credit
 *
 *
 * CONTROL
 * -------
 *
 * Opening Debit  = Opening Credit
 * Period Debit   = Period Credit
 * Closing Debit  = Closing Credit
 *
 * within AED 0.01 tolerance.
 * =========================================================
 */


create or replace function
  public.get_formal_trial_balance(
    p_date_from date,
    p_date_to date
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_result jsonb;

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
      'You are not authorized to view the formal Trial Balance.';
  end if;


  /* =======================================================
   * Validate Reporting Period
   * ======================================================= */

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
   * Trial Balance
   * ======================================================= */

  with

  /*
   * -------------------------------------------------------
   * Aggregate GL movement by posting account.
   * -------------------------------------------------------
   */

  account_activity as (

    select
      account.id
        as gl_account_id,

      account.account_code,

      account.account_name,

      account.account_class,

      account.statement_type,

      account.normal_balance,

      account.is_control_account,

      account.display_order,


      /*
       * Opening activity
       */

      round(
        coalesce(
          sum(
            case

              when
                journal.posting_date <
                  p_date_from
              then
                line.base_debit

              else
                0

            end
          ),
          0
        ),
        2
      )
        as opening_debit_activity,


      round(
        coalesce(
          sum(
            case

              when
                journal.posting_date <
                  p_date_from
              then
                line.base_credit

              else
                0

            end
          ),
          0
        ),
        2
      )
        as opening_credit_activity,


      /*
       * Period movement
       */

      round(
        coalesce(
          sum(
            case

              when
                journal.posting_date
                  between
                    p_date_from
                    and
                    p_date_to
              then
                line.base_debit

              else
                0

            end
          ),
          0
        ),
        2
      )
        as period_debit,


      round(
        coalesce(
          sum(
            case

              when
                journal.posting_date
                  between
                    p_date_from
                    and
                    p_date_to
              then
                line.base_credit

              else
                0

            end
          ),
          0
        ),
        2
      )
        as period_credit

    from
      public.gl_accounts account

    left join
      public.gl_journal_lines line

      on
        line.gl_account_id =
          account.id

    left join
      public.gl_journal_entries journal

      on
        journal.id =
          line.journal_entry_id

      and
        journal.status in (
          'posted',
          'reversed'
        )

      and
        journal.posting_date <=
          p_date_to

    where
      account.is_posting_account =
        true

    group by
      account.id,
      account.account_code,
      account.account_name,
      account.account_class,
      account.statement_type,
      account.normal_balance,
      account.is_control_account,
      account.display_order

  ),


  /*
   * -------------------------------------------------------
   * Opening net balance
   * -------------------------------------------------------
   */

  opening_balances as (

    select
      activity.*,

      round(
        activity.opening_debit_activity
        -
        activity.opening_credit_activity,
        2
      )
        as opening_net

    from
      account_activity activity

  ),


  /*
   * -------------------------------------------------------
   * Opening debit / credit presentation
   * -------------------------------------------------------
   */

  presented_opening as (

    select
      opening.*,

      round(
        case

          when
            opening.opening_net >
              0
          then
            opening.opening_net

          else
            0

        end,
        2
      )
        as opening_debit,


      round(
        case

          when
            opening.opening_net <
              0
          then
            abs(
              opening.opening_net
            )

          else
            0

        end,
        2
      )
        as opening_credit

    from
      opening_balances opening

  ),


  /*
   * -------------------------------------------------------
   * Closing net balance
   * -------------------------------------------------------
   */

  closing_balances as (

    select
      opening.*,

      round(
        opening.opening_net
        +
        opening.period_debit
        -
        opening.period_credit,
        2
      )
        as closing_net

    from
      presented_opening opening

  ),


  /*
   * -------------------------------------------------------
   * Closing debit / credit presentation
   * -------------------------------------------------------
   */

  trial_balance_rows as (

    select
      closing.gl_account_id,

      closing.account_code,

      closing.account_name,

      closing.account_class,

      closing.statement_type,

      closing.normal_balance,

      closing.is_control_account,

      closing.display_order,

      closing.opening_debit,

      closing.opening_credit,

      closing.period_debit,

      closing.period_credit,


      round(
        case

          when
            closing.closing_net >
              0
          then
            closing.closing_net

          else
            0

        end,
        2
      )
        as closing_debit,


      round(
        case

          when
            closing.closing_net <
              0
          then
            abs(
              closing.closing_net
            )

          else
            0

        end,
        2
      )
        as closing_credit

    from
      closing_balances closing

  ),


  /*
   * -------------------------------------------------------
   * Control totals
   * -------------------------------------------------------
   */

  totals as (

    select

      round(
        coalesce(
          sum(
            opening_debit
          ),
          0
        ),
        2
      )
        as opening_debit,


      round(
        coalesce(
          sum(
            opening_credit
          ),
          0
        ),
        2
      )
        as opening_credit,


      round(
        coalesce(
          sum(
            period_debit
          ),
          0
        ),
        2
      )
        as period_debit,


      round(
        coalesce(
          sum(
            period_credit
          ),
          0
        ),
        2
      )
        as period_credit,


      round(
        coalesce(
          sum(
            closing_debit
          ),
          0
        ),
        2
      )
        as closing_debit,


      round(
        coalesce(
          sum(
            closing_credit
          ),
          0
        ),
        2
      )
        as closing_credit

    from
      trial_balance_rows

  ),


  /*
   * -------------------------------------------------------
   * Control differences
   * -------------------------------------------------------
   */

  control as (

    select
      totals.*,


      round(
        opening_debit
        -
        opening_credit,
        2
      )
        as opening_difference,


      round(
        period_debit
        -
        period_credit,
        2
      )
        as period_difference,


      round(
        closing_debit
        -
        closing_credit,
        2
      )
        as closing_difference

    from
      totals

  )


  /*
   * =======================================================
   * JSON Result
   * =======================================================
   */

  select
    jsonb_build_object(

      'statementType',
        'trial_balance',

      'currencyCode',
        'AED',

      'dateFrom',
        p_date_from,

      'dateTo',
        p_date_to,


      /*
       * Account rows
       */

      'accounts',
        coalesce(
          (
            select
              jsonb_agg(
                jsonb_build_object(

                  'glAccountId',
                    row.gl_account_id,

                  'accountCode',
                    row.account_code,

                  'accountName',
                    row.account_name,

                  'accountClass',
                    row.account_class,

                  'statementType',
                    row.statement_type,

                  'normalBalance',
                    row.normal_balance,

                  'isControlAccount',
                    row.is_control_account,

                  'openingDebit',
                    row.opening_debit,

                  'openingCredit',
                    row.opening_credit,

                  'periodDebit',
                    row.period_debit,

                  'periodCredit',
                    row.period_credit,

                  'closingDebit',
                    row.closing_debit,

                  'closingCredit',
                    row.closing_credit
                )

                order by
                  row.display_order,
                  row.account_code
              )

            from
              trial_balance_rows row

            where
              row.opening_debit <>
                0

              or
              row.opening_credit <>
                0

              or
              row.period_debit <>
                0

              or
              row.period_credit <>
                0

              or
              row.closing_debit <>
                0

              or
              row.closing_credit <>
                0
          ),
          '[]'::jsonb
        ),


      /*
       * Opening controls
       */

      'openingDebit',
        control.opening_debit,

      'openingCredit',
        control.opening_credit,

      'openingDifference',
        control.opening_difference,

      'openingBalanced',
        abs(
          control.opening_difference
        ) <=
        0.01,


      /*
       * Period controls
       */

      'periodDebit',
        control.period_debit,

      'periodCredit',
        control.period_credit,

      'periodDifference',
        control.period_difference,

      'periodBalanced',
        abs(
          control.period_difference
        ) <=
        0.01,


      /*
       * Closing controls
       */

      'closingDebit',
        control.closing_debit,

      'closingCredit',
        control.closing_credit,

      'closingDifference',
        control.closing_difference,

      'closingBalanced',
        abs(
          control.closing_difference
        ) <=
        0.01,


      /*
       * Overall control
       */

      'isBalanced',
        (
          abs(
            control.opening_difference
          ) <=
            0.01

          and
          abs(
            control.period_difference
          ) <=
            0.01

          and
          abs(
            control.closing_difference
          ) <=
            0.01
        )

    )

  into
    v_result

  from
    control;


  return
    coalesce(
      v_result,
      jsonb_build_object(

        'statementType',
          'trial_balance',

        'currencyCode',
          'AED',

        'dateFrom',
          p_date_from,

        'dateTo',
          p_date_to,

        'accounts',
          '[]'::jsonb,

        'openingDebit',
          0,

        'openingCredit',
          0,

        'openingDifference',
          0,

        'openingBalanced',
          true,

        'periodDebit',
          0,

        'periodCredit',
          0,

        'periodDifference',
          0,

        'periodBalanced',
          true,

        'closingDebit',
          0,

        'closingCredit',
          0,

        'closingDifference',
          0,

        'closingBalanced',
          true,

        'isBalanced',
          true
      )
    );

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.get_formal_trial_balance(
    date,
    date
  )
from public;


grant execute
on function
  public.get_formal_trial_balance(
    date,
    date
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.get_formal_trial_balance(
    date,
    date
  )
is
  'Returns a formal AED Trial Balance for a reporting period, including opening debit/credit balances, period debit/credit movement, closing debit/credit balances and accounting control differences directly from posted/reversed General Ledger activity.';