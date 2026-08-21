/*
 * =========================================================
 * 107 — Formal General Ledger Profit & Loss Statement
 *
 * PURPOSE
 * -------
 *
 * Provides a formal, date-range Profit & Loss statement
 * directly from the General Ledger.
 *
 *
 * THIS IS DIFFERENT FROM MIGRATION 106
 * ------------------------------------
 *
 * Migration 106:
 *
 *   get_profit_and_loss_summary(...)
 *
 * remains the compact management P&L consumed by the
 * Profitability & Management Intelligence dashboard.
 *
 *
 * Migration 107:
 *
 *   get_formal_profit_and_loss_statement(...)
 *
 * provides:
 *
 * - account-level statement detail
 * - formal financial statement sections
 * - gross profit
 * - contribution profit
 * - operating profit
 * - other income
 * - financial expenses
 * - other expenses
 * - net profit / loss
 * - gross and net margins
 *
 *
 * ACCOUNTING SOURCE OF TRUTH
 * --------------------------
 *
 *   gl_journal_entries
 *   gl_journal_lines
 *   gl_accounts
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
 * A formally reversed original journal must remain part of
 * accounting history because the reversing journal exists as
 * a separate posted accounting entry.
 *
 *
 * STATEMENT CLASSIFICATION
 * ------------------------
 *
 * Revenue
 *   account_class = revenue
 *
 * Cost of Sales
 *   account_class = cogs
 *
 * Direct Expenses
 *   descendants / children of 6100
 *   generic fallback 6190
 *
 * Operating Expenses
 *   descendants / children of 6200
 *   generic fallback 6290
 *   other unclassified account_class=expense accounts
 *
 * Other Income
 *   account_class = other_income
 *
 * Financial Expenses
 *   descendants / children of 7100
 *   generic fallback 7190
 *   FX Loss 7420
 *
 * Other Expenses
 *   remaining account_class = other_expense
 *   including descendants / children of 7200
 *   generic fallback 7290
 *
 *
 * IMPORTANT
 * ---------
 *
 * Historical account activity must remain reportable even if
 * a GL account is later made inactive.
 *
 * Therefore statement reporting does NOT filter is_active.
 * =========================================================
 */


