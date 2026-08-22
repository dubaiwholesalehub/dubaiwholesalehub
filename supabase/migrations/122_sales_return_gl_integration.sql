/*
 * =========================================================
 * 122 — Sales Return General Ledger Integration
 *
 * PURPOSE
 * -------
 *
 * Posts the accounting effects of a received Sales Return.
 *
 * Commercial / Credit Note:
 *
 *   Dr Sales Returns & Discounts
 *   Dr VAT Payable                (when applicable)
 *      Cr Accounts Receivable
 *
 * Inventory / COGS Reversal:
 *
 *   Dr Inventory
 *      Cr Cost of Goods Sold
 *
 * The existing post_erp_gl_journal() engine provides:
 *
 *   - accounting period validation
 *   - source idempotency
 *   - balancing validation
 *   - immutable posting
 *
 * Inventory restoration uses the historical cost captured on
 * the customer_return inventory transaction created by the
 * Sales Return receipt workflow.
 * =========================================================
 */


/* =========================================================
 * 1. Commercial Credit / Revenue Reversal
 * ========================================================= */

create or replace function
  public.post_sales_return_credit_gl(
    p_sales_return_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_return
    public.sales_returns%rowtype;

  v_returns_account_id uuid;
  v_receivable_account_id uuid;
  v_vat_account_id uuid;

  v_net_amount numeric(18, 2);
  v_tax_amount numeric(18, 2);
  v_total_credit numeric(18, 2);

  v_base_net_amount numeric(18, 2);
  v_base_tax_amount numeric(18, 2);
  v_base_total_credit numeric(18, 2);

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
    p_sales_return_id is null
  then
    raise exception
      'Sales Return is required.';
  end if;


  select
    *
  into
    v_return
  from
    public.sales_returns
  where
    id =
      p_sales_return_id;


  if not found then
    raise exception
      'Sales Return was not found.';
  end if;


  if
    v_return.status <>
      'received'
  then
    raise exception
      'Sales Return % must be received before GL posting. Current status is %.',
      v_return.return_number,
      v_return.status;
  end if;


  /*
   * Validate posting period before constructing accounting.
   */

  perform
    public.get_gl_accounting_period(
      v_return.posting_date,
      true
    );


  /*
   * Return accounting values.
   *
   * net_amount excludes VAT.
   * grand_total is the customer credit.
   */

  v_net_amount :=
    round(
      coalesce(
        v_return.net_amount,
        0
      ),
      2
    );


  v_tax_amount :=
    round(
      coalesce(
        v_return.tax_amount,
        0
      ),
      2
    );


  v_total_credit :=
    round(
      coalesce(
        v_return.grand_total,
        0
      ),
      2
    );


  if
    v_net_amount <
      0
    or
    v_tax_amount <
      0
    or
    v_total_credit <=
      0
  then
    raise exception
      'Sales Return % contains invalid accounting totals.',
      v_return.return_number;
  end if;


  /*
   * The commercial journal must balance:
   *
   * net return + VAT = customer credit.
   */

  if
    round(
      v_net_amount
      +
      v_tax_amount,
      2
    ) <>
    v_total_credit
  then
    raise exception
      'Sales Return % accounting totals do not balance.',
      v_return.return_number;
  end if;


  /*
   * Base currency values.
   */

  v_base_net_amount :=
    round(
      v_net_amount
      *
      v_return.exchange_rate,
      2
    );


  v_base_tax_amount :=
    round(
      v_tax_amount
      *
      v_return.exchange_rate,
      2
    );


  v_base_total_credit :=
    round(
      v_total_credit
      *
      v_return.exchange_rate,
      2
    );


  /*
   * Resolve stable GL mappings.
   */

  v_returns_account_id :=
    public.get_mapped_gl_account(
      'sales_returns_discounts'
    );


  v_receivable_account_id :=
    public.get_mapped_gl_account(
      'accounts_receivable'
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
   * Dr Sales Returns & Discounts
   */

  v_lines :=
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_returns_account_id,

        'debit',
          v_net_amount,

        'credit',
          0,

        'baseDebit',
          v_base_net_amount,

        'baseCredit',
          0,

        'description',
          'Sales Return - '
          ||
          v_return.return_number,

        'customerId',
          v_return.customer_id
      )
    );


  /*
   * Dr VAT Payable
   *
   * This reverses Output VAT previously recognized on sale.
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
            v_tax_amount,

          'credit',
            0,

          'baseDebit',
            v_base_tax_amount,

          'baseCredit',
            0,

          'description',
            'Output VAT reversal - '
            ||
            v_return.return_number,

          'customerId',
            v_return.customer_id
        )
      );

  end if;


  /*
   * Cr Accounts Receivable
   */

  v_lines :=
    v_lines
    ||
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_receivable_account_id,

        'debit',
          0,

        'credit',
          v_total_credit,

        'baseDebit',
          0,

        'baseCredit',
          v_base_total_credit,

        'description',
          'Customer credit - '
          ||
          v_return.return_number,

        'customerId',
          v_return.customer_id
      )
    );


  /*
   * Controlled GL posting.
   *
   * post_erp_gl_journal is idempotent for:
   *
   *   source_type + source_id
   */

  v_journal_id :=
    public.post_erp_gl_journal(
      'sales_return_credit',

      v_return.id,

      v_return.return_number,

      v_return.return_date,

      v_return.posting_date,

      'Sales Return credit recognition - '
      ||
      v_return.return_number,

      v_return.currency_code,

      v_return.exchange_rate,

      v_lines
    );


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 2. Inventory / COGS Reversal
 * ========================================================= */

