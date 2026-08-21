/*
 * =========================================================
 * 106 — GL-Driven Profitability Reporting
 *
 * PURPOSE
 * -------
 *
 * Makes the formal General Ledger the accounting source of
 * truth for the P&L summary used by the existing
 * Profitability & Management Intelligence module.
 *
 *
 * IMPORTANT
 * ---------
 *
 * The existing RPC contract is intentionally preserved:
 *
 *   get_profit_and_loss_summary(
 *     p_date_from date,
 *     p_date_to date
 *   )
 *
 * Therefore:
 *
 * - profitability.repository.ts continues working
 * - profitability management intelligence continues working
 * - current / previous period comparison continues working
 * - existing admin profitability UI does not need to be
 *   rewritten in this migration
 *
 *
 * ACCOUNTING SOURCE OF TRUTH
 * --------------------------
 *
 * Financial statement amounts:
 *
 *   gl_journal_entries
 *   gl_journal_lines
 *   gl_accounts
 *
 *
 * Operational statistics retained:
 *
 *   sales_order_count
 *   quantity_sold
 *
 * Those remain sourced from profitability_sales_lines because
 * they are management statistics, not ledger balances.
 *
 *
 * REVERSALS
 * ---------
 *
 * Both posted and reversed original journals are included.
 *
 * Formal journal reversals exist as separate posted journals.
 * Excluding reversed originals would incorrectly leave only
 * the reversing accounting effect.
 *
 *
 * P&L CLASSIFICATION
 * ------------------
 *
 * Revenue:
 *   account_class = revenue
 *
 * COGS:
 *   account_class = cogs
 *
 * Direct Expenses:
 *   expense accounts under 6100
 *   plus generic posting account 6190
 *
 * Operating Expenses:
 *   expense accounts under 6200
 *   plus generic posting account 6290
 *
 * Financial Expenses:
 *   other_expense accounts under 7100
 *   plus generic posting account 7190
 *   plus Foreign Exchange Loss 7420
 *
 * Other Expenses:
 *   other_expense accounts under 7200
 *   plus generic posting account 7290
 *
 * Other Income:
 *   account_class = other_income
 *
 * Other Income participates in Net Profit but is not yet
 * returned as a separate field because the existing RPC /
 * TypeScript contract does not expose one.
 * =========================================================
 */


create or replace function
  public.get_profit_and_loss_summary(
    p_date_from date,
    p_date_to date
  )
