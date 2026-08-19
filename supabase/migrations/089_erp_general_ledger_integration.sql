/*
 * =========================================================
 * 089 — ERP → General Ledger Integration
 *
 * PHASE A
 * -------
 *
 * Shared ERP accounting adapters.
 *
 * This migration integrates operational ERP events with the
 * validated GL posting engine created in migration 088.
 *
 *
 * IMPORTANT
 * ---------
 *
 * Operational ledgers remain authoritative.
 *
 * GL journals are created through:
 *
 *   public.post_erp_gl_journal(...)
 *
 * No direct INSERT into GL journal tables is permitted.
 *
 *
 * INITIAL INTEGRATION IN THIS MIGRATION
 * -------------------------------------
 *
 * 1. Shared ERP accounting helpers
 * 2. Sales Order revenue / VAT posting adapter
 *
 * Further adapters will be added after validation:
 *
 * - Customer Receipts
 * - Quick Purchases / AP
 * - Supplier Payments
 * - Expenses
 * - Treasury Transfers
 * - Opening Balances
 * - Inventory / COGS
 * - Cancellation / reversal bridge
 * =========================================================
 */


/* =========================================================
 * 1. Resolve Operational Financial Account → GL Account
 * ========================================================= */

create or replace function
  public.get_financial_account_gl_account(
    p_financial_account_id uuid
  )
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_gl_account_id uuid;

begin

  if
    p_financial_account_id is null
  then
    raise exception
      'Financial account is required.';
  end if;


  select
    gl_account_id

  into
    v_gl_account_id

  from
    public.financial_accounts

  where
    id =
      p_financial_account_id

    and
      is_active =
        true;


  if
    v_gl_account_id is null
  then
    raise exception
      'Financial account % does not have an active GL mapping.',
      p_financial_account_id;
  end if;


  perform
    public.validate_gl_posting_account(
      v_gl_account_id,
      false
    );


  return
    v_gl_account_id;

end;
$$;


/* =========================================================
 * 2. Resolve Expense Category → GL Account
 * ========================================================= */

create or replace function
  public.get_expense_category_gl_account(
    p_expense_category_id uuid
  )
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_gl_account_id uuid;

begin

  if
    p_expense_category_id is null
  then
    raise exception
      'Expense category is required.';
  end if;


  select
    gl_account_id

  into
    v_gl_account_id

  from
    public.expense_categories

  where
    id =
      p_expense_category_id

    and
      is_active =
        true;


  if
    v_gl_account_id is null
  then
    raise exception
      'Expense category % does not have an active GL mapping.',
      p_expense_category_id;
  end if;


  perform
    public.validate_gl_posting_account(
      v_gl_account_id,
      false
    );


  return
    v_gl_account_id;

end;
$$;


/* =========================================================
 * 3. Sales Order Revenue / VAT Posting Adapter
 *
 * Accounting event:
 *
 *   Dr Accounts Receivable
 *      Cr Sales Revenue
 *      Cr VAT Payable
 *
 *
 * IMPORTANT
 * ---------
 *
 * This adapter posts the customer receivable / revenue side.
 *
 * Inventory COGS is intentionally NOT posted here.
 * COGS will be recognized separately from actual inventory
 * sales_issue transactions.
 *
 *
 * Posting source:
 *
 *   source_type = sales_order_revenue
 *   source_id   = sales_orders.id
 *
 * Therefore repeated calls are idempotent through the
 * validated GL posting engine.
 * ========================================================= */