create or replace function
  public.get_formal_profit_and_loss_statement(
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
      'You are not authorized to view the formal Profit & Loss statement.';
  end if;


  /* =======================================================
   * Reporting Period Validation
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
   * Build Statement
   * ======================================================= */

  with recursive

  /*
   * -------------------------------------------------------
   * Account hierarchy
   *
   * Determines the highest useful ancestor code for each
   * Profit & Loss account.
   * -------------------------------------------------------
   */

  account_tree as (

    select
      account.id,
      account.account_code,
      account.account_name,
      account.parent_id,
      account.account_class,
      account.statement_type,
      account.normal_balance,
      account.is_posting_account,
      account.display_order,

      account.account_code
        as path_root_code,

      account.account_name
        as path_root_name,

      0
        as depth

    from
      public.gl_accounts account

    where
      account.parent_id is null


    union all


    select
      child.id,
      child.account_code,
      child.account_name,
      child.parent_id,
      child.account_class,
      child.statement_type,
      child.normal_balance,
      child.is_posting_account,
      child.display_order,

      tree.path_root_code,
      tree.path_root_name,

      tree.depth + 1

    from
      public.gl_accounts child

    inner join
      account_tree tree

      on
        tree.id =
          child.parent_id

  ),


  /*
   * -------------------------------------------------------
   * Immediate parent information
   * -------------------------------------------------------
   */

  account_metadata as (

    select
      account.id,

      account.account_code,

      account.account_name,

      account.parent_id,

      account.account_class,

      account.statement_type,

      account.normal_balance,

      account.is_posting_account,

      account.display_order,

      parent.account_code
        as parent_code,

      parent.account_name
        as parent_name,

      tree.path_root_code,

      tree.path_root_name

    from
      public.gl_accounts account

    left join
      public.gl_accounts parent

      on
        parent.id =
          account.parent_id

    left join
      account_tree tree

      on
        tree.id =
          account.id

    where
      account.statement_type =
        'profit_loss'

  ),


  /*
   * -------------------------------------------------------
   * GL activity by posting account
   * -------------------------------------------------------
   */

  raw_account_activity as (

    select
      account.id
        as gl_account_id,

      account.account_code,

      account.account_name,

      account.account_class,

      account.normal_balance,

      account.parent_code,

      account.parent_name,

      account.path_root_code,

      account.path_root_name,

      account.display_order,

      round(
        coalesce(
          sum(
            line.base_debit
          ),
          0
        ),
        2
      )
        as total_debit,

      round(
        coalesce(
          sum(
            line.base_credit
          ),
          0
        ),
        2
      )
        as total_credit

    from
      account_metadata account

    inner join
      public.gl_journal_lines line

      on
        line.gl_account_id =
          account.id

    inner join
      public.gl_journal_entries journal

      on
        journal.id =
          line.journal_entry_id

    where
      account.is_posting_account =
        true

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

    group by
      account.id,
      account.account_code,
      account.account_name,
      account.account_class,
      account.normal_balance,
      account.parent_code,
      account.parent_name,
      account.path_root_code,
      account.path_root_name,
      account.display_order

  ),


  /*
   * -------------------------------------------------------
   * Natural account balance
   *
   * Revenue / income accounts:
   *
   *   credit - debit
   *
   * Debit-normal contra revenue:
   *
   *   -(debit - credit)
   *
   * Expense / COGS:
   *
   *   debit - credit
   * -------------------------------------------------------
   */

  account_balances as (

    select
      activity.*,

      round(
        case

          when
            activity.account_class in (
              'revenue',
              'other_income'
            )
          then

            case

              when
                activity.normal_balance =
                  'credit'
              then
                activity.total_credit
                -
                activity.total_debit

              else
                -(
                  activity.total_debit
                  -
                  activity.total_credit
                )

            end


          else

            activity.total_debit
            -
            activity.total_credit

        end,
        2
      )
        as amount

    from
      raw_account_activity activity

  ),


  /*
   * -------------------------------------------------------
   * Formal Statement Classification
   * -------------------------------------------------------
   */

  classified_accounts as (

    select
      balance.*,

      case

        /*
         * Revenue
         */

        when
          balance.account_class =
            'revenue'
        then
          'revenue'


        /*
         * Cost of Sales
         */

        when
          balance.account_class =
            'cogs'
        then
          'cost_of_sales'


        /*
         * Direct Expenses
         */

        when
          balance.account_class =
            'expense'

          and (
            balance.parent_code =
              '6100'

            or
            balance.account_code =
              '6190'
          )
        then
          'direct_expenses'


        /*
         * Explicit Operating Expenses
         */

        when
          balance.account_class =
            'expense'

          and (
            balance.parent_code =
              '6200'

            or
            balance.account_code =
              '6290'
          )
        then
          'operating_expenses'


        /*
         * Any remaining ordinary expense account belongs to
         * Operating Expenses rather than disappearing from
         * the financial statement.
         */

        when
          balance.account_class =
            'expense'
        then
          'operating_expenses'


        /*
         * Other Income
         */

        when
          balance.account_class =
            'other_income'
        then
          'other_income'


        /*
         * Financial Expenses
         */

        when
          balance.account_class =
            'other_expense'

          and (
            balance.parent_code =
              '7100'

            or
            balance.account_code in (
              '7190',
              '7420'
            )
          )
        then
          'financial_expenses'


        /*
         * Remaining Other Expenses
         */

        when
          balance.account_class =
            'other_expense'
        then
          'other_expenses'


        else
          'unclassified'

      end
        as statement_section

    from
      account_balances balance

  ),


  /*
   * -------------------------------------------------------
   * Section Totals
   * -------------------------------------------------------
   */

  totals as (

    select

      round(
        coalesce(
          sum(amount)
            filter (
              where
                statement_section =
                  'revenue'
            ),
          0
        ),
        2
      )
        as revenue,


      round(
        coalesce(
          sum(amount)
            filter (
              where
                statement_section =
                  'cost_of_sales'
            ),
          0
        ),
        2
      )
        as cost_of_sales,


      round(
        coalesce(
          sum(amount)
            filter (
              where
                statement_section =
                  'direct_expenses'
            ),
          0
        ),
        2
      )
        as direct_expenses,


      round(
        coalesce(
          sum(amount)
            filter (
              where
                statement_section =
                  'operating_expenses'
            ),
          0
        ),
        2
      )
        as operating_expenses,


      round(
        coalesce(
          sum(amount)
            filter (
              where
                statement_section =
                  'other_income'
            ),
          0
        ),
        2
      )
        as other_income,


      round(
        coalesce(
          sum(amount)
            filter (
              where
                statement_section =
                  'financial_expenses'
            ),
          0
        ),
        2
      )
        as financial_expenses,


      round(
        coalesce(
          sum(amount)
            filter (
              where
                statement_section =
                  'other_expenses'
            ),
          0
        ),
        2
      )
        as other_expenses

    from
      classified_accounts

  ),


  /*
   * -------------------------------------------------------
   * Calculated Statement Totals
   * -------------------------------------------------------
   */

  calculated as (

    select
      totals.*,

      round(
        revenue
        -
        cost_of_sales,
        2
      )
        as gross_profit,


      round(
        revenue
        -
        cost_of_sales
        -
        direct_expenses,
        2
      )
        as contribution_profit,


      round(
        revenue
        -
        cost_of_sales
        -
        direct_expenses
        -
        operating_expenses,
        2
      )
        as operating_profit,


      round(
        direct_expenses
        +
        operating_expenses
        +
        financial_expenses
        +
        other_expenses,
        2
      )
        as total_expenses,


      round(
        revenue
        -
        cost_of_sales
        -
        direct_expenses
        -
        operating_expenses
        +
        other_income
        -
        financial_expenses
        -
        other_expenses,
        2
      )
        as net_profit

    from
      totals

  ),


  /*
   * -------------------------------------------------------
   * Margins
   * -------------------------------------------------------
   */

  final_totals as (

    select
      calculated.*,

      round(
        case

          when
            revenue = 0
          then
            0

          else
            (
              gross_profit
              /
              revenue
            )
            *
            100

        end,
        2
      )
        as gross_margin_percentage,


      round(
        case

          when
            revenue = 0
          then
            0

          else
            (
              net_profit
              /
              revenue
            )
            *
            100

        end,
        2
      )
        as net_margin_percentage

    from
      calculated

  )


  /*
   * =======================================================
   * JSON Statement
   * =======================================================
   */

  select
    jsonb_build_object(

      /*
       * Statement metadata
       */

      'statementType',
        'profit_and_loss',

      'currencyCode',
        'AED',

      'dateFrom',
        p_date_from,

      'dateTo',
        p_date_to,


      /*
       * Revenue
       */

      'revenue',
        jsonb_build_object(

          'accounts',
            coalesce(
              (
                select
                  jsonb_agg(
                    jsonb_build_object(
                      'glAccountId',
                        account.gl_account_id,

                      'accountCode',
                        account.account_code,

                      'accountName',
                        account.account_name,

                      'normalBalance',
                        account.normal_balance,

                      'debit',
                        account.total_debit,

                      'credit',
                        account.total_credit,

                      'amount',
                        account.amount
                    )

                    order by
                      account.display_order,
                      account.account_code
                  )

                from
                  classified_accounts account

                where
                  account.statement_section =
                    'revenue'

                  and
                  account.amount <>
                    0
              ),
              '[]'::jsonb
            ),

          'total',
            totals.revenue
        ),


      /*
       * Cost of Sales
       */

      'costOfSales',
        jsonb_build_object(

          'accounts',
            coalesce(
              (
                select
                  jsonb_agg(
                    jsonb_build_object(
                      'glAccountId',
                        account.gl_account_id,

                      'accountCode',
                        account.account_code,

                      'accountName',
                        account.account_name,

                      'debit',
                        account.total_debit,

                      'credit',
                        account.total_credit,

                      'amount',
                        account.amount
                    )

                    order by
                      account.display_order,
                      account.account_code
                  )

                from
                  classified_accounts account

                where
                  account.statement_section =
                    'cost_of_sales'

                  and
                  account.amount <>
                    0
              ),
              '[]'::jsonb
            ),

          'total',
            totals.cost_of_sales
        ),


      /*
       * Gross Profit
       */

      'grossProfit',
        final_totals.gross_profit,

      'grossMarginPercentage',
        final_totals.gross_margin_percentage,


      /*
       * Direct Expenses
       */

      'directExpenses',
        jsonb_build_object(

          'accounts',
            coalesce(
              (
                select
                  jsonb_agg(
                    jsonb_build_object(
                      'glAccountId',
                        account.gl_account_id,

                      'accountCode',
                        account.account_code,

                      'accountName',
                        account.account_name,

                      'amount',
                        account.amount
                    )

                    order by
                      account.display_order,
                      account.account_code
                  )

                from
                  classified_accounts account

                where
                  account.statement_section =
                    'direct_expenses'

                  and
                  account.amount <>
                    0
              ),
              '[]'::jsonb
            ),

          'total',
            totals.direct_expenses
        ),


      'contributionProfit',
        final_totals.contribution_profit,


      /*
       * Operating Expenses
       */

      'operatingExpenses',
        jsonb_build_object(

          'accounts',
            coalesce(
              (
                select
                  jsonb_agg(
                    jsonb_build_object(
                      'glAccountId',
                        account.gl_account_id,

                      'accountCode',
                        account.account_code,

                      'accountName',
                        account.account_name,

                      'amount',
                        account.amount
                    )

                    order by
                      account.display_order,
                      account.account_code
                  )

                from
                  classified_accounts account

                where
                  account.statement_section =
                    'operating_expenses'

                  and
                  account.amount <>
                    0
              ),
              '[]'::jsonb
            ),

          'total',
            totals.operating_expenses
        ),


      'operatingProfit',
        final_totals.operating_profit,


      /*
       * Other Income
       */

      'otherIncome',
        jsonb_build_object(

          'accounts',
            coalesce(
              (
                select
                  jsonb_agg(
                    jsonb_build_object(
                      'glAccountId',
                        account.gl_account_id,

                      'accountCode',
                        account.account_code,

                      'accountName',
                        account.account_name,

                      'amount',
                        account.amount
                    )

                    order by
                      account.display_order,
                      account.account_code
                  )

                from
                  classified_accounts account

                where
                  account.statement_section =
                    'other_income'

                  and
                  account.amount <>
                    0
              ),
              '[]'::jsonb
            ),

          'total',
            totals.other_income
        ),


      /*
       * Financial Expenses
       */

      'financialExpenses',
        jsonb_build_object(

          'accounts',
            coalesce(
              (
                select
                  jsonb_agg(
                    jsonb_build_object(
                      'glAccountId',
                        account.gl_account_id,

                      'accountCode',
                        account.account_code,

                      'accountName',
                        account.account_name,

                      'amount',
                        account.amount
                    )

                    order by
                      account.display_order,
                      account.account_code
                  )

                from
                  classified_accounts account

                where
                  account.statement_section =
                    'financial_expenses'

                  and
                  account.amount <>
                    0
              ),
              '[]'::jsonb
            ),

          'total',
            totals.financial_expenses
        ),


      /*
       * Other Expenses
       */

      'otherExpenses',
        jsonb_build_object(

          'accounts',
            coalesce(
              (
                select
                  jsonb_agg(
                    jsonb_build_object(
                      'glAccountId',
                        account.gl_account_id,

                      'accountCode',
                        account.account_code,

                      'accountName',
                        account.account_name,

                      'amount',
                        account.amount
                    )

                    order by
                      account.display_order,
                      account.account_code
                  )

                from
                  classified_accounts account

                where
                  account.statement_section =
                    'other_expenses'

                  and
                  account.amount <>
                    0
              ),
              '[]'::jsonb
            ),

          'total',
            totals.other_expenses
        ),


      /*
       * Totals
       */

      'totalExpenses',
        final_totals.total_expenses,

      'netProfit',
        final_totals.net_profit,

      'netMarginPercentage',
        final_totals.net_margin_percentage

    )

  into
    v_result

  from
    final_totals

  inner join
    totals

    on
      true;


  return
    coalesce(
      v_result,
      jsonb_build_object(
        'statementType',
          'profit_and_loss',

        'currencyCode',
          'AED',

        'dateFrom',
          p_date_from,

        'dateTo',
          p_date_to
      )
    );

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.get_formal_profit_and_loss_statement(
    date,
    date
  )
from public;


grant execute
on function
  public.get_formal_profit_and_loss_statement(
    date,
    date
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.get_formal_profit_and_loss_statement(
    date,
    date
  )
is
  'Returns a formal AED Profit & Loss statement directly from General Ledger posting-date activity, including account-level Revenue, Cost of Sales, Direct Expenses, Operating Expenses, Other Income, Financial Expenses, Other Expenses, Gross Profit, Operating Profit and Net Profit.';