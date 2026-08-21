/*
 * =========================================================
 * 108 — Formal General Ledger Balance Sheet
 *
 * PURPOSE
 * -------
 *
 * Provides a formal as-of-date Balance Sheet directly from
 * the General Ledger.
 *
 *
 * ACCOUNTING EQUATION
 * -------------------
 *
 *   Assets
 *     =
 *   Liabilities
 *     +
 *   Posted Equity
 *     +
 *   Calculated Current Year Earnings
 *
 *
 * CURRENT YEAR EARNINGS
 * ---------------------
 *
 * Account 3300 exists as a formal Current Year Earnings
 * account, but normal day-to-day P&L activity remains in:
 *
 *   revenue
 *   cogs
 *   expense
 *   other_income
 *   other_expense
 *
 * until a formal closing process transfers those balances.
 *
 * Therefore this report calculates current-year earnings
 * dynamically from January 1 through the requested as-of
 * date.
 *
 *
 * IMPORTANT
 * ---------
 *
 * If a formal year-end closing process later transfers P&L
 * into Retained Earnings, prior-year P&L is intentionally
 * excluded from Current Year Earnings.
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
 * Includes journal entries whose status is:
 *
 *   posted
 *   reversed
 *
 * A reversed original journal remains accounting history and
 * its reversing journal exists as a separate posted entry.
 * =========================================================
 */


