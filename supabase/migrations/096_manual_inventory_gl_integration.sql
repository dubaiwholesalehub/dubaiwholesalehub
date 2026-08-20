/*
 * =========================================================
 * 096 — Manual Inventory General Ledger Integration
 *
 * PURPOSE
 * -------
 *
 * Connects posted manual inventory transactions to the
 * formal General Ledger.
 *
 *
 * SUPPORTED EVENTS
 * ----------------
 *
 * opening_balance
 * adjustment_in
 * adjustment_out
 * stock_count
 *
 *
 * ACCOUNTING
 * ----------
 *
 * OPENING BALANCE
 *
 *   Dr Inventory
 *      Cr Opening Balance Equity
 *
 *
 * ADJUSTMENT IN
 *
 *   Dr Inventory
 *      Cr Inventory Adjustment Gain
 *
 *
 * ADJUSTMENT OUT
 *
 *   Dr Inventory Adjustment Loss
 *      Cr Inventory
 *
 *
 * STOCK COUNT INCREASE
 *
 *   Dr Inventory
 *      Cr Inventory Adjustment Gain
 *
 *
 * STOCK COUNT DECREASE
 *
 *   Dr Inventory Adjustment Loss
 *      Cr Inventory
 *
 *
 * IMPORTANT
 * ---------
 *
 * Opening stock does NOT flow through current-year profit.
 *
 * Inventory gains and losses after operations begin DO flow
 * through profit and loss.
 *
 *
 * SOURCE
 * ------
 *
 * source_type = manual_inventory
 * source_id   = inventory_transactions.id
 *
 *
 * Every accounting line preserves:
 *
 * product
 * warehouse
 * inventory transaction item
 * source line number
 *
 *
 * Inventory valuation is maintained in AED base currency:
 *
 * currency_code = AED
 * exchange_rate = 1
 * =========================================================
 */


/* =========================================================
 * 1. Opening Balance Equity Account
 *
 * Dedicated balance-sheet clearing account for bringing
 * pre-existing inventory into the ERP.
 *
 * We intentionally do NOT use Retained Earnings because
 * opening stock migration is not itself prior-period profit.
 * ========================================================= */

insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '3400',
  'Opening Balance Equity',
  (
    select id
    from public.gl_accounts
    where account_code = '3000'
  ),
  'equity',
  'balance_sheet',
  'credit',
  'Temporary equity account used to establish opening ERP balances including opening inventory.',
  true,
  false,
  false,
  true,
  3400
)
on conflict (
  account_code
)
do update
set
  account_name =
    excluded.account_name,

  parent_id =
    excluded.parent_id,

  account_class =
    excluded.account_class,

  statement_type =
    excluded.statement_type,

  normal_balance =
    excluded.normal_balance,

  description =
    excluded.description,

  is_posting_account =
    excluded.is_posting_account,

  is_control_account =
    excluded.is_control_account,

  allow_manual_posting =
    excluded.allow_manual_posting,

  is_system_account =
    excluded.is_system_account,

  display_order =
    excluded.display_order;


/* =========================================================
 * 2. Inventory Adjustment Gain Account
 *
 * Separate from Sales Revenue.
 *
 * Stock gains are operational inventory gains and should not
 * inflate merchandise sales revenue.
 * ========================================================= */

insert into public.gl_accounts
(
  account_code,
  account_name,
  parent_id,
  account_class,
  statement_type,
  normal_balance,
  description,
  is_posting_account,
  is_control_account,
  allow_manual_posting,
  is_system_account,
  display_order
)
values
(
  '4400',
  'Inventory Adjustment Gains',
  (
    select id
    from public.gl_accounts
    where account_code = '4000'
  ),
  'revenue',
  'profit_loss',
  'credit',
  'Inventory gains recognized from stock adjustments and physical stock counts.',
  true,
  false,
  false,
  true,
  4400
)
on conflict (
  account_code
)
do update
set
  account_name =
    excluded.account_name,

  parent_id =
    excluded.parent_id,

  account_class =
    excluded.account_class,

  statement_type =
    excluded.statement_type,

  normal_balance =
    excluded.normal_balance,

  description =
    excluded.description,

  is_posting_account =
    excluded.is_posting_account,

  is_control_account =
    excluded.is_control_account,

  allow_manual_posting =
    excluded.allow_manual_posting,

  is_system_account =
    excluded.is_system_account,

  display_order =
    excluded.display_order;


/* =========================================================
 * 3. System Account Mappings
 * ========================================================= */

insert into public.gl_account_mappings
(
  mapping_key,
  gl_account_id,
  description
)
values
(
  'opening_balance_equity',
  (
    select id
    from public.gl_accounts
    where account_code = '3400'
  ),
  'Opening balance equity used when initial ERP inventory and other opening balances are established.'
),
(
  'inventory_adjustment_gain',
  (
    select id
    from public.gl_accounts
    where account_code = '4400'
  ),
  'Inventory gains arising from manual stock adjustments and positive physical count differences.'
)
on conflict (
  mapping_key
)
do update
set
  gl_account_id =
    excluded.gl_account_id,

  description =
    excluded.description,

  is_active =
    true,

  updated_at =
    now();


