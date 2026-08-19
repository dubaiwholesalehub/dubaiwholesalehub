/*
 * =========================================================
 * 094 — Inventory COGS General Ledger Integration
 *
 * PURPOSE
 * -------
 *
 * Recognizes Cost of Goods Sold from the actual posted
 * inventory SALES ISSUE generated when a Delivery Order is
 * dispatched.
 *
 *
 * ACCOUNTING EVENT
 * ----------------
 *
 * For every dispatched inventory transaction item:
 *
 *   Dr Cost of Goods Sold
 *      Cr Inventory
 *
 *
 * Cost comes directly from:
 *
 *   inventory_transaction_items.total_cost
 *
 * where:
 *
 *   total_cost =
 *     abs(quantity_change)
 *     *
 *     unit_cost
 *
 *
 * During Delivery Order dispatch:
 *
 *   quantity_change = negative dispatched quantity
 *
 *   unit_cost =
 *     warehouse_stock.average_unit_cost
 *
 *
 * IMPORTANT ARCHITECTURE
 * ----------------------
 *
 * Sales Order revenue / VAT remains a separate event:
 *
 *   Dr Accounts Receivable
 *      Cr Sales Revenue
 *      Cr VAT Payable
 *
 *
 * Inventory COGS is recognized ONLY when stock physically
 * leaves inventory through a posted sales_issue transaction.
 *
 *
 * SUPPORTED INVENTORY EVENT
 * -------------------------
 *
 * This adapter intentionally supports ONLY:
 *
 *   transaction_type = sales_issue
 *   status           = posted
 *   reference_type   = delivery_order
 *
 *
 * It does NOT account:
 *
 * - goods receipts
 * - inventory transfers
 * - customer returns
 * - supplier returns
 * - stock counts
 * - opening balances
 * - manual adjustments
 *
 * Those require their own accounting rules.
 *
 *
 * GL SOURCE
 * ---------
 *
 *   source_type = inventory_cogs
 *   source_id   = inventory_transactions.id
 *
 *
 * This gives one immutable COGS journal for one actual posted
 * inventory dispatch transaction.
 *
 *
 * LINE TRACEABILITY
 * -----------------
 *
 * Every inventory item creates:
 *
 *   one COGS debit
 *   one Inventory credit
 *
 * with:
 *
 *   productId
 *   warehouseId
 *   sourceLineType
 *   sourceLineId
 *   sourceLineNumber
 *
 *
 * BASE CURRENCY
 * -------------
 *
 * Inventory accounting cost is maintained in ERP base
 * currency.
 *
 * Base currency = AED.
 *
 * Therefore:
 *
 *   currency_code = AED
 *   exchange_rate = 1
 *
 * transaction amount =
 * base amount
 * =========================================================
 */


/* =========================================================
 * 1. Inventory Sales Issue → COGS GL Adapter
 * ========================================================= */