create or replace function
  public.get_formal_balance_sheet(
    p_as_of_date date
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_fiscal_year_start date;

  v_assets numeric(18, 2) := 0;

  v_liabilities numeric(18, 2) := 0;

  v_posted_equity numeric(18, 2) := 0;

  v_current_year_earnings
    numeric(18, 2) := 0;

  v_total_equity numeric(18, 2) := 0;

  v_liabilities_and_equity
    numeric(18, 2) := 0;

  v_balance_difference
    numeric(18, 2) := 0;

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
      'You are not authorized to view the formal Balance Sheet.';
  end if;


  /* =======================================================
   * Validate As-Of Date
   * ======================================================= */

  if
    p_as_of_date is null
  then
    raise exception
      'As-of date is required.';
  end if;


  v_fiscal_year_start :=
    make_date(
      extract(
        year
        from p_as_of_date
      )::integer,
      1,
      1
    );


  /* =======================================================
   * Balance Sheet Account Activity
   * ======================================================= */

  with

  account_activity as (

    select
      account.id
        as gl_account_id,

      account.account_code,

      account.account_name,

      account.parent_id,

      account.account_class,

      account.normal_balance,

      account.is_control_account,

      account.display_order,

      parent.account_code
        as parent_code,

      parent.account_name
        as parent_name,

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
      public.gl_accounts account

    left join
      public.gl_accounts parent

      on
        parent.id =
          account.parent_id

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
      account.statement_type =
        'balance_sheet'

      and
      account.is_posting_account =
        true

      and
      journal.posting_date <=
        p_as_of_date

      and
      journal.status in (
        'posted',
        'reversed'
      )

    group by
      account.id,
      account.account_code,
      account.account_name,
      account.parent_id,
      account.account_class,
      account.normal_balance,
      account.is_control_account,
      account.display_order,
      parent.account_code,
      parent.account_name

  ),


  account_balances as (

    select
      activity.*,

      round(
        case

          when
            activity.normal_balance =
              'debit'
          then
            activity.total_debit
            -
            activity.total_credit

          else
            activity.total_credit
            -
            activity.total_debit

        end,
        2
      )
        as amount

    from
      account_activity activity

  )


  select

    round(
      coalesce(
        sum(amount)
          filter (
            where
              account_class =
                'asset'
          ),
        0
      ),
      2
    ),

    round(
      coalesce(
        sum(amount)
          filter (
            where
              account_class =
                'liability'
          ),
        0
      ),
      2
    ),

    round(
      coalesce(
        sum(amount)
            filter (
                where
                account_class = 'equity'
                and account_code <> '3300'
            ),
        0
      ),
      2
    )

  into
    v_assets,
    v_liabilities,
    v_posted_equity

  from
    account_balances;


  /* =======================================================
   * Current Year Earnings
   *
   * Revenue / Other Income:
   *
   *   positive credit effect
   *
   * COGS / Expenses / Other Expenses:
   *
   *   negative debit effect
   * ======================================================= */

  select
    round(
      coalesce(
        sum(
          case

            when
              account.account_class in (
                'revenue',
                'other_income'
              )
            then

              case

                when
                  account.normal_balance =
                    'credit'
                then
                  line.base_credit
                  -
                  line.base_debit

                else
                  -(
                    line.base_debit
                    -
                    line.base_credit
                  )

              end


            when
              account.account_class in (
                'cogs',
                'expense',
                'other_expense'
              )
            then
              -(
                line.base_debit
                -
                line.base_credit
              )


            else
              0

          end
        ),
        0
      ),
      2
    )

  into
    v_current_year_earnings

  from
    public.gl_journal_lines line

  inner join
    public.gl_journal_entries journal

    on
      journal.id =
        line.journal_entry_id

  inner join
    public.gl_accounts account

    on
      account.id =
        line.gl_account_id

  where
    journal.posting_date
      between
        v_fiscal_year_start
        and
        p_as_of_date

    and
    journal.status in (
      'posted',
      'reversed'
    )

    and
    account.statement_type =
      'profit_loss';


  /* =======================================================
   * Accounting Equation
   * ======================================================= */

  v_total_equity :=
    round(
      v_posted_equity
      +
      v_current_year_earnings,
      2
    );


  v_liabilities_and_equity :=
    round(
      v_liabilities
      +
      v_total_equity,
      2
    );


  v_balance_difference :=
    round(
      v_assets
      -
      v_liabilities_and_equity,
      2
    );


  /* =======================================================
   * Build Formal Statement
   * ======================================================= */

  with

  account_activity as (

    select
      account.id
        as gl_account_id,

      account.account_code,

      account.account_name,

      account.account_class,

      account.normal_balance,

      account.is_control_account,

      account.display_order,

      parent.account_code
        as parent_code,

      parent.account_name
        as parent_name,

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
      public.gl_accounts account

    left join
      public.gl_accounts parent

      on
        parent.id =
          account.parent_id

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
      account.statement_type =
        'balance_sheet'

      and
      account.is_posting_account =
        true

      and
      journal.posting_date <=
        p_as_of_date

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
      account.is_control_account,
      account.display_order,
      parent.account_code,
      parent.account_name

  ),


  account_balances as (

    select
      activity.*,

      round(
        case

          when
            activity.normal_balance =
              'debit'
          then
            activity.total_debit
            -
            activity.total_credit

          else
            activity.total_credit
            -
            activity.total_debit

        end,
        2
      )
        as amount

    from
      account_activity activity

  )


  select
    jsonb_build_object(

      'statementType',
        'balance_sheet',

      'currencyCode',
        'AED',

      'asOfDate',
        p_as_of_date,

      'fiscalYearStart',
        v_fiscal_year_start,


      /* ---------------------------------------------------
       * Assets
       * --------------------------------------------------- */

      'assets',
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

                      'parentCode',
                        account.parent_code,

                      'parentName',
                        account.parent_name,

                      'isControlAccount',
                        account.is_control_account,

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
                  account_balances account

                where
                  account.account_class =
                    'asset'

                  and
                  account.amount <>
                    0
              ),
              '[]'::jsonb
            ),

          'total',
            v_assets
        ),


      /* ---------------------------------------------------
       * Liabilities
       * --------------------------------------------------- */

      'liabilities',
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

                      'parentCode',
                        account.parent_code,

                      'parentName',
                        account.parent_name,

                      'isControlAccount',
                        account.is_control_account,

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
                  account_balances account

                where
                  account.account_class =
                    'liability'

                  and
                  account.amount <>
                    0
              ),
              '[]'::jsonb
            ),

          'total',
            v_liabilities
        ),


      /* ---------------------------------------------------
       * Posted Equity
       *
       * Exclude 3300 from the displayed posted-equity lines
       * because current-year earnings are calculated
       * dynamically below.
       *
       * At present 3300 is zero, but this prevents accidental
       * double-counting if it is populated before formal
       * year-end closing logic is introduced.
       * --------------------------------------------------- */

      'equity',
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

                      'parentCode',
                        account.parent_code,

                      'parentName',
                        account.parent_name,

                      'isControlAccount',
                        account.is_control_account,

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
                  account_balances account

                where
                  account.account_class =
                    'equity'

                  and
                  account.account_code <>
                    '3300'

                  and
                  account.amount <>
                    0
              ),
              '[]'::jsonb
            ),

          'postedEquity',
            v_posted_equity,

          'currentYearEarnings',
            v_current_year_earnings,

          'total',
            v_total_equity
        ),


      /* ---------------------------------------------------
       * Accounting Equation
       * --------------------------------------------------- */

      'totalAssets',
        v_assets,

      'totalLiabilities',
        v_liabilities,

      'postedEquity',
        v_posted_equity,

      'currentYearEarnings',
        v_current_year_earnings,

      'totalEquity',
        v_total_equity,

      'totalLiabilitiesAndEquity',
        v_liabilities_and_equity,

      'balanceDifference',
        v_balance_difference,

      'isBalanced',
        abs(
          v_balance_difference
        ) <=
        0.01

    )

  into
    v_result

  from
    account_balances

  limit 1;


  return
    coalesce(
      v_result,
      jsonb_build_object(

        'statementType',
          'balance_sheet',

        'currencyCode',
          'AED',

        'asOfDate',
          p_as_of_date,

        'fiscalYearStart',
          v_fiscal_year_start,

        'totalAssets',
          v_assets,

        'totalLiabilities',
          v_liabilities,

        'postedEquity',
          v_posted_equity,

        'currentYearEarnings',
          v_current_year_earnings,

        'totalEquity',
          v_total_equity,

        'totalLiabilitiesAndEquity',
          v_liabilities_and_equity,

        'balanceDifference',
          v_balance_difference,

        'isBalanced',
          abs(
            v_balance_difference
          ) <=
          0.01
      )
    );

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.get_formal_balance_sheet(
    date
  )
from public;


grant execute
on function
  public.get_formal_balance_sheet(
    date
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.get_formal_balance_sheet(
    date
  )
is
  'Returns a formal AED Balance Sheet as of a requested date directly from General Ledger activity. Current-year earnings are dynamically calculated from fiscal-year P&L activity so Assets reconcile to Liabilities plus Equity before formal year-end closing.';