create or replace function
  public.post_sales_return_inventory_gl(
    p_sales_return_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_return
    public.sales_returns%rowtype;

  v_transaction
    public.inventory_transactions%rowtype;

  v_item
    public.inventory_transaction_items%rowtype;

  v_inventory_account_id uuid;
  v_cogs_account_id uuid;

  v_item_cost numeric(18, 2);

  v_total_cost numeric(18, 2)
    := 0;

  v_line_count integer
    := 0;

  v_lines jsonb
    := '[]'::jsonb;

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
    p_sales_return_id is null
  then
    raise exception
      'Sales Return is required.';
  end if;


  select
    *
  into
    v_return
  from
    public.sales_returns
  where
    id =
      p_sales_return_id;


  if not found then
    raise exception
      'Sales Return was not found.';
  end if;


  if
    v_return.status <>
      'received'
  then
    raise exception
      'Sales Return % must be received before inventory GL posting.',
      v_return.return_number;
  end if;


  if
    v_return.inventory_transaction_id is null
  then
    raise exception
      'Sales Return % does not have an Inventory Transaction.',
      v_return.return_number;
  end if;


  select
    *
  into
    v_transaction
  from
    public.inventory_transactions
  where
    id =
      v_return.inventory_transaction_id;


  if not found then
    raise exception
      'Sales Return % Inventory Transaction was not found.',
      v_return.return_number;
  end if;


  if
    v_transaction.transaction_type <>
      'customer_return'
  then
    raise exception
      'Sales Return % Inventory Transaction is not a customer return.',
      v_return.return_number;
  end if;


  if
    v_transaction.status <>
      'posted'
  then
    raise exception
      'Sales Return % Inventory Transaction must be posted before GL posting.',
      v_return.return_number;
  end if;


  /*
   * Validate period using Sales Return posting date.
   */

  perform
    public.get_gl_accounting_period(
      v_return.posting_date,
      true
    );


  if not exists (
    select
      1
    from
      public.inventory_transaction_items
    where
      inventory_transaction_id =
        v_transaction.id
  )
  then
    raise exception
      'Sales Return % Inventory Transaction does not contain items.',
      v_return.return_number;
  end if;


  /*
   * Customer returns must restore inventory.
   */

  if exists (
    select
      1
    from
      public.inventory_transaction_items
    where
      inventory_transaction_id =
        v_transaction.id
      and quantity_change <=
        0
  )
  then
    raise exception
      'Sales Return % contains a non-positive inventory receipt quantity.',
      v_return.return_number;
  end if;


  v_inventory_account_id :=
    public.get_mapped_gl_account(
      'inventory'
    );


  v_cogs_account_id :=
    public.get_mapped_gl_account(
      'cogs'
    );


  /*
   * Build item-level reversal.
   *
   * Customer return is the inverse of original sales issue:
   *
   *   Dr Inventory
   *      Cr COGS
   */

  for
    v_item
  in

    select
      *
    from
      public.inventory_transaction_items
    where
      inventory_transaction_id =
        v_transaction.id
    order by
      line_number,
      id

  loop

    v_item_cost :=
      round(
        coalesce(
          v_item.total_cost,
          0
        ),
        2
      );


    if
      v_item_cost =
        0
    then
      continue;
    end if;


    if
      v_item_cost <
        0
    then
      raise exception
        'Sales Return inventory item % contains invalid negative cost.',
        v_item.id;
    end if;


    /*
     * Dr Inventory
     */

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_inventory_account_id,

          'debit',
            v_item_cost,

          'credit',
            0,

          'baseDebit',
            v_item_cost,

          'baseCredit',
            0,

          'description',
            'Inventory returned - '
            ||
            v_return.return_number,

          'productId',
            v_item.product_id,

          'warehouseId',
            v_item.warehouse_id,

          'sourceLineType',
            'inventory_transaction_item',

          'sourceLineId',
            v_item.id,

          'sourceLineNumber',
            v_item.line_number
        )
      );


    /*
     * Cr COGS
     */

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_cogs_account_id,

          'debit',
            0,

          'credit',
            v_item_cost,

          'baseDebit',
            0,

          'baseCredit',
            v_item_cost,

          'description',
            'COGS reversal - '
            ||
            v_return.return_number,

          'productId',
            v_item.product_id,

          'warehouseId',
            v_item.warehouse_id,

          'sourceLineType',
            'inventory_transaction_item',

          'sourceLineId',
            v_item.id,

          'sourceLineNumber',
            v_item.line_number
        )
      );


    v_total_cost :=
      round(
        v_total_cost
        +
        v_item_cost,
        2
      );


    v_line_count :=
      v_line_count
      +
      2;

  end loop;


  if
    v_total_cost <=
      0
  then
    raise exception
      'Sales Return % has zero inventory accounting value.',
      v_return.return_number;
  end if;


  if
    v_line_count <
      2
  then
    raise exception
      'Sales Return % did not produce valid inventory GL lines.',
      v_return.return_number;
  end if;


  /*
   * Inventory accounting cost is AED base currency.
   *
   * Use the Inventory Transaction as source identity because
   * this journal accounts for that physical stock movement.
   */

  v_journal_id :=
    public.post_erp_gl_journal(
      'sales_return_inventory',

      v_transaction.id,

      v_transaction.transaction_number,

      v_transaction.transaction_date,

      v_return.posting_date,

      'Sales Return inventory / COGS reversal - '
      ||
      v_return.return_number,

      'AED',

      1,

      v_lines
    );


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 3. Combined Sales Return GL Posting
 *
 * Convenience orchestration function.
 * ========================================================= */