/* =========================================================
 * 4. Manual Inventory → GL Adapter
 * ========================================================= */

create or replace function
  public.post_manual_inventory_gl(
    p_inventory_transaction_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_transaction
    public.inventory_transactions%rowtype;

  v_item
    public.inventory_transaction_items%rowtype;


  v_inventory_account_id uuid;

  v_opening_equity_account_id uuid;

  v_adjustment_gain_account_id uuid;

  v_adjustment_loss_account_id uuid;


  v_item_cost
    numeric(18, 2);

  v_total_debit
    numeric(18, 2) := 0;

  v_total_credit
    numeric(18, 2) := 0;


  v_lines jsonb :=
    '[]'::jsonb;


  v_accounting_item_count
    integer := 0;

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
    p_inventory_transaction_id
      is null
  then
    raise exception
      'Inventory Transaction ID is required.';
  end if;


  /* =======================================================
   * Load + Lock Transaction
   * ======================================================= */

  select
    *

  into
    v_transaction

  from
    public.inventory_transactions

  where
    id =
      p_inventory_transaction_id

  for update;


  if not found
  then
    raise exception
      'Inventory Transaction was not found.';
  end if;


  /* =======================================================
   * Must Be Posted
   * ======================================================= */

  if
    v_transaction.status <>
      'posted'
  then
    raise exception
      'Inventory Transaction % must be posted before General Ledger posting.',
      v_transaction.transaction_number;
  end if;


  /* =======================================================
   * Supported Manual Transaction Types Only
   * ======================================================= */

  if
    v_transaction.transaction_type
    not in (
      'opening_balance',
      'adjustment_in',
      'adjustment_out',
      'stock_count'
    )
  then
    raise exception
      'Inventory Transaction % is not a supported manual inventory accounting event.',
      v_transaction.transaction_number;
  end if;


  /* =======================================================
   * Items Required
   * ======================================================= */

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
      'Inventory Transaction % does not contain inventory items.',
      v_transaction.transaction_number;
  end if;


  /* =======================================================
   * Resolve GL Accounts
   * ======================================================= */

  v_inventory_account_id :=
    public.get_mapped_gl_account(
      'inventory'
    );


  v_opening_equity_account_id :=
    public.get_mapped_gl_account(
      'opening_balance_equity'
    );


  v_adjustment_gain_account_id :=
    public.get_mapped_gl_account(
      'inventory_adjustment_gain'
    );


  v_adjustment_loss_account_id :=
    public.get_mapped_gl_account(
      'inventory_adjustment_loss'
    );


  /* =======================================================
   * Build Item-Level Journal
   * ======================================================= */

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

    /*
     * total_cost is generated as:
     *
     * abs(quantity_change) * unit_cost
     */

    v_item_cost :=
      round(
        coalesce(
          v_item.total_cost,
          0
        ),
        2
      );


    /*
     * Zero-value lines have no GL accounting impact.
     */

    if
      v_item_cost <=
        0
    then
      continue;
    end if;


    /* =====================================================
     * OPENING BALANCE
     *
     * Dr Inventory
     *    Cr Opening Balance Equity
     * ===================================================== */

    if
      v_transaction.transaction_type =
        'opening_balance'
    then

      if
        v_item.quantity_change <=
          0
      then
        raise exception
          'Opening Balance transaction % contains a non-positive quantity change.',
          v_transaction.transaction_number;
      end if;


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
              'Opening Inventory - '
              ||
              v_transaction.transaction_number,

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
          ),

          jsonb_build_object(
            'glAccountId',
              v_opening_equity_account_id,

            'debit',
              0,

            'credit',
              v_item_cost,

            'baseDebit',
              0,

            'baseCredit',
              v_item_cost,

            'description',
              'Opening Balance Equity - '
              ||
              v_transaction.transaction_number,

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


    /* =====================================================
     * ADJUSTMENT IN
     *
     * Dr Inventory
     *    Cr Inventory Adjustment Gain
     * ===================================================== */

    elsif
      v_transaction.transaction_type =
        'adjustment_in'
    then

      if
        v_item.quantity_change <=
          0
      then
        raise exception
          'Adjustment In transaction % contains a non-positive quantity change.',
          v_transaction.transaction_number;
      end if;


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
              'Inventory Adjustment In - '
              ||
              v_transaction.transaction_number,

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
          ),

          jsonb_build_object(
            'glAccountId',
              v_adjustment_gain_account_id,

            'debit',
              0,

            'credit',
              v_item_cost,

            'baseDebit',
              0,

            'baseCredit',
              v_item_cost,

            'description',
              'Inventory Adjustment Gain - '
              ||
              v_transaction.transaction_number,

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


    /* =====================================================
     * ADJUSTMENT OUT
     *
     * Dr Inventory Adjustment Loss
     *    Cr Inventory
     * ===================================================== */

    elsif
      v_transaction.transaction_type =
        'adjustment_out'
    then

      if
        v_item.quantity_change >=
          0
      then
        raise exception
          'Adjustment Out transaction % contains a non-negative quantity change.',
          v_transaction.transaction_number;
      end if;


      v_lines :=
        v_lines
        ||
        jsonb_build_array(

          jsonb_build_object(
            'glAccountId',
              v_adjustment_loss_account_id,

            'debit',
              v_item_cost,

            'credit',
              0,

            'baseDebit',
              v_item_cost,

            'baseCredit',
              0,

            'description',
              'Inventory Adjustment Loss - '
              ||
              v_transaction.transaction_number,

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
          ),

          jsonb_build_object(
            'glAccountId',
              v_inventory_account_id,

            'debit',
              0,

            'credit',
              v_item_cost,

            'baseDebit',
              0,

            'baseCredit',
              v_item_cost,

            'description',
              'Inventory Adjustment Out - '
              ||
              v_transaction.transaction_number,

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


    /* =====================================================
     * STOCK COUNT
     *
     * Positive difference:
     *
     *   Dr Inventory
     *      Cr Inventory Adjustment Gain
     *
     *
     * Negative difference:
     *
     *   Dr Inventory Adjustment Loss
     *      Cr Inventory
     * ===================================================== */

    elsif
      v_transaction.transaction_type =
        'stock_count'
    then

      if
        v_item.quantity_change >
          0
      then

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
                'Stock Count Increase - '
                ||
                v_transaction.transaction_number,

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
            ),

            jsonb_build_object(
              'glAccountId',
                v_adjustment_gain_account_id,

              'debit',
                0,

              'credit',
                v_item_cost,

              'baseDebit',
                0,

              'baseCredit',
                v_item_cost,

              'description',
                'Stock Count Gain - '
                ||
                v_transaction.transaction_number,

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


      elsif
        v_item.quantity_change <
          0
      then

        v_lines :=
          v_lines
          ||
          jsonb_build_array(

            jsonb_build_object(
              'glAccountId',
                v_adjustment_loss_account_id,

              'debit',
                v_item_cost,

              'credit',
                0,

              'baseDebit',
                v_item_cost,

              'baseCredit',
                0,

              'description',
                'Stock Count Loss - '
                ||
                v_transaction.transaction_number,

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
            ),

            jsonb_build_object(
              'glAccountId',
                v_inventory_account_id,

              'debit',
                0,

              'credit',
                v_item_cost,

              'baseDebit',
                0,

              'baseCredit',
                v_item_cost,

              'description',
                'Stock Count Inventory Reduction - '
                ||
                v_transaction.transaction_number,

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

      else

        /*
         * No physical difference.
         * No GL movement.
         */

        continue;

      end if;

    end if;


    v_accounting_item_count :=
      v_accounting_item_count +
      1;


    v_total_debit :=
      round(
        v_total_debit
        +
        v_item_cost,
        2
      );


    v_total_credit :=
      round(
        v_total_credit
        +
        v_item_cost,
        2
      );

  end loop;


  /* =======================================================
   * Require Accounting Value
   * ======================================================= */

  if
    v_accounting_item_count =
      0
  then
    raise exception
      'Inventory Transaction % has no accounting-value stock movement.',
      v_transaction.transaction_number;
  end if;


  if
    jsonb_array_length(
      v_lines
    ) <
      2
  then
    raise exception
      'Inventory Transaction % did not produce valid GL lines.',
      v_transaction.transaction_number;
  end if;


  if
    abs(
      v_total_debit
      -
      v_total_credit
    ) >
      0.01
  then
    raise exception
      'Inventory Transaction % manual inventory journal is not balanced.',
      v_transaction.transaction_number;
  end if;


  /* =======================================================
   * Post Through Controlled GL Engine
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'manual_inventory',

      v_transaction.id,

      v_transaction.transaction_number,

      v_transaction.transaction_date,

      v_transaction.transaction_date,

      case
        when
          v_transaction.transaction_type =
            'opening_balance'
        then
          'Opening Inventory - '
          ||
          v_transaction.transaction_number

        when
          v_transaction.transaction_type =
            'adjustment_in'
        then
          'Inventory Adjustment In - '
          ||
          v_transaction.transaction_number

        when
          v_transaction.transaction_type =
            'adjustment_out'
        then
          'Inventory Adjustment Out - '
          ||
          v_transaction.transaction_number

        else
          'Inventory Stock Count - '
          ||
          v_transaction.transaction_number
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
 * 5. Permissions
 * ========================================================= */

revoke all
on function
  public.post_manual_inventory_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_manual_inventory_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 6. Documentation
 * ========================================================= */

comment on function
  public.post_manual_inventory_gl(
    uuid
  )
is
  'Posts manual inventory Opening Balance, Adjustment In, Adjustment Out and Stock Count movements to the General Ledger using actual inventory transaction item costs. Opening stock offsets Opening Balance Equity, positive adjustments offset Inventory Adjustment Gains and negative adjustments debit Inventory Adjustments & Losses.';