returns table
(
  revenue numeric,

  cogs numeric,

  gross_profit numeric,

  gross_margin_percentage numeric,

  direct_expenses numeric,

  contribution_profit numeric,

  operating_expenses numeric,

  operating_profit numeric,

  financial_expenses numeric,

  other_expenses numeric,

  total_expenses numeric,

  net_profit numeric,

  net_margin_percentage numeric,

  sales_order_count bigint,

  quantity_sold numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare

  v_revenue
    numeric(18, 2) := 0;

  v_cogs
    numeric(18, 2) := 0;


  v_direct
    numeric(18, 2) := 0;

  v_operating
    numeric(18, 2) := 0;

  v_financial
    numeric(18, 2) := 0;

  v_other
    numeric(18, 2) := 0;

  v_other_income
    numeric(18, 2) := 0;


  v_gross_profit
    numeric(18, 2) := 0;

  v_contribution
    numeric(18, 2) := 0;

  v_operating_profit
    numeric(18, 2) := 0;

  v_total_expenses
    numeric(18, 2) := 0;

  v_net_profit
    numeric(18, 2) := 0;


  v_gross_margin
    numeric(18, 4) := 0;

  v_net_margin
    numeric(18, 4) := 0;


  v_order_count
    bigint := 0;

  v_quantity
    numeric(18, 4) := 0;


begin

  /* =======================================================
   * Authentication
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
      'You are not authorized to view profitability.';
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
   * 1. Revenue
   *
   * Revenue accounts may be credit-normal or debit-normal.
   *
   * Example:
   *
   *   4100 Sales Revenue
   *     normal_balance = credit
   *
   *   4200 Sales Returns & Discounts
   *     normal_balance = debit
   *
   * We calculate natural P&L effect based on account normal
   * balance so contra revenue correctly reduces revenue.
   * ======================================================= */

  select
    round(
      coalesce(
        sum(
          case

            when account.normal_balance =
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
        ),
        0
      ),
      2
    )

  into
    v_revenue

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
        p_date_from
        and
        p_date_to

    and
    journal.status in (
      'posted',
      'reversed'
    )

    and
    account.statement_type =
      'profit_loss'

    and
    account.account_class =
      'revenue';


  /* =======================================================
   * 2. Cost of Goods Sold / Cost of Sales
   * ======================================================= */

  select
    round(
      coalesce(
        sum(
          line.base_debit
          -
          line.base_credit
        ),
        0
      ),
      2
    )

  into
    v_cogs

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
        p_date_from
        and
        p_date_to

    and
    journal.status in (
      'posted',
      'reversed'
    )

    and
    account.statement_type =
      'profit_loss'

    and
    account.account_class =
      'cogs';


  /* =======================================================
   * 3. Direct Expenses
   *
   * Primary classification:
   *
   *   parent account = 6100
   *
   * Fallback:
   *
   *   generic posting account = 6190
   * ======================================================= */

  select
    round(
      coalesce(
        sum(
          line.base_debit
          -
          line.base_credit
        ),
        0
      ),
      2
    )

  into
    v_direct

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

  left join
    public.gl_accounts parent

    on
      parent.id =
        account.parent_id

  where
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

    and
    account.statement_type =
      'profit_loss'

    and
    account.account_class =
      'expense'

    and (
      parent.account_code =
        '6100'

      or
      account.account_code =
        '6190'
    );


  /* =======================================================
   * 4. Operating Expenses
   *
   * Primary classification:
   *
   *   parent account = 6200
   *
   * Fallback:
   *
   *   generic posting account = 6290
   * ======================================================= */

  select
    round(
      coalesce(
        sum(
          line.base_debit
          -
          line.base_credit
        ),
        0
      ),
      2
    )

  into
    v_operating

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

  left join
    public.gl_accounts parent

    on
      parent.id =
        account.parent_id

  where
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

    and
    account.statement_type =
      'profit_loss'

    and
    account.account_class =
      'expense'

    and (
      parent.account_code =
        '6200'

      or
      account.account_code =
        '6290'
    );


  /* =======================================================
   * 5. Financial Expenses
   *
   * Includes:
   *
   * - children of 7100
   * - generic 7190
   * - FX Loss 7420
   * ======================================================= */

  select
    round(
      coalesce(
        sum(
          line.base_debit
          -
          line.base_credit
        ),
        0
      ),
      2
    )

  into
    v_financial

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

  left join
    public.gl_accounts parent

    on
      parent.id =
        account.parent_id

  where
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

    and
    account.statement_type =
      'profit_loss'

    and
    account.account_class =
      'other_expense'

    and (
      parent.account_code =
        '7100'

      or
      account.account_code in (
        '7190',
        '7420'
      )
    );


  /* =======================================================
   * 6. Other Expenses
   *
   * Includes:
   *
   * - children of 7200
   * - generic 7290
   *
   * Excludes amounts already classified as Financial Expense.
   * ======================================================= */

  select
    round(
      coalesce(
        sum(
          line.base_debit
          -
          line.base_credit
        ),
        0
      ),
      2
    )

  into
    v_other

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

  left join
    public.gl_accounts parent

    on
      parent.id =
        account.parent_id

  where
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

    and
    account.statement_type =
      'profit_loss'

    and
    account.account_class =
      'other_expense'

    and (
      parent.account_code =
        '7200'

      or
      account.account_code =
        '7290'
    );


  /* =======================================================
   * 7. Other Income
   *
   * This participates in Net Profit.
   *
   * Existing RPC contract does not yet expose a dedicated
   * other_income field.
   * ======================================================= */

  select
    round(
      coalesce(
        sum(
          line.base_credit
          -
          line.base_debit
        ),
        0
      ),
      2
    )

  into
    v_other_income

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
        p_date_from
        and
        p_date_to

    and
    journal.status in (
      'posted',
      'reversed'
    )

    and
    account.statement_type =
      'profit_loss'

    and
    account.account_class =
      'other_income';


  /* =======================================================
   * 8. Management Statistics
   *
   * These are not GL balances.
   *
   * Continue using recognized profitability sales lines for:
   *
   * - distinct Sales Orders
   * - recognized quantity sold
   * ======================================================= */

  select
    count(
      distinct line.sales_order_id
    ),

    coalesce(
      sum(
        line.recognized_quantity
      ),
      0
    )

  into
    v_order_count,
    v_quantity

  from
    public.profitability_sales_lines
      line

  where
    line.recognition_date
      between
        p_date_from
        and
        p_date_to;


  /* =======================================================
   * 9. Profit Calculations
   * ======================================================= */

  v_gross_profit :=
    round(
      v_revenue
      -
      v_cogs,
      2
    );


  v_contribution :=
    round(
      v_gross_profit
      -
      v_direct,
      2
    );


  v_operating_profit :=
    round(
      v_contribution
      -
      v_operating,
      2
    );


  v_total_expenses :=
    round(
      v_direct
      +
      v_operating
      +
      v_financial
      +
      v_other,
      2
    );


  v_net_profit :=
    round(
      v_operating_profit
      +
      v_other_income
      -
      v_financial
      -
      v_other,
      2
    );


  /* =======================================================
   * 10. Margins
   * ======================================================= */

  v_gross_margin :=
    round(
      case

        when
          v_revenue = 0
        then
          0

        else
          (
            v_gross_profit
            /
            v_revenue
          )
          *
          100

      end,
      2
    );


  v_net_margin :=
    round(
      case

        when
          v_revenue = 0
        then
          0

        else
          (
            v_net_profit
            /
            v_revenue
          )
          *
          100

      end,
      2
    );


  /* =======================================================
   * 11. Return Existing Contract
   * ======================================================= */

  return query

  select
    v_revenue,

    v_cogs,

    v_gross_profit,

    v_gross_margin,

    v_direct,

    v_contribution,

    v_operating,

    v_operating_profit,

    v_financial,

    v_other,

    v_total_expenses,

    v_net_profit,

    v_net_margin,

    v_order_count,

    v_quantity;

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.get_profit_and_loss_summary(
    date,
    date
  )
from public;


grant execute
on function
  public.get_profit_and_loss_summary(
    date,
    date
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.get_profit_and_loss_summary(
    date,
    date
  )
is
  'Returns a date-range Profit & Loss summary driven by posted/reversed General Ledger journals while preserving the existing profitability RPC contract. Revenue, COGS and expenses use GL posting-date accounting truth; sales-order count and quantity sold remain management statistics from recognized profitability sales lines.';