create or replace function
  public.post_sales_return_gl(
    p_sales_return_id uuid
  )
returns table
(
  credit_journal_id uuid,
  inventory_journal_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin

  credit_journal_id :=
    public.post_sales_return_credit_gl(
      p_sales_return_id
    );


  inventory_journal_id :=
    public.post_sales_return_inventory_gl(
      p_sales_return_id
    );


  return next;

end;
$$;


/* =========================================================
 * 4. Permissions
 * ========================================================= */

revoke all
on function
  public.post_sales_return_credit_gl(
    uuid
  )
from public;


revoke all
on function
  public.post_sales_return_inventory_gl(
    uuid
  )
from public;


revoke all
on function
  public.post_sales_return_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_sales_return_credit_gl(
    uuid
  )
to authenticated;


grant execute
on function
  public.post_sales_return_inventory_gl(
    uuid
  )
to authenticated;


grant execute
on function
  public.post_sales_return_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 5. Documentation
 * ========================================================= */

comment on function
  public.post_sales_return_credit_gl(
    uuid
  )
is
  'Posts the commercial Sales Return credit to Sales Returns & Discounts, VAT Payable when applicable, and Accounts Receivable through the controlled General Ledger engine.';


comment on function
  public.post_sales_return_inventory_gl(
    uuid
  )
is
  'Posts the inventory restoration and COGS reversal for a received Sales Return using the posted customer_return inventory transaction and historical inventory cost.';


comment on function
  public.post_sales_return_gl(
    uuid
  )
is
  'Posts both the commercial credit and inventory/COGS reversal journals for a received Sales Return.';