create or replace function
  public.post_inventory_cogs_gl(
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


  v_cogs_account_id uuid;

  v_inventory_account_id uuid;


  v_item_cost
    numeric(18, 2);

  v_total_cost
    numeric(18, 2) := 0;


  v_line_count integer := 0;


  v_lines jsonb :=
    '[]'::jsonb;


  v_journal_id uuid;

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
      'Administrator access is required.';
  end if;


  /* =======================================================
   * Input
   * ======================================================= */

  if
    p_inventory_transaction_id
      is null
  then
    raise exception
      'Inventory Transaction ID is required.';
  end if;


  /* =======================================================
   * Load + Lock Inventory Transaction
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
   * Supported Accounting Event
   * ======================================================= */

  if
    v_transaction.status <>
      'posted'
  then
    raise exception
      'Inventory Transaction % must be posted before COGS accounting.',
      v_transaction.transaction_number;
  end if;


  if
    v_transaction.transaction_type <>
      'sales_issue'
  then
    raise exception
      'Inventory Transaction % is not a sales_issue transaction.',
      v_transaction.transaction_number;
  end if;


  if
    v_transaction.reference_type <>
      'delivery_order'
  then
    raise exception
      'Inventory Transaction % is not linked to a Delivery Order.',
      v_transaction.transaction_number;
  end if;


  if
    v_transaction.reference_id
      is null
  then
    raise exception
      'Inventory Transaction % does not have a Delivery Order reference.',
      v_transaction.transaction_number;
  end if;


  /* =======================================================
   * Validate Inventory Items Exist
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
      'Inventory Transaction % does not contain any inventory items.',
      v_transaction.transaction_number;
  end if;


  /* =======================================================
   * Validate Sales-Issue Direction
   *
   * Stock leaving inventory must be represented by a
   * negative quantity_change.
   * ======================================================= */

  if exists (
    select
      1

    from
      public.inventory_transaction_items

    where
      inventory_transaction_id =
        v_transaction.id

      and quantity_change >=
        0
  )
  then
    raise exception
      'Inventory Transaction % contains a non-negative sales issue quantity.',
      v_transaction.transaction_number;
  end if;


  /* =======================================================
   * Validate Costs
   * ======================================================= */

  if exists (
    select
      1

    from
      public.inventory_transaction_items

    where
      inventory_transaction_id =
        v_transaction.id

      and unit_cost <
        0
  )
  then
    raise exception
      'Inventory Transaction % contains a negative inventory cost.',
      v_transaction.transaction_number;
  end if;


  /* =======================================================
   * Resolve Stable GL Accounts
   * ======================================================= */

  v_cogs_account_id :=
    public.get_mapped_gl_account(
      'cogs'
    );


  v_inventory_account_id :=
    public.get_mapped_gl_account(
      'inventory'
    );


  /* =======================================================
   * Build Item-Level COGS Journal
   *
   * Every inventory transaction item gets:
   *
   *   Dr COGS
   *      Cr Inventory
   *
   * Zero-cost items are intentionally skipped because they
   * have no accounting value and GL posting lines cannot be
   * zero-value lines.
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

    v_item_cost :=
      round(
        coalesce(
          v_item.total_cost,
          0
        ),
        2
      );


    /*
     * Zero-cost stock can legitimately exist.
     *
     * It creates no economic COGS value, therefore no formal
     * GL line is needed.
     */

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
        'Inventory Transaction item % contains an invalid negative total cost.',
        v_item.id;
    end if;


    /* =====================================================
     * COGS Debit
     * ===================================================== */

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_cogs_account_id,

          'debit',
            v_item_cost,

          'credit',
            0,

          'baseDebit',
            v_item_cost,

          'baseCredit',
            0,

          'description',
            'COGS - '
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
     * Inventory Credit
     * ===================================================== */

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

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
            'Inventory issued - '
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


    v_total_cost :=
      round(
        v_total_cost
        +
        v_item_cost,
        2
      );


    v_line_count :=
      v_line_count +
      2;

  end loop;


  /* =======================================================
   * Accounting Value Required
   * ======================================================= */

  if
    v_total_cost <=
      0
  then
    raise exception
      'Inventory Transaction % has zero COGS accounting value.',
      v_transaction.transaction_number;
  end if;


  if
    v_line_count <
      2
  then
    raise exception
      'Inventory Transaction % did not produce valid COGS journal lines.',
      v_transaction.transaction_number;
  end if;


  /* =======================================================
   * Post Through Controlled GL Engine
   *
   * Inventory cost is already maintained in AED base
   * currency.
   *
   * Therefore:
   *
   *   currency = AED
   *   exchange rate = 1
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'inventory_cogs',

      v_transaction.id,

      v_transaction.transaction_number,

      v_transaction.transaction_date,

      v_transaction.transaction_date,

      'Inventory COGS recognition - '
      ||
      v_transaction.transaction_number,

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
  public.post_inventory_cogs_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_inventory_cogs_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.post_inventory_cogs_gl(
    uuid
  )
is
  'Posts Cost of Goods Sold from a posted Delivery Order sales_issue inventory transaction. Each inventory transaction item creates a product/warehouse-dimensioned COGS debit and Inventory credit using its actual stored inventory total_cost. Inventory accounting cost is treated as AED base currency.';