create or replace function
  public.post_sales_order_revenue_gl(
    p_sales_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order
    public.sales_orders%rowtype;

  v_receivable_account_id uuid;

  v_revenue_account_id uuid;

  v_vat_account_id uuid;

  v_net_revenue numeric(18, 2);

  v_tax_amount numeric(18, 2);

  v_total_receivable numeric(18, 2);

  v_base_net_revenue numeric(18, 2);

  v_base_tax_amount numeric(18, 2);

  v_base_total_receivable numeric(18, 2);

  v_lines jsonb;

  v_journal_id uuid;

begin

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
    p_sales_order_id is null
  then
    raise exception
      'Sales Order ID is required.';
  end if;


  select
    *

  into
    v_order

  from
    public.sales_orders

  where
    id =
      p_sales_order_id;


  if not found
  then
    raise exception
      'Sales Order % does not exist.',
      p_sales_order_id;
  end if;


  /*
   * Revenue should never be posted from a draft or cancelled
   * Sales Order.
   */

  if
    v_order.status in (
      'draft',
      'cancelled'
    )
  then
    raise exception
      'Sales Order % cannot be posted to GL while status is %.',
      v_order.order_number,
      v_order.status;
  end if;


  if
    v_order.exchange_rate is null
    or
    v_order.exchange_rate <=
      0
  then
    raise exception
      'Sales Order % has an invalid exchange rate.',
      v_order.order_number;
  end if;


  /*
   * Current sales-order accounting amount:
   *
   * grand_total =
   *
   * subtotal
   * - discounts
   * + VAT
   * + shipping
   *
   *
   * The current ERP has no dedicated shipping-revenue GL
   * account yet, so shipping is included in Sales Revenue.
   *
   * Therefore:
   *
   * net revenue =
   * grand_total - tax_amount
   */

  v_tax_amount :=
    round(
      coalesce(
        v_order.tax_amount,
        0
      ),
      2
    );


  v_total_receivable :=
    round(
      coalesce(
        v_order.grand_total,
        0
      ),
      2
    );


  v_net_revenue :=
    round(
      v_total_receivable
      -
      v_tax_amount,
      2
    );


  if
    v_total_receivable <
      0
    or
    v_net_revenue <
      0
    or
    v_tax_amount <
      0
  then
    raise exception
      'Sales Order % contains invalid accounting totals.',
      v_order.order_number;
  end if;


  if
    v_total_receivable =
      0
  then
    raise exception
      'Sales Order % has zero accounting value.',
      v_order.order_number;
  end if;


  /*
   * Base currency = AED.
   */

  v_base_net_revenue :=
    round(
      v_net_revenue
      *
      v_order.exchange_rate,
      2
    );


  v_base_tax_amount :=
    round(
      v_tax_amount
      *
      v_order.exchange_rate,
      2
    );


  v_base_total_receivable :=
    round(
      v_total_receivable
      *
      v_order.exchange_rate,
      2
    );


  /*
   * Resolve GL accounts from stable mappings.
   */

  v_receivable_account_id :=
    public.get_mapped_gl_account(
      'accounts_receivable'
    );


  v_revenue_account_id :=
    public.get_mapped_gl_account(
      'sales_revenue'
    );


  if
    v_tax_amount >
      0
  then

    v_vat_account_id :=
      public.get_mapped_gl_account(
        'vat_payable'
      );

  end if;


  /*
   * Build balanced GL lines.
   */

  v_lines :=
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_receivable_account_id,

        'debit',
          v_total_receivable,

        'credit',
          0,

        'baseDebit',
          v_base_total_receivable,

        'baseCredit',
          0,

        'description',
          'Accounts Receivable - '
          ||
          v_order.order_number,

        'customerId',
          v_order.customer_id
      ),

      jsonb_build_object(
        'glAccountId',
          v_revenue_account_id,

        'debit',
          0,

        'credit',
          v_net_revenue,

        'baseDebit',
          0,

        'baseCredit',
          v_base_net_revenue,

        'description',
          'Sales Revenue - '
          ||
          v_order.order_number,

        'customerId',
          v_order.customer_id
      )
    );


  /*
   * VAT line only when VAT exists.
   */

  if
    v_tax_amount >
      0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(
        jsonb_build_object(
          'glAccountId',
            v_vat_account_id,

          'debit',
            0,

          'credit',
            v_tax_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_base_tax_amount,

          'description',
            'Output VAT - '
            ||
            v_order.order_number,

          'customerId',
            v_order.customer_id
        )
      );

  end if;


  /*
   * Delegate all GL controls to migration 088:
   *
   * - period validation
   * - duplicate-source idempotency
   * - balance validation
   * - immutable posting
   */

  v_journal_id :=
    public.post_erp_gl_journal(
      'sales_order_revenue',
      v_order.id,
      v_order.order_number,
      v_order.order_date,
      v_order.order_date,
      'Sales Order revenue recognition - '
        ||
      v_order.order_number,
      v_order.currency_code,
      v_order.exchange_rate,
      v_lines
    );


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 4. Permissions
 * ========================================================= */

revoke all
on function
  public.get_financial_account_gl_account(
    uuid
  )
from public;


revoke all
on function
  public.get_expense_category_gl_account(
    uuid
  )
from public;


revoke all
on function
  public.post_sales_order_revenue_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_sales_order_revenue_gl(
    uuid
  )
to authenticated;


/*
 * Helper functions remain internal.
 *
 * No direct authenticated EXECUTE grant for:
 *
 *   get_financial_account_gl_account
 *   get_expense_category_gl_account
 */


/* =========================================================
 * 5. Documentation
 * ========================================================= */

comment on function
  public.get_financial_account_gl_account(
    uuid
  )
is
  'Internal ERP accounting helper that resolves an operational financial account to its active formal GL account.';


comment on function
  public.get_expense_category_gl_account(
    uuid
  )
is
  'Internal ERP accounting helper that resolves an operational expense category to its active formal GL account.';


comment on function
  public.post_sales_order_revenue_gl(
    uuid
  )
is
  'Posts Sales Order Accounts Receivable, Sales Revenue and Output VAT through the validated ERP GL posting engine. COGS remains a separate inventory accounting event.';