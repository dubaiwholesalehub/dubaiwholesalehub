/* =========================================================
 * Migration 169
 * Inventory Cost Precision Upgrade
 *
 * Purpose
 * -------
 * Preserve higher internal weighted-average inventory cost
 * precision without disturbing existing profitability views
 * or historical generated cost columns.
 *
 * Quantities remain numeric(18,4).
 * Existing inventory_transaction_items.unit_cost remains
 * numeric(18,4) for backward compatibility.
 *
 * New authoritative valuation cost:
 *   valuation_unit_cost numeric(20,8)
 *
 * GL monetary postings remain rounded to AED 2dp.
 * ========================================================= */


/* =========================================================
 * 1. Warehouse authoritative weighted-average cost
 * ========================================================= */

drop view public.sales_order_margin_analysis;

alter table public.warehouse_stock
  alter column average_unit_cost
  type numeric(20, 8);

create or replace view
  public.sales_order_margin_analysis
with (
  security_invoker = true
)
as

select

  /* =======================================================
   * Sales Order Header
   * ======================================================= */

  sales_order.id
    as sales_order_id,

  sales_order.order_number,

  sales_order.status,

  sales_order.customer_id,

  sales_order.source,

  sales_order.currency_code,

  sales_order.exchange_rate,


  /* =======================================================
   * Sales Order Item
   * ======================================================= */

  sales_item.id
    as sales_order_item_id,

  sales_item.line_number,

  sales_item.product_id,

  product.category_id,

  sales_item.item_name,

  sales_item.sku,

  sales_item.fulfilment_method,

  coalesce(
    sales_item.warehouse_id,
    sales_order.warehouse_id
  )
    as warehouse_id,

  sales_item.quantity,

  sales_item.unit_price,

  sales_item.discount_amount,

  sales_item.line_subtotal
    as net_sales_value,


  /* =======================================================
   * Effective Unit Selling Price
   *
   * line_subtotal is already the net line value
   * before VAT.
   * ======================================================= */

  case
    when
      sales_item.quantity > 0
    then
      round(
        sales_item.line_subtotal
        /
        sales_item.quantity,
        4
      )

    else
      0
  end
    as effective_unit_selling_price,


  /* =======================================================
   * Current Unit Cost
   *
   * IMPORTANT:
   *
   * This column MUST remain in the same position as the
   * previous view definition.
   *
   * Quick Sale Local Purchase:
   *     margin_cost_override
   *
   * Normal Stock Sale:
   *     warehouse average cost
   * ======================================================= */

  coalesce(
    sales_item.margin_cost_override,
    warehouse_stock.average_unit_cost
  )
    as current_unit_cost,


  /* =======================================================
   * Estimated COGS
   *
   * Used for PRE-SALE margin analysis only.
   * ======================================================= */

  case
    when
      sales_item.fulfilment_method =
        'stock'

      and

      coalesce(
        sales_item.margin_cost_override,
        warehouse_stock.average_unit_cost
      )
      is not null

    then
      round(
        coalesce(
          sales_item.margin_cost_override,
          warehouse_stock.average_unit_cost
        )
        *
        sales_item.quantity,
        2
      )

    else
      null
  end
    as estimated_cogs,


  /* =======================================================
   * Estimated Gross Profit
   * ======================================================= */

  case
    when
      sales_item.fulfilment_method =
        'stock'

      and

      coalesce(
        sales_item.margin_cost_override,
        warehouse_stock.average_unit_cost
      )
      is not null

    then
      round(
        sales_item.line_subtotal
        -
        (
          coalesce(
            sales_item.margin_cost_override,
            warehouse_stock.average_unit_cost
          )
          *
          sales_item.quantity
        ),
        2
      )

    else
      null
  end
    as estimated_gross_profit,


  /* =======================================================
   * Estimated Gross Margin %
   *
   * Formula:
   *
   *   (Revenue - Cost)
   *   ---------------- Ã— 100
   *        Revenue
   * ======================================================= */

  case
    when
      sales_item.fulfilment_method =
        'stock'

      and

      coalesce(
        sales_item.margin_cost_override,
        warehouse_stock.average_unit_cost
      )
      is not null

      and

      sales_item.line_subtotal > 0

    then
      round(
        (
          sales_item.line_subtotal
          -
          (
            coalesce(
              sales_item.margin_cost_override,
              warehouse_stock.average_unit_cost
            )
            *
            sales_item.quantity
          )
        )
        /
        sales_item.line_subtotal
        *
        100,
        2
      )

    else
      null
  end
    as estimated_margin_percentage,


  /* =======================================================
   * Margin Status
   *
   * healthy
   * warning
   * blocked
   * cost_missing
   * cost_not_available
   * ======================================================= */

  case

    /*
     * Margin protection currently operates on stock lines.
     */
    when
      sales_item.fulfilment_method <>
        'stock'

    then
      'cost_not_available'


    /*
     * Cost missing / invalid.
     */
    when
      coalesce(
        sales_item.margin_cost_override,
        warehouse_stock.average_unit_cost
      )
      is null

      or

      coalesce(
        sales_item.margin_cost_override,
        warehouse_stock.average_unit_cost
      )
      <= 0

    then
      'cost_missing'


    /*
     * Below configured minimum.
     *
     * Example:
     *
     * minimum = 0%
     * calculated margin = -5%
     *
     * -> blocked / approval required
     */
    when
      (
        (
          sales_item.line_subtotal
          -
          (
            coalesce(
              sales_item.margin_cost_override,
              warehouse_stock.average_unit_cost
            )
            *
            sales_item.quantity
          )
        )
        /
        nullif(
          sales_item.line_subtotal,
          0
        )
        *
        100
      )
      <
      coalesce(
        policy.minimum_margin_percentage,
        0
      )

    then
      'blocked'


    /*
     * Below warning threshold but above/equal minimum.
     */
    when
      (
        (
          sales_item.line_subtotal
          -
          (
            coalesce(
              sales_item.margin_cost_override,
              warehouse_stock.average_unit_cost
            )
            *
            sales_item.quantity
          )
        )
        /
        nullif(
          sales_item.line_subtotal,
          0
        )
        *
        100
      )
      <
      coalesce(
        policy.warning_margin_percentage,
        15
      )

    then
      'warning'


    else
      'healthy'

  end
    as margin_status,


  /* =======================================================
   * NEW COLUMNS â€” APPENDED AFTER EXISTING VIEW COLUMNS
   *
   * PostgreSQL requires the original CREATE OR REPLACE VIEW
   * columns to retain their names and positions.
   * ======================================================= */


  /*
   * Warehouse cost before applying override.
   */
  warehouse_stock.average_unit_cost
    as warehouse_average_unit_cost,


  /*
   * Transaction-specific expected cost.
   *
   * Quick Sale local purchase uses the purchase price
   * entered by the user.
   */
  sales_item.margin_cost_override,


  /*
   * Explains why an override exists.
   *
   * Example:
   *
   * Quick Sale local purchase
   */
  sales_item.margin_cost_override_reason,


  /*
   * Makes the source visible to the application.
   */
  case

    when
      sales_item.margin_cost_override
        is not null

    then
      'cost_override'


    when
      warehouse_stock.average_unit_cost
        is not null

    then
      'warehouse_average'


    else
      'missing'

  end
    as margin_cost_source


/* =========================================================
 * Tables
 * ========================================================= */

from
  public.sales_orders
    sales_order


inner join
  public.sales_order_items
    sales_item

  on
    sales_item.sales_order_id =
      sales_order.id


left join
  public.products
    product

  on
    product.id =
      sales_item.product_id


left join
  public.warehouse_stock
    warehouse_stock

  on
    warehouse_stock.product_id =
      sales_item.product_id

  and

    warehouse_stock.warehouse_id =
      coalesce(
        sales_item.warehouse_id,
        sales_order.warehouse_id
      )


/* =========================================================
 * Active Margin Policy
 * ========================================================= */

left join lateral (

  select
    p.*

  from
    public.sales_margin_policy
      p

  where
    p.is_active =
      true

  order by
    p.updated_at desc

  limit 1

) policy
  on true;

comment on view public.sales_order_margin_analysis is
  'Pre-sale Sales Order margin analysis. Uses margin cost override when available, otherwise current warehouse average inventory cost. Does not replace actual dispatch COGS used by P&L.';

grant all privileges on table public.sales_order_margin_analysis to anon;
grant all privileges on table public.sales_order_margin_analysis to authenticated;
grant all privileges on table public.sales_order_margin_analysis to service_role;
grant all privileges on table public.sales_order_margin_analysis to postgres;


/* =========================================================
 * 2. High-precision inventory transaction valuation cost
 *
 * Existing:
 *   unit_cost  numeric(18,4)
 *   total_cost numeric(18,4) generated
 *
 * remain untouched because profitability views depend on
 * total_cost.
 * ========================================================= */

alter table public.inventory_transaction_items
  add column valuation_unit_cost numeric(20, 8);


/* Historical transactions were originally stored only at
 * 4dp, therefore the best authoritative historical value
 * available is the existing unit_cost.
 */
update public.inventory_transaction_items
set valuation_unit_cost = unit_cost
where valuation_unit_cost is null;


alter table public.inventory_transaction_items
  alter column valuation_unit_cost
  set not null;


alter table public.inventory_transaction_items
  add constraint inventory_transaction_items_valuation_unit_cost_nonnegative
  check (
    valuation_unit_cost >= 0
  );


comment on column public.inventory_transaction_items.valuation_unit_cost is
  'Authoritative high-precision inventory valuation unit cost. Internal inventory costing uses 8 decimal places. Legacy unit_cost and generated total_cost remain 4dp for compatibility.';


/* =========================================================
 * IMPORTANT
 * =========================================================
 *
 * Existing inventory_transaction_items.unit_cost and
 * inventory_transaction_items.total_cost are intentionally
 * NOT modified by this migration.
 *
 * profitability_sales_lines and all dependent profitability
 * views therefore remain untouched.
 * ========================================================= */

 /* =========================================================
 * 3. Inventory Transfer Cost Precision
 *
 * Transfer posting workflow is not yet implemented.
 * Preserve 8dp capacity now so future transfers do not
 * truncate warehouse weighted-average cost.
 * ========================================================= */

alter table public.inventory_transfer_items
  alter column unit_cost
  type numeric(20, 8);
/* =========================================================
 * 4. Goods Receipt - 8dp Inventory Valuation
 * ========================================================= */

create or replace function public.complete_goods_receipt(
  p_goods_receipt_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goods_receipt public.goods_receipts%rowtype;

  v_inventory_transaction_id uuid;
  v_transaction_number text;

  v_user_id uuid;

  v_item_count integer;
  v_invalid_quantity_count integer;
  v_over_receipt_count integer;

  v_all_po_items_received boolean;

  v_item record;

  v_current_quantity numeric(18, 4);
  v_current_average_cost numeric(20, 8);
  v_new_quantity numeric(18, 4);
  v_new_average_cost numeric(20, 8);

  v_effective_accepted_quantity numeric(18, 4);
begin
  v_user_id := auth.uid();


  /* =======================================================
   * Lock and load the Goods Receipt
   * ======================================================= */

  select *
  into v_goods_receipt
  from public.goods_receipts
  where id = p_goods_receipt_id
  for update;

  if not found then
    raise exception
      'Goods Receipt % was not found.',
      p_goods_receipt_id;
  end if;


  /* =======================================================
   * Validate Goods Receipt status
   * ======================================================= */

  if v_goods_receipt.status = 'completed' then
    raise exception
      'Goods Receipt % has already been completed.',
      v_goods_receipt.receipt_number;
  end if;

  if v_goods_receipt.status = 'cancelled' then
    raise exception
      'Cancelled Goods Receipt % cannot be completed.',
      v_goods_receipt.receipt_number;
  end if;


  /* =======================================================
   * Lock the Purchase Order
   * ======================================================= */

  perform 1
  from public.purchase_orders
  where id = v_goods_receipt.purchase_order_id
  for update;

  if not found then
    raise exception
      'Purchase Order linked to Goods Receipt % was not found.',
      v_goods_receipt.receipt_number;
  end if;


  /* =======================================================
   * Lock Purchase Order items
   *
   * This prevents two Goods Receipts from posting against
   * the same Purchase Order lines simultaneously.
   * ======================================================= */

  perform poi.id
  from public.purchase_order_items poi
  inner join public.goods_receipt_items gri
    on gri.purchase_order_item_id = poi.id
  where gri.goods_receipt_id = p_goods_receipt_id
  for update of poi;


  /* =======================================================
   * Ensure the Goods Receipt contains items
   * ======================================================= */

  select count(*)
  into v_item_count
  from public.goods_receipt_items
  where goods_receipt_id = p_goods_receipt_id;

  if v_item_count = 0 then
    raise exception
      'Goods Receipt % does not contain any items.',
      v_goods_receipt.receipt_number;
  end if;


  /* =======================================================
   * Validate receiving quantities
   *
   * A zero inspection breakdown means:
   *   accepted_quantity = receiving_quantity
   *
   * This supports simple "receive all" workflows.
   *
   * When any breakdown quantity is supplied, the total must
   * equal receiving_quantity.
   * ======================================================= */

  select count(*)
  into v_invalid_quantity_count
  from public.goods_receipt_items
  where goods_receipt_id = p_goods_receipt_id
    and (
      receiving_quantity <= 0
      or
      (
        accepted_quantity
        + rejected_quantity
        + damaged_quantity > 0
        and
        accepted_quantity
        + rejected_quantity
        + damaged_quantity <> receiving_quantity
      )
    );

  if v_invalid_quantity_count > 0 then
    raise exception
      'Goods Receipt % contains invalid receiving or inspection quantities.',
      v_goods_receipt.receipt_number;
  end if;


  /* =======================================================
   * Automatically accept quantities where no inspection
   * breakdown has been entered.
   * ======================================================= */

  update public.goods_receipt_items
  set
    accepted_quantity = receiving_quantity,
    inspection_status = 'accepted',
    updated_at = now()
  where goods_receipt_id = p_goods_receipt_id
    and receiving_quantity > 0
    and accepted_quantity = 0
    and rejected_quantity = 0
    and damaged_quantity = 0;


  /* =======================================================
   * Synchronize the snapshot of previously received quantity
   * with the current Purchase Order values.
   * ======================================================= */

  update public.goods_receipt_items gri
  set
    previously_received_quantity = poi.received_quantity,
    updated_at = now()
  from public.purchase_order_items poi
  where gri.goods_receipt_id = p_goods_receipt_id
    and poi.id = gri.purchase_order_item_id;


  /* =======================================================
   * Prevent over-receiving
   *
   * Purchase Order received_quantity increases only by
   * accepted stock. Rejected or damaged goods remain
   * outstanding on the Purchase Order.
   * ======================================================= */

  select count(*)
  into v_over_receipt_count
  from public.goods_receipt_items gri
  inner join public.purchase_order_items poi
    on poi.id = gri.purchase_order_item_id
  where gri.goods_receipt_id = p_goods_receipt_id
    and (
      poi.received_quantity + gri.accepted_quantity
      > poi.ordered_quantity
    );

  if v_over_receipt_count > 0 then
    raise exception
      'Goods Receipt % would exceed one or more Purchase Order quantities.',
      v_goods_receipt.receipt_number;
  end if;


  /* =======================================================
   * Prevent duplicate posting
   * ======================================================= */

  if exists (
    select 1
    from public.inventory_transactions
    where transaction_type = 'goods_receipt'
      and reference_type = 'goods_receipt'
      and reference_id = p_goods_receipt_id
      and status = 'posted'
  ) then
    raise exception
      'Inventory has already been posted for Goods Receipt %.',
      v_goods_receipt.receipt_number;
  end if;


  /* =======================================================
   * Generate inventory transaction number
   * ======================================================= */

  v_transaction_number :=
    'INV-'
    || to_char(current_date, 'YYYY')
    || '-'
    || lpad(
      nextval(
        'public.inventory_transaction_number_seq'
      )::text,
      6,
      '0'
    );


  /* =======================================================
   * Create inventory transaction header
   * ======================================================= */

  insert into public.inventory_transactions (
    transaction_number,
    transaction_type,
    status,
    transaction_date,
    warehouse_id,
    reference_type,
    reference_id,
    reference_number,
    description,
    posted_at,
    created_by,
    posted_by,
    created_at,
    updated_at
  )
  values (
    v_transaction_number,
    'goods_receipt',
    'posted',
    coalesce(
      v_goods_receipt.received_date,
      current_date
    ),
    v_goods_receipt.warehouse_id,
    'goods_receipt',
    v_goods_receipt.id,
    v_goods_receipt.receipt_number,
    'Goods Receipt '
      || v_goods_receipt.receipt_number,
    now(),
    v_user_id,
    v_user_id,
    now(),
    now()
  )
  returning id
  into v_inventory_transaction_id;


  /* =======================================================
   * Process accepted Goods Receipt items
   * ======================================================= */

  for v_item in
    select
      gri.id,
      gri.line_number,
      gri.purchase_order_item_id,
      gri.product_id,
      gri.accepted_quantity,
      gri.unit_cost,
      gri.batch_number,
      gri.lot_number,
      gri.serial_number,
      gri.manufacturing_date,
      gri.expiry_date,
      gri.notes
    from public.goods_receipt_items gri
    where gri.goods_receipt_id = p_goods_receipt_id
      and gri.accepted_quantity > 0
    order by gri.line_number
  loop
    v_effective_accepted_quantity :=
      v_item.accepted_quantity;


    /* -----------------------------------------------------
     * Create inventory transaction item
     * ----------------------------------------------------- */

    insert into public.inventory_transaction_items (
      inventory_transaction_id,
      warehouse_id,
      product_id,
      line_number,
      quantity_change,
      unit_cost,
      valuation_unit_cost,
      source_document_item_id,
      batch_number,
      lot_number,
      serial_number,
      manufacturing_date,
      expiry_date,
      notes,
      created_at
    )
    values (
      v_inventory_transaction_id,
      v_goods_receipt.warehouse_id,
      v_item.product_id,
      v_item.line_number,
      v_effective_accepted_quantity,
      v_item.unit_cost,
      v_item.unit_cost::numeric(20, 8),
      v_item.id,
      v_item.batch_number,
      v_item.lot_number,
      v_item.serial_number,
      v_item.manufacturing_date,
      v_item.expiry_date,
      v_item.notes,
      now()
    );


    /* -----------------------------------------------------
     * Lock existing warehouse stock balance
     * ----------------------------------------------------- */

    select
      quantity_on_hand,
      average_unit_cost
    into
      v_current_quantity,
      v_current_average_cost
    from public.warehouse_stock
    where warehouse_id = v_goods_receipt.warehouse_id
      and product_id = v_item.product_id
    for update;


    /* -----------------------------------------------------
     * Create stock balance when this product does not yet
     * exist in the warehouse.
     * ----------------------------------------------------- */

    if not found then
      insert into public.warehouse_stock (
        warehouse_id,
        product_id,
        quantity_on_hand,
        quantity_reserved,
        average_unit_cost,
        last_transaction_at,
        created_at,
        updated_at
      )
      values (
        v_goods_receipt.warehouse_id,
        v_item.product_id,
        v_effective_accepted_quantity,
        0,
        v_item.unit_cost,
        now(),
        now(),
        now()
      );

    else
      /* ---------------------------------------------------
       * Weighted average costing
       *
       * Existing stock value + received stock value
       * divided by new total quantity.
       * --------------------------------------------------- */

      v_new_quantity :=
        v_current_quantity
        + v_effective_accepted_quantity;

      if v_new_quantity > 0 then
        v_new_average_cost :=
          (
            (
              v_current_quantity
              * v_current_average_cost
            )
            +
            (
              v_effective_accepted_quantity
              * v_item.unit_cost
            )
          )
          / v_new_quantity;
      else
        v_new_average_cost := 0;
      end if;

      update public.warehouse_stock
      set
        quantity_on_hand = v_new_quantity,
        average_unit_cost = v_new_average_cost,
        last_transaction_at = now(),
        updated_at = now()
      where warehouse_id = v_goods_receipt.warehouse_id
        and product_id = v_item.product_id;
    end if;
  end loop;


  /* =======================================================
   * Update Purchase Order received quantities
   * ======================================================= */

  update public.purchase_order_items poi
  set
    received_quantity =
      poi.received_quantity
      + gri.accepted_quantity,
    updated_at = now()
  from public.goods_receipt_items gri
  where gri.goods_receipt_id = p_goods_receipt_id
    and gri.purchase_order_item_id = poi.id
    and gri.accepted_quantity > 0;


  /* =======================================================
   * Determine whether every Purchase Order item is complete
   * ======================================================= */

  select coalesce(
    bool_and(
      received_quantity >= ordered_quantity
    ),
    false
  )
  into v_all_po_items_received
  from public.purchase_order_items
  where purchase_order_id =
    v_goods_receipt.purchase_order_id;


  /* =======================================================
   * Update Purchase Order status
   * ======================================================= */

  if v_all_po_items_received then
    update public.purchase_orders
    set
      status = 'received',
      updated_at = now(),
      updated_by = v_user_id
    where id = v_goods_receipt.purchase_order_id;
  else
    update public.purchase_orders
    set
      status = 'partially_received',
      updated_at = now(),
      updated_by = v_user_id
    where id = v_goods_receipt.purchase_order_id;
  end if;


  /* =======================================================
   * Complete Goods Receipt
   * ======================================================= */

  update public.goods_receipts
  set
    status = 'completed',
    received_date = coalesce(
      received_date,
      current_date
    ),
    received_at = coalesce(
      received_at,
      now()
    ),
    completed_at = now(),
    received_by = coalesce(
      received_by,
      v_user_id
    ),
    completed_by = v_user_id,
    updated_at = now()
  where id = p_goods_receipt_id;


  return v_inventory_transaction_id;
end;

$$;

/* =========================================================
 * 5. Local Purchase - 8dp Inventory Valuation
 * ========================================================= */

create or replace function
  public.post_local_purchase_inventory(
    p_warehouse_id uuid,
    p_transaction_date date,
    p_supplier_id uuid,
    p_store_name text,
    p_receipt_number text,
    p_payment_method text,
    p_internal_notes text,
    p_items jsonb
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
  v_transaction_number text;

  v_user_id uuid;

  v_item jsonb;

  v_product_id uuid;
  v_quantity numeric(18, 4);
  v_unit_cost numeric(18, 4);

  v_current_quantity numeric(18, 4);
  v_current_average_cost numeric(20, 8);

  v_new_quantity numeric(18, 4);
  v_new_average_cost numeric(20, 8);

  v_line_number integer := 0;

  v_description text;

begin

  /* =======================================================
   * Security
   * ======================================================= */

  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'You are not authorized to post inventory transactions.';
  end if;


  /* =======================================================
   * Warehouse
   * ======================================================= */

  perform 1
  from public.warehouses
  where id = p_warehouse_id
    and is_active = true
  for update;


  if not found then
    raise exception
      'The selected warehouse was not found or is inactive.';
  end if;


  /* =======================================================
   * Optional Supplier
   *
   * IMPORTANT:
   *
   * Supplier is validated here, but it is NOT used as the
   * unique posting identity of the inventory transaction.
   *
   * Multiple purchases from the same supplier are valid.
   * ======================================================= */

  if p_supplier_id is not null then

    perform 1
    from public.suppliers
    where id = p_supplier_id;


    if not found then
      raise exception
        'The selected supplier was not found.';
    end if;

  end if;


  /* =======================================================
   * Validate Items
   * ======================================================= */

  if
    p_items is null
    or jsonb_typeof(
      p_items
    ) <> 'array'
    or jsonb_array_length(
      p_items
    ) = 0
  then
    raise exception
      'At least one product is required.';
  end if;


  /*
   * The same product cannot appear more than once in a
   * single local-purchase posting.
   */

  if (
    select count(*)
    from jsonb_array_elements(
      p_items
    )
  ) <> (
    select count(
      distinct
        item ->> 'product_id'
    )
    from jsonb_array_elements(
      p_items
    ) as item
  ) then
    raise exception
      'The same product cannot appear more than once.';
  end if;


  /* =======================================================
   * Transaction Number
   * ======================================================= */

  v_transaction_number :=
    'INV-'
    ||
    to_char(
      current_date,
      'YYYY'
    )
    ||
    '-'
    ||
    lpad(
      nextval(
        'public.inventory_transaction_number_seq'
      )::text,
      6,
      '0'
    );


  /* =======================================================
   * Description
   * ======================================================= */

  v_description :=
    case
      when nullif(
        trim(
          coalesce(
            p_store_name,
            ''
          )
        ),
        ''
      ) is not null

      then
        'Local Purchase - '
        ||
        trim(
          p_store_name
        )

      else
        'Local Purchase'
    end;


  /* =======================================================
   * Transaction Header
   *
   * FIX IN MIGRATION 067:
   *
   * reference_type = NULL
   * reference_id   = NULL
   *
   * Supplier is NOT a unique source document.
   *
   * reference_number continues to hold an optional supplier
   * receipt / shop receipt reference.
   * ======================================================= */

  insert into public.inventory_transactions (
    transaction_number,
    transaction_type,
    status,
    transaction_date,

    warehouse_id,

    reference_type,
    reference_id,
    reference_number,

    description,
    internal_notes,

    posted_at,

    created_by,
    posted_by,

    created_at,
    updated_at
  )
  values (
    v_transaction_number,

    'local_purchase',

    'posted',

    coalesce(
      p_transaction_date,
      current_date
    ),

    p_warehouse_id,

    null,
    null,

    nullif(
      trim(
        coalesce(
          p_receipt_number,
          ''
        )
      ),
      ''
    ),

    v_description,

    nullif(
      trim(
        concat_ws(
          E'\n',

          case
            when nullif(
              trim(
                coalesce(
                  p_payment_method,
                  ''
                )
              ),
              ''
            ) is not null
            then
              'Payment: '
              ||
              trim(
                p_payment_method
              )
          end,

          nullif(
            trim(
              coalesce(
                p_internal_notes,
                ''
              )
            ),
            ''
          )
        )
      ),
      ''
    ),

    now(),

    v_user_id,
    v_user_id,

    now(),
    now()
  )
  returning
    id
  into
    v_transaction_id;


  /* =======================================================
   * Process Products
   * ======================================================= */

  for v_item in
    select value
    from jsonb_array_elements(
      p_items
    )
  loop

    v_line_number :=
      v_line_number + 1;


    /* -----------------------------------------------------
     * Product
     * ----------------------------------------------------- */

    v_product_id :=
      nullif(
        v_item ->> 'product_id',
        ''
      )::uuid;


    /* -----------------------------------------------------
     * Quantity
     * ----------------------------------------------------- */

    v_quantity :=
      coalesce(
        nullif(
          v_item ->> 'quantity',
          ''
        )::numeric,
        0
      );


    /* -----------------------------------------------------
     * Unit Cost
     * ----------------------------------------------------- */

    v_unit_cost :=
      coalesce(
        nullif(
          v_item ->> 'unit_cost',
          ''
        )::numeric,
        -1
      );


    /* -----------------------------------------------------
     * Validate Product
     * ----------------------------------------------------- */

    if v_product_id is null then
      raise exception
        'Local purchase line % does not contain a valid product.',
        v_line_number;
    end if;


    perform 1
    from public.products
    where
      id = v_product_id
      and coalesce(
        fulfilment_method,
        'stock'
      ) <> 'service';


    if not found then
      raise exception
        'Local purchase line % contains an invalid or non-stock product.',
        v_line_number;
    end if;


    /* -----------------------------------------------------
     * Validate Quantity
     * ----------------------------------------------------- */

    if v_quantity <= 0 then
      raise exception
        'Local purchase line % requires a quantity greater than zero.',
        v_line_number;
    end if;


    /* -----------------------------------------------------
     * Validate Cost
     * ----------------------------------------------------- */

    if v_unit_cost < 0 then
      raise exception
        'Local purchase line % requires a valid unit cost.',
        v_line_number;
    end if;


    /* =====================================================
     * Lock Existing Stock
     * ===================================================== */

    select
      quantity_on_hand,
      average_unit_cost

    into
      v_current_quantity,
      v_current_average_cost

    from public.warehouse_stock

    where
      warehouse_id =
        p_warehouse_id

      and product_id =
        v_product_id

    for update;


    /* =====================================================
     * First Stock in this Warehouse
     * ===================================================== */

    if not found then

      insert into public.warehouse_stock (
        warehouse_id,
        product_id,

        quantity_on_hand,
        quantity_reserved,

        average_unit_cost,

        last_transaction_at,

        created_at,
        updated_at
      )
      values (
        p_warehouse_id,
        v_product_id,

        v_quantity,
        0,

        v_unit_cost,

        now(),

        now(),
        now()
      );


    /* =====================================================
     * Existing Stock â€” Weighted Average Cost
     * ===================================================== */

    else

      v_new_quantity :=
        v_current_quantity
        +
        v_quantity;


      v_new_average_cost :=
        case
          when v_new_quantity > 0
          then
            (
              (
                v_current_quantity
                *
                v_current_average_cost
              )
              +
              (
                v_quantity
                *
                v_unit_cost
              )
            )
            /
            v_new_quantity

          else
            0
        end;


      update public.warehouse_stock

      set
        quantity_on_hand =
          v_new_quantity,

        average_unit_cost =
          v_new_average_cost,

        last_transaction_at =
          now(),

        updated_at =
          now()

      where
        warehouse_id =
          p_warehouse_id

        and product_id =
          v_product_id;

    end if;


    /* =====================================================
     * Inventory Transaction Line
     * ===================================================== */

    insert into
      public.inventory_transaction_items (
        inventory_transaction_id,

        warehouse_id,
        product_id,

        line_number,

        quantity_change,
        unit_cost,
        valuation_unit_cost,

        notes,

        created_at
      )
    values (
      v_transaction_id,

      p_warehouse_id,
      v_product_id,

      v_line_number,

      v_quantity,
      v_unit_cost,
      v_unit_cost::numeric(20, 8),

      nullif(
        trim(
          coalesce(
            v_item ->> 'notes',
            ''
          )
        ),
        ''
      ),

      now()
    );

  end loop;


  /* =======================================================
   * Return Inventory Transaction
   * ======================================================= */

  return
    v_transaction_id;

end;
$$;

/* =========================================================
 * 6. Manual Inventory - 8dp Inventory Valuation
 * ========================================================= */

create or replace function
  public.post_manual_inventory_transaction(
    p_transaction_type text,
    p_warehouse_id uuid,
    p_transaction_date date,
    p_reference_number text,
    p_description text,
    p_internal_notes text,
    p_items jsonb
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
  v_transaction_number text;

  v_user_id uuid;

  v_item jsonb;

  v_product_id uuid;
  v_quantity numeric(18, 4);
  v_supplied_unit_cost numeric(18, 4);
  v_effective_unit_cost numeric(20, 8);

  v_current_on_hand numeric(18, 4);
  v_current_reserved numeric(18, 4);
  v_current_average_cost numeric(20, 8);

  v_new_on_hand numeric(18, 4);
  v_new_average_cost numeric(20, 8);

  v_quantity_change numeric(18, 4);

  v_line_number integer := 0;
  v_posted_line_count integer := 0;

  v_stock_found boolean;

  v_reference_type text;
begin
  /*
   * =========================================================
   * Security
   * =========================================================
   */

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'You are not authorized to post inventory transactions.';
  end if;


  /*
   * =========================================================
   * Transaction Type Validation
   * =========================================================
   */

  if p_transaction_type not in (
    'opening_balance',
    'adjustment_in',
    'adjustment_out',
    'stock_count'
  ) then
    raise exception
      'Unsupported manual inventory transaction type: %.',
      p_transaction_type;
  end if;


  /*
   * =========================================================
   * Validate Warehouse
   *
   * Locking the warehouse also serializes manual inventory
   * operations for this warehouse and prevents races when a
   * warehouse_stock row does not yet exist.
   * =========================================================
   */

  perform 1
  from public.warehouses
  where id = p_warehouse_id
    and is_active = true
  for update;

  if not found then
    raise exception
      'The selected warehouse was not found or is inactive.';
  end if;


  /*
   * =========================================================
   * Validate Items Payload
   * =========================================================
   */

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
  then
    raise exception
      'At least one inventory item is required.';
  end if;


  /*
   * Prevent the same product from appearing more than once.
   */

  if (
    select count(*)
    from jsonb_array_elements(p_items)
  ) <> (
    select count(
      distinct item ->> 'product_id'
    )
    from jsonb_array_elements(p_items)
      as item
  ) then
    raise exception
      'The same product cannot appear more than once in an inventory transaction.';
  end if;


  /*
   * =========================================================
   * Generate Transaction Number
   * =========================================================
   */

  v_transaction_number :=
    'INV-'
    || to_char(
      current_date,
      'YYYY'
    )
    || '-'
    || lpad(
      nextval(
        'public.inventory_transaction_number_seq'
      )::text,
      6,
      '0'
    );


  /*
   * =========================================================
   * Reference Type
   * =========================================================
   */

  v_reference_type := null;


  /*
   * =========================================================
   * Create Posted Transaction Header
   * =========================================================
   */

  insert into public.inventory_transactions (
    transaction_number,
    transaction_type,
    status,
    transaction_date,

    warehouse_id,

    reference_type,
    reference_number,

    description,
    internal_notes,

    posted_at,

    created_by,
    posted_by,

    created_at,
    updated_at
  )
  values (
    v_transaction_number,
    p_transaction_type,
    'posted',

    coalesce(
      p_transaction_date,
      current_date
    ),

    p_warehouse_id,

    v_reference_type,

    nullif(
      trim(
        coalesce(
          p_reference_number,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_description,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_internal_notes,
          ''
        )
      ),
      ''
    ),

    now(),

    v_user_id,
    v_user_id,

    now(),
    now()
  )
  returning id
  into v_transaction_id;


  /*
   * =========================================================
   * Process Items
   * =========================================================
   */

  for v_item in
    select value
    from jsonb_array_elements(
      p_items
    )
  loop
    v_line_number :=
      v_line_number + 1;


    /*
     * ---------------------------------------------------------
     * Parse Item
     * ---------------------------------------------------------
     */

    v_product_id :=
      nullif(
        v_item ->> 'product_id',
        ''
      )::uuid;

    v_quantity :=
      coalesce(
        nullif(
          v_item ->> 'quantity',
          ''
        )::numeric,
        0
      );

    v_supplied_unit_cost :=
      case
        when
          v_item ? 'unit_cost'
          and nullif(
            v_item ->> 'unit_cost',
            ''
          ) is not null
        then
          (
            v_item ->> 'unit_cost'
          )::numeric

        else null
      end;


    /*
     * ---------------------------------------------------------
     * Validate Product
     * ---------------------------------------------------------
     */

    if v_product_id is null then
      raise exception
        'Inventory line % does not contain a valid product.',
        v_line_number;
    end if;

    perform 1
    from public.products
    where id = v_product_id
      and coalesce(
        fulfilment_method,
        'stock'
      ) <> 'service';

    if not found then
      raise exception
        'Inventory line % contains an invalid or non-stock product.',
        v_line_number;
    end if;


    /*
     * ---------------------------------------------------------
     * Quantity Validation
     * ---------------------------------------------------------
     */

    if v_quantity < 0 then
      raise exception
        'Inventory line % cannot contain a negative quantity.',
        v_line_number;
    end if;

    if p_transaction_type <> 'stock_count'
       and v_quantity <= 0
    then
      raise exception
        'Inventory line % requires a quantity greater than zero.',
        v_line_number;
    end if;


    /*
     * Opening Balance and Adjustment In need a known cost.
     *
     * Zero is allowed because samples / free stock can
     * legitimately have zero acquisition cost.
     * ---------------------------------------------------------
     */

    if p_transaction_type in (
      'opening_balance',
      'adjustment_in'
    )
    and v_supplied_unit_cost is null
    then
      raise exception
        'Inventory line % requires a unit cost.',
        v_line_number;
    end if;

    if v_supplied_unit_cost is not null
       and v_supplied_unit_cost < 0
    then
      raise exception
        'Inventory line % cannot contain a negative unit cost.',
        v_line_number;
    end if;


    /*
     * ---------------------------------------------------------
     * Lock Current Warehouse Stock
     * ---------------------------------------------------------
     */

    select
      quantity_on_hand,
      quantity_reserved,
      average_unit_cost

    into
      v_current_on_hand,
      v_current_reserved,
      v_current_average_cost

    from public.warehouse_stock

    where warehouse_id =
      p_warehouse_id

      and product_id =
        v_product_id

    for update;

    v_stock_found := found;


    if not v_stock_found then
      v_current_on_hand := 0;
      v_current_reserved := 0;
      v_current_average_cost := 0;
    end if;


    /*
     * =========================================================
     * Opening Balance
     * =========================================================
     */

    if p_transaction_type =
      'opening_balance'
    then

      /*
       * Opening balance must not be used as a normal receipt.
       * If any posted inventory history already exists for this
       * product / warehouse, use Adjustment or Receive Stock.
       */

      if exists (
        select 1

        from public.inventory_transaction_items
          transaction_item

        inner join public.inventory_transactions
          transaction_header
          on transaction_header.id =
            transaction_item.inventory_transaction_id

        where
          transaction_item.product_id =
            v_product_id

          and transaction_item.warehouse_id =
            p_warehouse_id

          and transaction_header.status =
            'posted'
      ) then
        raise exception
          'Opening stock already has inventory history for line %. Use a stock adjustment or receipt instead.',
          v_line_number;
      end if;


      if v_current_on_hand <> 0
         or v_current_reserved <> 0
      then
        raise exception
          'Opening stock can only be posted when current stock and reserved stock are zero for line %.',
          v_line_number;
      end if;


      v_quantity_change :=
        v_quantity;

      v_effective_unit_cost :=
        v_supplied_unit_cost;

      v_new_on_hand :=
        v_quantity;

      v_new_average_cost :=
        v_supplied_unit_cost;


    /*
     * =========================================================
     * Adjustment In
     * =========================================================
     */

    elsif p_transaction_type =
      'adjustment_in'
    then

      v_quantity_change :=
        v_quantity;

      v_effective_unit_cost :=
        v_supplied_unit_cost;

      v_new_on_hand :=
        v_current_on_hand
        + v_quantity;


      /*
       * Weighted average cost.
       */

      if v_new_on_hand > 0 then

        v_new_average_cost :=
          (
            (
              v_current_on_hand
              * v_current_average_cost
            )
            +
            (
              v_quantity
              * v_effective_unit_cost
            )
          )
          / v_new_on_hand;

      else
        v_new_average_cost := 0;
      end if;


    /*
     * =========================================================
     * Adjustment Out
     * =========================================================
     */

    elsif p_transaction_type =
      'adjustment_out'
    then

      if not v_stock_found then
        raise exception
          'Inventory line % has no warehouse stock to reduce.',
          v_line_number;
      end if;

      v_new_on_hand :=
        v_current_on_hand
        - v_quantity;


      if v_new_on_hand < 0 then
        raise exception
          'Inventory line % would make warehouse stock negative.',
          v_line_number;
      end if;


      /*
       * Reserved stock must always remain physically possible.
       */

      if v_new_on_hand <
        v_current_reserved
      then
        raise exception
          'Inventory line % cannot reduce stock below the reserved quantity.',
          v_line_number;
      end if;


      v_quantity_change :=
        -v_quantity;

      v_effective_unit_cost :=
        v_current_average_cost;

      v_new_average_cost :=
        v_current_average_cost;


    /*
     * =========================================================
     * Stock Count
     *
     * quantity means ACTUAL PHYSICAL COUNT.
     * HM ERP calculates the difference automatically.
     * =========================================================
     */

    elsif p_transaction_type =
      'stock_count'
    then

      v_new_on_hand :=
        v_quantity;

      v_quantity_change :=
        v_new_on_hand
        - v_current_on_hand;


      if v_new_on_hand <
        v_current_reserved
      then
        raise exception
          'Physical count on line % is below the quantity currently reserved.',
          v_line_number;
      end if;


      /*
       * If physical count increased from zero, a cost is needed.
       */

      if v_quantity_change > 0
         and v_current_on_hand = 0
         and v_supplied_unit_cost is null
      then
        raise exception
          'Inventory line % requires a unit cost because the physical count introduces stock with no previous valuation.',
          v_line_number;
      end if;


      if v_quantity_change > 0 then

        v_effective_unit_cost :=
          coalesce(
            v_supplied_unit_cost,
            v_current_average_cost
          );


        v_new_average_cost :=
          case

            when v_new_on_hand > 0
            then
              (
                (
                  v_current_on_hand
                  * v_current_average_cost
                )
                +
                (
                  v_quantity_change
                  * v_effective_unit_cost
                )
              )
              / v_new_on_hand

            else 0

          end;

      else

        v_effective_unit_cost :=
          v_current_average_cost;

        v_new_average_cost :=
          v_current_average_cost;

      end if;

    end if;


    /*
     * ---------------------------------------------------------
     * Stock Count: skip lines with no difference
     * ---------------------------------------------------------
     */

    if v_quantity_change = 0 then
      continue;
    end if;


    /*
     * ---------------------------------------------------------
     * Create Inventory Transaction Item
     * ---------------------------------------------------------
     */

    insert into public.inventory_transaction_items (
      inventory_transaction_id,
      warehouse_id,
      product_id,
      line_number,

      quantity_change,
      unit_cost,
      valuation_unit_cost,

      notes,
      created_at
    )
    values (
      v_transaction_id,
      p_warehouse_id,
      v_product_id,
      v_line_number,

      v_quantity_change,
      v_effective_unit_cost,
      v_effective_unit_cost,

      nullif(
        trim(
          coalesce(
            v_item ->> 'notes',
            ''
          )
        ),
        ''
      ),

      now()
    );


    /*
     * ---------------------------------------------------------
     * Create Warehouse Stock Balance
     * ---------------------------------------------------------
     */

    if not v_stock_found then

      insert into public.warehouse_stock (
        warehouse_id,
        product_id,

        quantity_on_hand,
        quantity_reserved,

        average_unit_cost,

        last_transaction_at,
        last_counted_at,

        created_at,
        updated_at
      )
      values (
        p_warehouse_id,
        v_product_id,

        v_new_on_hand,
        0,

        v_new_average_cost,

        now(),

        case
          when p_transaction_type =
            'stock_count'
          then now()
          else null
        end,

        now(),
        now()
      );


    /*
     * ---------------------------------------------------------
     * Update Existing Warehouse Stock
     * ---------------------------------------------------------
     */

    else

      update public.warehouse_stock
      set
        quantity_on_hand =
          v_new_on_hand,

        average_unit_cost =
          v_new_average_cost,

        last_transaction_at =
          now(),

        last_counted_at =
          case
            when p_transaction_type =
              'stock_count'
            then now()
            else last_counted_at
          end,

        updated_at =
          now()

      where warehouse_id =
        p_warehouse_id

        and product_id =
          v_product_id;

    end if;


    v_posted_line_count :=
      v_posted_line_count + 1;

  end loop;


  /*
   * =========================================================
   * Prevent Empty Stock Count Transactions
   * =========================================================
   */

  if v_posted_line_count = 0 then

    raise exception
      'No stock difference was found. Nothing needs to be posted.';

  end if;


  return v_transaction_id;
end;
$$;


/*
 * =========================================================
 * Permissions
 * =========================================================
 */

/* =========================================================
 * 7. Delivery Dispatch / Sales Issue - 8dp Inventory Valuation
 * ========================================================= */

create or replace function
  public.dispatch_delivery_order_atomic(
    p_delivery_order_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.delivery_orders%rowtype;
  v_sales_order public.sales_orders%rowtype;
  v_delivery_item public.delivery_order_items%rowtype;
  v_sales_item public.sales_order_items%rowtype;
  v_stock public.warehouse_stock%rowtype;

  v_inventory_transaction_id uuid;
  v_transaction_number text;

  v_dispatch_quantity numeric(18, 4);
  v_new_on_hand numeric(18, 4);
  v_new_reserved numeric(18, 4);

  v_line_count integer := 0;
  v_total_dispatched numeric(18, 4) := 0;

  v_fulfilment_status text;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  /* -------------------------------------------------------
   * Lock Delivery Order
   * ------------------------------------------------------- */

  select *
  into v_delivery
  from public.delivery_orders
  where id = p_delivery_order_id
  for update;

  if not found then
    raise exception
      'Delivery order was not found.';
  end if;

  if v_delivery.status = 'dispatched' then
    select id
    into v_inventory_transaction_id
    from public.inventory_transactions
    where transaction_type =
      'sales_issue'
      and reference_type =
        'delivery_order'
      and reference_id =
        p_delivery_order_id
      and status = 'posted'
    limit 1;

    return jsonb_build_object(
      'deliveryOrderId',
        p_delivery_order_id,

      'status',
        'dispatched',

      'inventoryTransactionId',
        v_inventory_transaction_id,

      'lineCount',
        0,

      'dispatchedQuantity',
        0,

      'alreadyDispatched',
        true
    );
  end if;

  if v_delivery.status <> 'packed' then
    raise exception
      'Only packed delivery orders can be dispatched.';
  end if;

  /* -------------------------------------------------------
   * Lock Sales Order
   * ------------------------------------------------------- */

  select *
  into v_sales_order
  from public.sales_orders
  where id = v_delivery.sales_order_id
  for update;

  if not found then
    raise exception
      'The linked sales order was not found.';
  end if;

  if v_sales_order.status not in (
    'confirmed',
    'processing',
    'partially_fulfilled'
  ) then
    raise exception
      'The linked sales order cannot be dispatched in its current status.';
  end if;

  /* -------------------------------------------------------
   * Validate Delivery Items
   * ------------------------------------------------------- */

  if not exists (
    select 1
    from public.delivery_order_items
    where delivery_order_id =
      p_delivery_order_id
  ) then
    raise exception
      'The delivery order does not contain any items.';
  end if;

  if exists (
    select 1
    from public.delivery_order_items
    where delivery_order_id =
      p_delivery_order_id
      and (
        packed_quantity <= 0
        or packed_quantity >
          picked_quantity
        or packed_quantity >
          delivery_quantity
      )
  ) then
    raise exception
      'One or more delivery lines contain invalid packed quantities.';
  end if;

  /*
   * Prevent duplicate inventory posting.
   */
  if exists (
    select 1
    from public.inventory_transactions
    where transaction_type =
      'sales_issue'
      and reference_type =
        'delivery_order'
      and reference_id =
        p_delivery_order_id
      and status = 'posted'
  ) then
    raise exception
      'Inventory has already been posted for this delivery order.';
  end if;

  /* -------------------------------------------------------
   * Generate Inventory Transaction
   * ------------------------------------------------------- */

  v_transaction_number :=
    'INV-'
    || to_char(
      current_date,
      'YYYY'
    )
    || '-'
    || lpad(
      nextval(
        'public.inventory_transaction_number_seq'
      )::text,
      6,
      '0'
    );

  insert into public.inventory_transactions (
    transaction_number,
    transaction_type,
    status,
    transaction_date,

    warehouse_id,

    reference_type,
    reference_id,
    reference_number,

    description,
    internal_notes,

    posted_at,

    created_by,
    posted_by,

    created_at,
    updated_at
  )
  values (
    v_transaction_number,
    'sales_issue',
    'posted',
    current_date,

    v_delivery.warehouse_id,

    'delivery_order',
    v_delivery.id,
    v_delivery.delivery_number,

    'Delivery dispatch '
      || v_delivery.delivery_number,

    v_delivery.internal_notes,

    now(),

    v_user_id,
    v_user_id,

    now(),
    now()
  )
  returning id
  into v_inventory_transaction_id;

  /* -------------------------------------------------------
   * Process Every Delivery Line
   * ------------------------------------------------------- */

  for v_delivery_item in
    select *
    from public.delivery_order_items
    where delivery_order_id =
      p_delivery_order_id
    order by line_number
    for update
  loop
    v_dispatch_quantity :=
      v_delivery_item.packed_quantity;

    if v_dispatch_quantity <= 0 then
      raise exception
        'Delivery line % has no quantity to dispatch.',
        v_delivery_item.line_number;
    end if;

    if v_delivery_item.product_id is null then
      raise exception
        'Delivery line % must have a linked product.',
        v_delivery_item.line_number;
    end if;

    /*
     * Lock the linked Sales Order item.
     */
    select *
    into v_sales_item
    from public.sales_order_items
    where id =
      v_delivery_item.sales_order_item_id
      and sales_order_id =
        v_sales_order.id
    for update;

    if not found then
      raise exception
        'The Sales Order line linked to delivery line % was not found.',
        v_delivery_item.line_number;
    end if;

    if (
      v_sales_item.quantity_fulfilled
      + v_dispatch_quantity
      > v_sales_item.quantity
    ) then
      raise exception
        'Dispatch quantity exceeds the remaining Sales Order quantity for line %.',
        v_delivery_item.line_number;
    end if;

    if (
      v_sales_item.quantity_reserved
      < v_dispatch_quantity
    ) then
      raise exception
        'Reserved quantity is insufficient for delivery line %.',
        v_delivery_item.line_number;
    end if;

    /*
     * Lock warehouse stock.
     */
    select *
    into v_stock
    from public.warehouse_stock
    where product_id =
      v_delivery_item.product_id
      and warehouse_id =
        v_delivery_item.warehouse_id
    for update;

    if not found then
      raise exception
        'Warehouse stock was not found for delivery line %.',
        v_delivery_item.line_number;
    end if;

    if v_stock.quantity_on_hand <
      v_dispatch_quantity
    then
      raise exception
        'Insufficient on-hand stock for delivery line %.',
        v_delivery_item.line_number;
    end if;

    if v_stock.quantity_reserved <
      v_dispatch_quantity
    then
      raise exception
        'Insufficient warehouse reservation for delivery line %.',
        v_delivery_item.line_number;
    end if;

    v_new_on_hand :=
      v_stock.quantity_on_hand
      - v_dispatch_quantity;

    v_new_reserved :=
      greatest(
        v_stock.quantity_reserved
        - v_dispatch_quantity,
        0
      );

    /*
     * Record negative inventory movement.
     */
    insert into public.inventory_transaction_items (
      inventory_transaction_id,
      warehouse_id,
      product_id,
      line_number,

      quantity_change,
      unit_cost,
      valuation_unit_cost,

      source_document_item_id,

      batch_number,
      lot_number,
      serial_number,

      manufacturing_date,
      expiry_date,

      notes,
      created_at
    )
    values (
      v_inventory_transaction_id,
      v_delivery_item.warehouse_id,
      v_delivery_item.product_id,
      v_delivery_item.line_number,

      -v_dispatch_quantity,
      v_stock.average_unit_cost,
      v_stock.average_unit_cost,

      v_delivery_item.id,

      v_delivery_item.batch_number,
      v_delivery_item.lot_number,
      v_delivery_item.serial_number,

      v_delivery_item.manufacturing_date,
      v_delivery_item.expiry_date,

      v_delivery_item.line_notes,
      now()
    );

    /*
     * quantity_available is generated automatically.
     * Never update it directly.
     */
    update public.warehouse_stock
    set
      quantity_on_hand =
        v_new_on_hand,

      quantity_reserved =
        v_new_reserved,

      last_transaction_at =
        now(),

      updated_at =
        now()
    where id = v_stock.id;

    /*
     * Reduce remaining reservation and increase
     * fulfilled quantity on the Sales Order line.
     */
    update public.sales_order_items
    set
      quantity_reserved =
        greatest(
          quantity_reserved
          - v_dispatch_quantity,
          0
        ),

      quantity_allocated =
        greatest(
          quantity_allocated
          - v_dispatch_quantity,
          0
        ),

      quantity_fulfilled =
        quantity_fulfilled
        + v_dispatch_quantity,

      updated_at =
        now()
    where id = v_sales_item.id;

    update public.delivery_order_items
    set
      dispatched_quantity =
        v_dispatch_quantity,

      updated_at =
        now()
    where id = v_delivery_item.id;

    v_line_count :=
      v_line_count + 1;

    v_total_dispatched :=
      v_total_dispatched
      + v_dispatch_quantity;
  end loop;

  /* -------------------------------------------------------
   * Update Delivery Header
   * ------------------------------------------------------- */

  update public.delivery_orders
  set
    status = 'dispatched',

    dispatched_date =
      coalesce(
        dispatched_date,
        current_date
      ),

    dispatched_at =
      now(),

    dispatched_by =
      v_user_id,

    updated_at =
      now(),

    updated_by =
      v_user_id
  where id = p_delivery_order_id;

  /* -------------------------------------------------------
   * Synchronize Sales Order
   * ------------------------------------------------------- */

  v_fulfilment_status :=
    public.synchronize_sales_order_fulfilment(
      v_sales_order.id
    );

  return jsonb_build_object(
    'deliveryOrderId',
      p_delivery_order_id,

    'salesOrderId',
      v_sales_order.id,

    'status',
      'dispatched',

    'fulfilmentStatus',
      v_fulfilment_status,

    'inventoryTransactionId',
      v_inventory_transaction_id,

    'inventoryTransactionNumber',
      v_transaction_number,

    'lineCount',
      v_line_count,

    'dispatchedQuantity',
      v_total_dispatched,

    'alreadyDispatched',
      false
  );
end;
$$;


/* =========================================================
 * Function Permissions
 * ========================================================= */

revoke all
on function
  public.create_delivery_from_sales_order(
    uuid
  )
from public;

revoke all
on function
  public.start_delivery_picking(
    uuid
  )
from public;

revoke all
on function
  public.confirm_delivery_picked(
    uuid
  )
from public;

revoke all
on function
  public.start_delivery_packing(
    uuid
  )
from public;

revoke all
on function
  public.confirm_delivery_packed(
    uuid
  )
from public;

/* =========================================================
 * 8. Inventory COGS GL - Precise 8dp Valuation Source
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
        abs(v_item.quantity_change)
        *
        coalesce(
          v_item.valuation_unit_cost,
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
 * 9. Sales Return - Historical 8dp Inventory Valuation
 * ========================================================= */

alter table public.sales_return_items
  add column original_valuation_unit_cost numeric(20, 8);

select set_config(
  'app.sales_return_internal_write',
  'on',
  true
);

update public.sales_return_items
set original_valuation_unit_cost = original_unit_cost
where original_valuation_unit_cost is null;

select set_config(
  'app.sales_return_internal_write',
  'off',
  true
);

alter table public.sales_return_items
  alter column original_valuation_unit_cost
  set not null;

alter table public.sales_return_items
  add constraint sales_return_items_original_valuation_cost_nonnegative
  check (original_valuation_unit_cost >= 0);

comment on column public.sales_return_items.original_valuation_unit_cost is
  'Authoritative high-precision historical inventory valuation cost resolved from the original posted sales_issue inventory transaction item.';

/* =========================================================
 * 10. Sales Return Creation - Preserve 8dp Historical Cost
 * ========================================================= */

create or replace function
  public.create_sales_return(
    p_sales_order_id uuid,
    p_return_date date,
    p_posting_date date,
    p_reason text,
    p_items jsonb,
    p_notes text
      default null
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_order
    public.sales_orders%rowtype;

  v_sales_item
    public.sales_order_items%rowtype;

  v_delivery_item
    public.delivery_order_items%rowtype;

  v_inventory_item
    public.inventory_transaction_items%rowtype;

  v_return_id uuid;

  v_return_number text;

  v_item jsonb;

  v_sales_order_item_id uuid;

  v_delivery_order_item_id uuid;

  v_quantity_returned numeric(18, 4);

  v_condition text;

  v_line_reason text;

  v_line_notes text;

  v_original_issue_quantity numeric(18, 4);

  v_already_returned numeric(18, 4);

  v_remaining_returnable numeric(18, 4);

  v_quantity_ratio numeric;

  v_line_subtotal numeric(18, 2);

  v_discount_amount numeric(18, 2);

  v_line_net numeric(18, 2);

  v_tax_amount numeric(18, 2);

  v_line_total numeric(18, 2);

  v_line_number integer := 0;

  v_header_subtotal numeric(18, 2) := 0;

  v_header_discount numeric(18, 2) := 0;

  v_header_net numeric(18, 2) := 0;

  v_header_tax numeric(18, 2) := 0;

  v_header_total numeric(18, 2) := 0;

begin

  /* =======================================================
   * Authentication / Authorization
   * ======================================================= */

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
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
   * Basic Input Validation
   * ======================================================= */

  if
    p_sales_order_id is null
  then
    raise exception
      'Sales Order is required.';
  end if;


  if
    p_return_date is null
  then
    raise exception
      'Return date is required.';
  end if;


  if
    p_posting_date is null
  then
    raise exception
      'Posting date is required.';
  end if;


  if
    length(
      trim(
        coalesce(
          p_reason,
          ''
        )
      )
    ) <
      3
  then
    raise exception
      'Sales Return reason must contain at least 3 characters.';
  end if;


  if
    p_items is null
    or
    jsonb_typeof(
      p_items
    ) <>
      'array'
    or
    jsonb_array_length(
      p_items
    ) =
      0
  then
    raise exception
      'Sales Return must contain at least one item.';
  end if;


  /*
   * Even though 119 does not post GL yet, we validate the
   * posting period now. This prevents creating a return whose
   * intended posting date is already prohibited.
   */
  perform
    public.get_gl_accounting_period(
      p_posting_date,
      true
    );


  /* =======================================================
   * Lock Original Sales Order
   * ======================================================= */

  select
    *
  into
    v_order
  from
    public.sales_orders
  where
    id =
      p_sales_order_id
  for update;


  if not found then
    raise exception
      'Sales Order was not found.';
  end if;


  /*
   * A cancelled order must never generate a return.
   *
   * Other eligible statuses are validated through actual
   * fulfilled / dispatched quantities below rather than
   * relying only on a header status.
   */
  if
    v_order.status =
      'cancelled'
  then
    raise exception
      'Cancelled Sales Order % cannot be returned.',
      v_order.order_number;
  end if;


  if
    v_order.customer_id is null
  then
    raise exception
      'Sales Order % does not have a customer.',
      v_order.order_number;
  end if;


  /* =======================================================
   * Create Draft Header
   * ======================================================= */

  v_return_number :=
    public.generate_sales_return_number(
      p_return_date
    );


  insert into
    public.sales_returns
    (
      return_number,

      sales_order_id,
      customer_id,

      return_date,
      posting_date,

      status,
      reason,
      notes,

      currency_code,
      exchange_rate,

      subtotal,
      discount_amount,
      net_amount,
      tax_amount,
      grand_total,

      created_by,
      updated_by,

      created_at,
      updated_at
    )
  values
    (
      v_return_number,

      v_order.id,
      v_order.customer_id,

      p_return_date,
      p_posting_date,

      'draft',
      trim(
        p_reason
      ),
      nullif(
        trim(
          coalesce(
            p_notes,
            ''
          )
        ),
        ''
      ),

      v_order.currency_code,
      v_order.exchange_rate,

      0,
      0,
      0,
      0,
      0,

      v_user_id,
      v_user_id,

      now(),
      now()
    )
  returning
    id
  into
    v_return_id;


  /* =======================================================
   * Process Return Lines
   * ======================================================= */

  for v_item in
    select
      value
    from
      jsonb_array_elements(
        p_items
      )
  loop

    v_line_number :=
      v_line_number
      +
      1;


    /* -----------------------------------------------------
     * Parse Item
     * ----------------------------------------------------- */

    begin

      v_sales_order_item_id :=
        nullif(
          trim(
            v_item
              ->>
              'salesOrderItemId'
          ),
          ''
        )::uuid;


      v_delivery_order_item_id :=
        nullif(
          trim(
            v_item
              ->>
              'deliveryOrderItemId'
          ),
          ''
        )::uuid;


      v_quantity_returned :=
        nullif(
          trim(
            v_item
              ->>
              'quantityReturned'
          ),
          ''
        )::numeric;

    exception
      when others then

        raise exception
          'Sales Return line % contains invalid identifiers or quantity.',
          v_line_number;

    end;


    v_condition :=
      lower(
        trim(
          coalesce(
            v_item
              ->>
              'condition',
            'resalable'
          )
        )
      );


    v_line_reason :=
      nullif(
        trim(
          coalesce(
            v_item
              ->>
              'reason',
            ''
          )
        ),
        ''
      );


    v_line_notes :=
      nullif(
        trim(
          coalesce(
            v_item
              ->>
              'notes',
            ''
          )
        ),
        ''
      );


    if
      v_sales_order_item_id is null
    then
      raise exception
        'Sales Return line % requires a Sales Order item.',
        v_line_number;
    end if;


    if
      v_delivery_order_item_id is null
    then
      raise exception
        'Sales Return line % requires a Delivery Order item.',
        v_line_number;
    end if;


    if
      v_quantity_returned is null
      or
      v_quantity_returned <=
        0
    then
      raise exception
        'Sales Return line % quantity must be greater than zero.',
        v_line_number;
    end if;


    if
      v_condition not in (
        'resalable',
        'damaged',
        'defective',
        'other'
      )
    then
      raise exception
        'Sales Return line % has invalid condition "%".',
        v_line_number,
        v_condition;
    end if;


    /* -----------------------------------------------------
     * Prevent Duplicate Delivery Lines In Same Return
     * ----------------------------------------------------- */

    if exists (
      select
        1
      from
        public.sales_return_items
      where
        sales_return_id =
          v_return_id
        and
        delivery_order_item_id =
          v_delivery_order_item_id
    )
    then
      raise exception
        'Delivery Order item % appears more than once in this Sales Return.',
        v_delivery_order_item_id;
    end if;


    /* -----------------------------------------------------
     * Lock Original Sales Order Item
     * ----------------------------------------------------- */

    select
      *
    into
      v_sales_item
    from
      public.sales_order_items
    where
      id =
        v_sales_order_item_id
      and
      sales_order_id =
        v_order.id
    for update;


    if not found then
      raise exception
        'Sales Return line % does not belong to Sales Order %.',
        v_line_number,
        v_order.order_number;
    end if;


    if
      v_sales_item.product_id is null
    then
      raise exception
        'Sales Order line % does not have a product and cannot be physically returned.',
        v_sales_item.line_number;
    end if;


    if
      coalesce(
        v_sales_item.quantity_fulfilled,
        0
      ) <=
        0
    then
      raise exception
        'Sales Order line % has no fulfilled quantity available for return.',
        v_sales_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Lock Original Delivery Item
     * ----------------------------------------------------- */

    select
      *
    into
      v_delivery_item
    from
      public.delivery_order_items
    where
      id =
        v_delivery_order_item_id
      and
      sales_order_item_id =
        v_sales_item.id
    for update;


    if not found then
      raise exception
        'Delivery Order item on Sales Return line % is not linked to the selected Sales Order item.',
        v_line_number;
    end if;


    if
      v_delivery_item.product_id is distinct from
        v_sales_item.product_id
    then
      raise exception
        'Product mismatch between Sales Order and Delivery Order on return line %.',
        v_line_number;
    end if;


    if
      v_delivery_item.warehouse_id is null
    then
      raise exception
        'Delivery Order item on return line % does not have a warehouse.',
        v_line_number;
    end if;


    /* -----------------------------------------------------
     * Resolve Original Posted Sales Issue
     *
     * Exact linkage:
     *
     * inventory transaction:
     *   transaction_type = sales_issue
     *   status           = posted
     *
     * inventory item:
     *   source_document_item_id =
     *     delivery_order_item.id
     *
     * The stored unit_cost is historical COGS truth.
     * ----------------------------------------------------- */

    select
      inventory_item.*
    into
      v_inventory_item
    from
      public.inventory_transaction_items inventory_item

    inner join
      public.inventory_transactions inventory_transaction
    on
      inventory_transaction.id =
        inventory_item.inventory_transaction_id

    where
      inventory_transaction.transaction_type =
        'sales_issue'

      and
      inventory_transaction.status =
        'posted'

      and
      inventory_item.source_document_item_id =
        v_delivery_item.id

      and
      inventory_item.product_id =
        v_sales_item.product_id

      and
      inventory_item.warehouse_id =
        v_delivery_item.warehouse_id

      and
      inventory_item.quantity_change <
        0

    order by
      inventory_transaction.posted_at desc nulls last,
      inventory_item.created_at desc

    limit
      1;


    if not found then
      raise exception
        'Original posted sales_issue inventory transaction was not found for return line %.',
        v_line_number;
    end if;


    v_original_issue_quantity :=
      abs(
        v_inventory_item.quantity_change
      );


    if
      v_original_issue_quantity <=
        0
    then
      raise exception
        'Original inventory issue quantity is invalid for return line %.',
        v_line_number;
    end if;


    /* -----------------------------------------------------
     * Cumulative Return Quantity
     *
     * Cancelled returns do not consume returnable quantity.
     *
     * Current draft has not yet inserted this line, so it
     * cannot count itself here.
     * ----------------------------------------------------- */

    select
      coalesce(
        sum(
          return_item.quantity_returned
        ),
        0
      )
    into
      v_already_returned
    from
      public.sales_return_items return_item

    inner join
      public.sales_returns return_header
    on
      return_header.id =
        return_item.sales_return_id

    where
      return_item.delivery_order_item_id =
        v_delivery_item.id

      and
      return_header.status <>
        'cancelled';


    v_remaining_returnable :=
      v_original_issue_quantity
      -
      v_already_returned;


    if
      v_remaining_returnable <
        0
    then
      raise exception
        'Historical return quantities exceed the original issue quantity for delivery line %.',
        v_delivery_item.line_number;
    end if;


    if
      v_quantity_returned >
        v_remaining_returnable
    then
      raise exception
        'Return quantity % exceeds remaining returnable quantity % for delivery line %.',
        v_quantity_returned,
        v_remaining_returnable,
        v_delivery_item.line_number;
    end if;


    /*
     * Secondary Sales Order level protection.
     *
     * This protects against inconsistent historical delivery
     * data even though the delivery-specific check above is
     * the primary control.
     */
    if
      v_quantity_returned >
        coalesce(
          v_sales_item.quantity_fulfilled,
          0
        )
    then
      raise exception
        'Return quantity exceeds fulfilled Sales Order quantity on line %.',
        v_sales_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Calculate Commercial Snapshot
     *
     * We calculate the returned proportion from the original
     * Sales Order line.
     *
     * This preserves the original:
     *
     *   price
     *   discount
     *   VAT
     *
     * rather than using today's pricing.
     * ----------------------------------------------------- */

    if
      v_sales_item.quantity <=
        0
    then
      raise exception
        'Original Sales Order quantity is invalid on line %.',
        v_sales_item.line_number;
    end if;


    v_quantity_ratio :=
      v_quantity_returned
      /
      v_sales_item.quantity;


    v_line_subtotal :=
      round(
        coalesce(
          v_sales_item.line_subtotal,
          0
        )
        *
        v_quantity_ratio,
        2
      );


    v_discount_amount :=
      round(
        coalesce(
          v_sales_item.discount_amount,
          0
        )
        *
        v_quantity_ratio,
        2
      );


    v_line_net :=
      round(
        v_line_subtotal
        -
        v_discount_amount,
        2
      );


    v_tax_amount :=
      round(
        coalesce(
          v_sales_item.tax_amount,
          0
        )
        *
        v_quantity_ratio,
        2
      );


    v_line_total :=
      round(
        v_line_net
        +
        v_tax_amount,
        2
      );


    if
      v_line_subtotal <
        0
      or
      v_discount_amount <
        0
      or
      v_line_net <
        0
      or
      v_tax_amount <
        0
      or
      v_line_total <
        0
    then
      raise exception
        'Calculated commercial values are invalid for return line %.',
        v_line_number;
    end if;


    /* -----------------------------------------------------
     * Insert Return Item
     * ----------------------------------------------------- */

    insert into
      public.sales_return_items
      (
        sales_return_id,
        line_number,

        sales_order_item_id,
        delivery_order_item_id,

        product_id,
        warehouse_id,

        sku,
        item_name,
        unit_id,

        quantity_returned,

        unit_price,

        discount_percentage,
        discount_amount,

        tax_percentage,
        tax_amount,

        line_subtotal,
        line_net,
        line_total,

        original_unit_cost,
        original_valuation_unit_cost,

        condition,
        return_reason,
        notes,

        created_at,
        updated_at
      )
    values
      (
        v_return_id,
        v_line_number,

        v_sales_item.id,
        v_delivery_item.id,

        v_sales_item.product_id,
        v_delivery_item.warehouse_id,

        v_sales_item.sku,
        v_sales_item.item_name,
        v_sales_item.unit_id,

        v_quantity_returned,

        v_sales_item.unit_price,

        v_sales_item.discount_percentage,
        v_discount_amount,

        v_sales_item.tax_percentage,
        v_tax_amount,

        v_line_subtotal,
        v_line_net,
        v_line_total,

        v_inventory_item.unit_cost,
        v_inventory_item.valuation_unit_cost,

        v_condition,
        v_line_reason,
        v_line_notes,

        now(),
        now()
      );


    /* -----------------------------------------------------
     * Accumulate Header Totals
     * ----------------------------------------------------- */

    v_header_subtotal :=
      v_header_subtotal
      +
      v_line_subtotal;


    v_header_discount :=
      v_header_discount
      +
      v_discount_amount;


    v_header_net :=
      v_header_net
      +
      v_line_net;


    v_header_tax :=
      v_header_tax
      +
      v_tax_amount;


    v_header_total :=
      v_header_total
      +
      v_line_total;

  end loop;


  /* =======================================================
   * Final Header Totals
   * ======================================================= */

  v_header_subtotal :=
    round(
      v_header_subtotal,
      2
    );


  v_header_discount :=
    round(
      v_header_discount,
      2
    );


  v_header_net :=
    round(
      v_header_net,
      2
    );


  v_header_tax :=
    round(
      v_header_tax,
      2
    );


  v_header_total :=
    round(
      v_header_total,
      2
    );


  if
    v_header_total <=
      0
  then
    raise exception
      'Sales Return must have a positive customer credit value.';
  end if;


  update
    public.sales_returns
  set
    subtotal =
      v_header_subtotal,

    discount_amount =
      v_header_discount,

    net_amount =
      v_header_net,

    tax_amount =
      v_header_tax,

    grand_total =
      v_header_total,

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      v_return_id;


  return
    v_return_id;

end;
$$;

/* =========================================================
 * 11. Sales Return Receipt - 8dp Inventory Valuation
 * ========================================================= */

create or replace function
  public.receive_sales_return_inventory(
    p_sales_return_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_return
    public.sales_returns%rowtype;

  v_item
    public.sales_return_items%rowtype;

  v_inventory_transaction_id uuid;

  v_existing_inventory_transaction_id uuid;

  v_inventory_transaction_number text;

  v_inventory_sequence bigint;

  v_warehouse_id uuid;

  v_warehouse_count integer;

  v_current_quantity numeric(18, 4);

  v_current_average_cost numeric(20, 8);

  v_new_quantity numeric(18, 4);

  v_new_average_cost numeric(20, 8);

begin

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
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
      p_sales_return_id
  for update;


  if not found then
    raise exception
      'Sales Return was not found.';
  end if;


  if
    v_return.status =
      'received'
  then

    if
      v_return.inventory_transaction_id is null
    then
      raise exception
        'Sales Return % is received but has no Inventory Transaction reference.',
        v_return.return_number;
    end if;


    return
      v_return.inventory_transaction_id;

  end if;


  if
    v_return.status <>
      'approved'
  then
    raise exception
      'Sales Return % must be approved before inventory receipt. Current status is %.',
      v_return.return_number,
      v_return.status;
  end if;


  perform
    public.get_gl_accounting_period(
      v_return.posting_date,
      true
    );


  if not exists (
    select
      1
    from
      public.sales_return_items
    where
      sales_return_id =
        v_return.id
  )
  then
    raise exception
      'Sales Return % does not contain any items.',
      v_return.return_number;
  end if;


  select
    count(
      distinct warehouse_id
    )
  into
    v_warehouse_count
  from
    public.sales_return_items
  where
    sales_return_id =
      v_return.id;


  if
    v_warehouse_count <>
      1
  then
    raise exception
      'Sales Return % must contain items from exactly one warehouse.',
      v_return.return_number;
  end if;


  select
    warehouse_id
  into
    v_warehouse_id
  from
    public.sales_return_items
  where
    sales_return_id =
      v_return.id
  limit
    1;


  if
    v_warehouse_id is null
  then
    raise exception
      'Sales Return % does not have a valid warehouse.',
      v_return.return_number;
  end if;


  if exists (
    select
      1
    from
      public.sales_return_items
    where
      sales_return_id =
        v_return.id
      and condition <>
        'resalable'
  )
  then
    raise exception
      'Sales Return % contains non-resalable items and cannot be received into normal warehouse stock.',
      v_return.return_number;
  end if;


  select
    id
  into
    v_existing_inventory_transaction_id
  from
    public.inventory_transactions
  where
    transaction_type =
      'customer_return'
    and
    reference_type =
      'sales_return'
    and
    reference_id =
      v_return.id
    and
    status =
      'posted'
  limit
    1;


  if found then

    perform
      set_config(
        'app.sales_return_internal_write',
        'on',
        true
      );


    update
      public.sales_returns
    set
      inventory_transaction_id =
        v_existing_inventory_transaction_id,

      status =
        'received',

      received_at =
        coalesce(
          received_at,
          now()
        ),

      received_by =
        coalesce(
          received_by,
          v_user_id
        ),

      updated_by =
        v_user_id,

      updated_at =
        now()

    where
      id =
        v_return.id;


    return
      v_existing_inventory_transaction_id;

  end if;


  v_inventory_sequence :=
    nextval(
      'public.inventory_transaction_number_seq'
    );


  v_inventory_transaction_number :=
    'INV-'
    ||
    extract(
      year
      from
      v_return.return_date
    )::integer
    ||
    '-'
    ||
    lpad(
      v_inventory_sequence::text,
      6,
      '0'
    );


  insert into
    public.inventory_transactions
    (
      transaction_number,
      transaction_type,
      status,
      transaction_date,

      warehouse_id,

      reference_type,
      reference_id,
      reference_number,

      description,
      internal_notes,

      posted_at,

      created_by,
      posted_by,

      created_at,
      updated_at
    )
  values
    (
      v_inventory_transaction_number,

      'customer_return',

      'posted',

      v_return.return_date,

      v_warehouse_id,

      'sales_return',
      v_return.id,
      v_return.return_number,

      'Customer Sales Return '
      ||
      v_return.return_number,

      v_return.notes,

      now(),

      v_user_id,
      v_user_id,

      now(),
      now()
    )
  returning
    id
  into
    v_inventory_transaction_id;


  for v_item in
    select
      *
    from
      public.sales_return_items
    where
      sales_return_id =
        v_return.id
    order by
      line_number
  loop

    if
      v_item.quantity_returned <=
        0
    then
      raise exception
        'Sales Return line % contains invalid return quantity.',
        v_item.line_number;
    end if;


    if
      v_item.original_valuation_unit_cost <
        0
    then
      raise exception
        'Sales Return line % contains invalid historical valuation unit cost.',
        v_item.line_number;
    end if;


    insert into
      public.inventory_transaction_items
      (
        inventory_transaction_id,

        warehouse_id,
        product_id,

        line_number,

        quantity_change,
        unit_cost,
        valuation_unit_cost,

        source_document_item_id,

        notes,

        created_at
      )
    values
      (
        v_inventory_transaction_id,

        v_item.warehouse_id,
        v_item.product_id,

        v_item.line_number,

        v_item.quantity_returned,

        v_item.original_unit_cost,
        v_item.original_valuation_unit_cost,

        v_item.id,

        coalesce(
          v_item.return_reason,
          v_item.notes
        ),

        now()
      );


    select
      quantity_on_hand,
      average_unit_cost

    into
      v_current_quantity,
      v_current_average_cost

    from
      public.warehouse_stock

    where
      warehouse_id =
        v_item.warehouse_id

      and
      product_id =
        v_item.product_id

    for update;


    if not found then

      insert into
        public.warehouse_stock
        (
          warehouse_id,
          product_id,

          quantity_on_hand,
          quantity_reserved,

          average_unit_cost,

          last_transaction_at,

          created_at,
          updated_at
        )
      values
        (
          v_item.warehouse_id,
          v_item.product_id,

          v_item.quantity_returned,
          0,

          v_item.original_valuation_unit_cost,

          now(),

          now(),
          now()
        );

    else

      v_new_quantity :=
        v_current_quantity
        +
        v_item.quantity_returned;


      v_new_average_cost :=
        case

          when
            v_new_quantity >
              0

          then
            (
              (
                v_current_quantity
                *
                v_current_average_cost
              )
              +
              (
                v_item.quantity_returned
                *
                v_item.original_valuation_unit_cost
              )
            )
            /
            v_new_quantity

          else
            0

        end;


      update
        public.warehouse_stock

      set
        quantity_on_hand =
          v_new_quantity,

        average_unit_cost =
          v_new_average_cost,

        last_transaction_at =
          now(),

        updated_at =
          now()

      where
        warehouse_id =
          v_item.warehouse_id

        and
        product_id =
          v_item.product_id;

    end if;

  end loop;


  perform
    set_config(
      'app.sales_return_internal_write',
      'on',
      true
    );


  update
    public.sales_returns
  set
    inventory_transaction_id =
      v_inventory_transaction_id,

    status =
      'received',

    received_at =
      now(),

    received_by =
      v_user_id,

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      v_return.id;


  return
    v_inventory_transaction_id;

end;
$$;

/* =========================================================
 * 12. Sales Return Inventory GL - 8dp Valuation
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
        abs(v_item.quantity_change)
        *
        coalesce(
          v_item.valuation_unit_cost,
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
 * 13. Supplier Return - Historical 8dp Inventory Valuation
 * ========================================================= */

alter table public.supplier_return_items
  add column original_valuation_unit_cost numeric(20, 8);

alter table public.supplier_return_items
  disable trigger trg_enforce_supplier_return_item_immutability;

update public.supplier_return_items
set original_valuation_unit_cost = original_unit_cost
where original_valuation_unit_cost is null;

alter table public.supplier_return_items
  enable trigger trg_enforce_supplier_return_item_immutability;

alter table public.supplier_return_items
  alter column original_valuation_unit_cost
  set not null;

alter table public.supplier_return_items
  add constraint supplier_return_items_original_valuation_cost_nonnegative
  check (original_valuation_unit_cost >= 0);

comment on column public.supplier_return_items.original_valuation_unit_cost is
'Authoritative high-precision historical inventory valuation cost resolved from the original posted inventory transaction item.';

/* =========================================================
 * 14. Quick Purchase Supplier Return - 8dp Valuation
 * ========================================================= */

create or replace function
  public.create_supplier_return(
    p_quick_purchase_id uuid,
    p_return_date date,
    p_posting_date date,
    p_reason text,
    p_items jsonb,
    p_notes text
      default null
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_purchase
    public.quick_purchases%rowtype;

  v_purchase_item
    public.quick_purchase_items%rowtype;

  v_inventory_item
    public.inventory_transaction_items%rowtype;

  v_item jsonb;

  v_return_id uuid;

  v_return_number text;

  v_quick_purchase_item_id uuid;

  v_quantity_returned
    numeric(18, 4);

  v_already_returned
    numeric(18, 4);

  v_remaining_returnable
    numeric(18, 4);

  v_ratio numeric;

  v_line_subtotal
    numeric(18, 2);

  v_line_tax
    numeric(18, 2);

  v_line_total
    numeric(18, 2);

  v_line_return_cost
    numeric(18, 4);

  v_line_reason text;

  v_line_notes text;

  v_line_number integer := 0;

  v_subtotal
    numeric(18, 2) := 0;

  v_tax_amount
    numeric(18, 2) := 0;

  v_grand_total
    numeric(18, 2) := 0;

  v_inventory_cost
    numeric(18, 4) := 0;

  v_recoverable_tax
    numeric(18, 2) := 0;

  v_pending_tax
    numeric(18, 2) := 0;

begin

  /* =======================================================
   * Security
   * ======================================================= */

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
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
   * Validate Header Input
   * ======================================================= */

  if
    p_quick_purchase_id is null
  then
    raise exception
      'Quick Purchase ID is required.';
  end if;


  if
    p_return_date is null
  then
    raise exception
      'Supplier Return date is required.';
  end if;


  if
    p_posting_date is null
  then
    raise exception
      'Supplier Return posting date is required.';
  end if;


  if
    length(
      trim(
        coalesce(
          p_reason,
          ''
        )
      )
    ) <
      3
  then
    raise exception
      'A meaningful Supplier Return reason is required.';
  end if;


  if
    p_items is null

    or

    jsonb_typeof(
      p_items
    ) <>
      'array'

    or

    jsonb_array_length(
      p_items
    ) =
      0
  then
    raise exception
      'At least one Supplier Return item is required.';
  end if;


  /* =======================================================
   * Lock Original Quick Purchase
   * ======================================================= */

  select
    *
  into
    v_purchase
  from
    public.quick_purchases
  where
    id =
      p_quick_purchase_id
  for update;


  if not found then
    raise exception
      'Quick Purchase was not found.';
  end if;


  if
    v_purchase.status <>
      'posted'
  then
    raise exception
      'Quick Purchase % is not posted.',
      v_purchase.purchase_number;
  end if;


  if
    v_purchase.supplier_id is null
  then
    raise exception
      'Supplier Returns require a registered supplier. Quick Purchase % does not have one.',
      v_purchase.purchase_number;
  end if;


  if
    v_purchase.inventory_transaction_id
      is null
  then
    raise exception
      'Quick Purchase % does not have an inventory transaction.',
      v_purchase.purchase_number;
  end if;


  /*
   * Reverse-charge and review-required purchases need a
   * dedicated VAT-accounting implementation before Supplier
   * Return posting can safely be supported.
   */

  if
    v_purchase.tax_treatment in (
      'reverse_charge',
      'review_required'
    )
  then
    raise exception
      'Supplier Returns for Quick Purchase tax treatment "%" are not yet supported.',
      v_purchase.tax_treatment;
  end if;


  /* =======================================================
   * Prevent Duplicate Purchase Items in Request
   * ======================================================= */

  if
    (
      select
        count(*)

      from
        jsonb_array_elements(
          p_items
        )
    )
    <>
    (
      select
        count(
          distinct
            item ->>
              'quickPurchaseItemId'
        )

      from
        jsonb_array_elements(
          p_items
        )
          item
    )
  then
    raise exception
      'The same Quick Purchase item cannot appear more than once in one Supplier Return.';
  end if;


  /* =======================================================
   * Create Header
   * ======================================================= */

  v_return_number :=
    public.next_supplier_return_number(
      p_return_date
    );


  insert into
    public.supplier_returns
  (
    return_number,

    quick_purchase_id,

    supplier_id,

    warehouse_id,

    return_date,

    posting_date,

    status,

    reason,

    notes,

    currency_code,

    exchange_rate,

    tax_treatment,

    subtotal,

    discount_amount,

    tax_amount,

    recoverable_tax_amount,

    pending_tax_amount,

    grand_total,

    inventory_cost,

    created_by,

    updated_by
  )
  values
  (
    v_return_number,

    v_purchase.id,

    v_purchase.supplier_id,

    v_purchase.warehouse_id,

    p_return_date,

    p_posting_date,

    'draft',

    trim(
      p_reason
    ),

    nullif(
      trim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    ),

    v_purchase.currency_code,

    v_purchase.exchange_rate,

    v_purchase.tax_treatment,

    0,

    0,

    0,

    0,

    0,

    0,

    0,

    v_user_id,

    v_user_id
  )
  returning
    id
  into
    v_return_id;


  /* =======================================================
   * Process Requested Return Items
   * ======================================================= */

  for
    v_item
  in

    select
      value

    from
      jsonb_array_elements(
        p_items
      )

  loop

    v_line_number :=
      v_line_number +
      1;


    begin

      v_quick_purchase_item_id :=
        nullif(
          v_item ->>
            'quickPurchaseItemId',
          ''
        )::uuid;

    exception
      when others then

        raise exception
          'Supplier Return line % requires a valid Quick Purchase item.',
          v_line_number;

    end;


    if
      v_quick_purchase_item_id
        is null
    then
      raise exception
        'Supplier Return line % requires a Quick Purchase item.',
        v_line_number;
    end if;


    begin

      v_quantity_returned :=
        coalesce(
          nullif(
            v_item ->>
              'quantityReturned',
            ''
          )::numeric,
          0
        );

    exception
      when others then

        raise exception
          'Supplier Return line % contains an invalid return quantity.',
          v_line_number;

    end;


    if
      v_quantity_returned <=
        0
    then
      raise exception
        'Supplier Return line % requires a quantity greater than zero.',
        v_line_number;
    end if;


    /* -----------------------------------------------------
     * Lock Original Purchase Item
     * ----------------------------------------------------- */

    select
      *
    into
      v_purchase_item
    from
      public.quick_purchase_items
    where
      id =
        v_quick_purchase_item_id

      and
      quick_purchase_id =
        v_purchase.id
    for update;


    if not found then
      raise exception
        'Supplier Return line % does not belong to Quick Purchase %.',
        v_line_number,
        v_purchase.purchase_number;
    end if;


    /* -----------------------------------------------------
     * Resolve Exact Original Inventory Item
     * ----------------------------------------------------- */

    select
      *
    into
      v_inventory_item
    from
      public.inventory_transaction_items
    where
      inventory_transaction_id =
        v_purchase.inventory_transaction_id

      and
      source_document_item_id =
        v_purchase_item.id;


    if not found then
      raise exception
        'Quick Purchase % line % does not have valid inventory lineage.',
        v_purchase.purchase_number,
        v_purchase_item.line_number;
    end if;


    if
      v_inventory_item.product_id <>
        v_purchase_item.product_id
    then
      raise exception
        'Quick Purchase % line % inventory lineage points to a different product.',
        v_purchase.purchase_number,
        v_purchase_item.line_number;
    end if;


    if
      v_inventory_item.warehouse_id <>
        v_purchase.warehouse_id
    then
      raise exception
        'Quick Purchase % line % inventory warehouse does not match the purchase warehouse.',
        v_purchase.purchase_number,
        v_purchase_item.line_number;
    end if;


    if
      v_inventory_item.quantity_change <=
        0
    then
      raise exception
        'Quick Purchase % line % does not point to a positive inventory receipt.',
        v_purchase.purchase_number,
        v_purchase_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Already Returned Quantity
     * ----------------------------------------------------- */

    select
      coalesce(
        sum(
          supplier_return_item.quantity_returned
        ),
        0
      )

    into
      v_already_returned

    from
      public.supplier_return_items
        supplier_return_item

    inner join
      public.supplier_returns
        supplier_return

      on
        supplier_return.id =
          supplier_return_item.supplier_return_id

    where
      supplier_return_item.quick_purchase_item_id =
        v_purchase_item.id

      and
      supplier_return.status <>
        'cancelled';


    v_remaining_returnable :=
      greatest(
        v_purchase_item.quantity
        -
        v_already_returned,
        0
      );


    if
      v_quantity_returned >
        v_remaining_returnable
    then
      raise exception
        'Return quantity % exceeds remaining returnable quantity % for Quick Purchase line %.',
        v_quantity_returned,
        v_remaining_returnable,
        v_purchase_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Commercial Return Amount
     *
     * Reverse original commercial line proportionally.
     * ----------------------------------------------------- */

    v_ratio :=
      v_quantity_returned
      /
      v_purchase_item.quantity;


    v_line_subtotal :=
      round(
        v_purchase_item.line_subtotal
        *
        v_ratio,
        2
      );


    v_line_tax :=
      round(
        v_purchase_item.tax_amount
        *
        v_ratio,
        2
      );


    v_line_total :=
      round(
        v_purchase_item.line_total
        *
        v_ratio,
        2
      );


    /* -----------------------------------------------------
     * Historical Inventory Cost
     * ----------------------------------------------------- */

    v_line_return_cost :=
      round(
        v_quantity_returned
        *
        v_inventory_item.unit_cost,
        4
      );


    v_line_reason :=
      nullif(
        trim(
          coalesce(
            v_item ->>
              'reason',
            ''
          )
        ),
        ''
      );


    v_line_notes :=
      nullif(
        trim(
          coalesce(
            v_item ->>
              'notes',
            ''
          )
        ),
        ''
      );


    /* -----------------------------------------------------
     * Insert Supplier Return Item
     * ----------------------------------------------------- */

    insert into
      public.supplier_return_items
    (
      supplier_return_id,

      line_number,

      quick_purchase_item_id,

      original_inventory_item_id,

      product_id,

      warehouse_id,

      quantity_returned,

      original_unit_cost,

      original_valuation_unit_cost,

      return_cost,

      line_subtotal,

      tax_percentage,

      tax_amount,

      line_total,

      reason,

      notes
    )
    values
    (
      v_return_id,

      v_line_number,

      v_purchase_item.id,

      v_inventory_item.id,

      v_purchase_item.product_id,

      v_purchase.warehouse_id,

      v_quantity_returned,

      v_inventory_item.unit_cost,

      v_inventory_item.valuation_unit_cost,

      v_line_return_cost,

      v_line_subtotal,

      v_purchase_item.tax_percentage,

      v_line_tax,

      v_line_total,

      v_line_reason,

      v_line_notes
    );


    v_subtotal :=
      v_subtotal
      +
      v_line_subtotal;


    v_tax_amount :=
      v_tax_amount
      +
      v_line_tax;


    v_grand_total :=
      v_grand_total
      +
      v_line_total;


    v_inventory_cost :=
      v_inventory_cost
      +
      v_line_return_cost;

  end loop;


  /* =======================================================
   * Determine VAT Reversal Bucket
   * ======================================================= */

  if
    v_purchase.tax_treatment =
      'standard_vat'
  then

    v_recoverable_tax :=
      v_tax_amount;

    v_pending_tax :=
      0;


  elsif
    v_purchase.tax_treatment =
      'vat_pending'
  then

    v_recoverable_tax :=
      0;

    v_pending_tax :=
      v_tax_amount;


  else

    /*
     * no_vat
     */

    v_recoverable_tax :=
      0;

    v_pending_tax :=
      0;

  end if;


  /* =======================================================
   * Final Header Totals
   * ======================================================= */

  update
    public.supplier_returns

  set
    subtotal =
      round(
        v_subtotal,
        2
      ),

    /*
     * Current Quick Purchase production workflow always uses
     * zero header discount.
     */

    discount_amount =
      0,

    tax_amount =
      round(
        v_tax_amount,
        2
      ),

    recoverable_tax_amount =
      round(
        v_recoverable_tax,
        2
      ),

    pending_tax_amount =
      round(
        v_pending_tax,
        2
      ),

    grand_total =
      round(
        v_grand_total,
        2
      ),

    inventory_cost =
      round(
        v_inventory_cost,
        2
      ),

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      v_return_id;


  if
    v_grand_total <=
      0
  then
    raise exception
      'Supplier Return % has zero commercial value.',
      v_return_number;
  end if;


  return
    v_return_id;

end;
$$;

/* =========================================================
 * 15. Goods Receipt Supplier Return - 8dp Valuation
 * ========================================================= */

create or replace function
  public.create_supplier_return_from_goods_receipt(
    p_goods_receipt_id uuid,
    p_return_date date,
    p_posting_date date,
    p_reason text,
    p_items jsonb,
    p_notes text
      default null
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_receipt
    public.goods_receipts%rowtype;

  v_purchase_order
    public.purchase_orders%rowtype;

  v_receipt_item
    public.goods_receipt_items%rowtype;

  v_purchase_item
    public.purchase_order_items%rowtype;

  v_inventory_item
    public.inventory_transaction_items%rowtype;

  v_item jsonb;

  v_return_id uuid;

  v_return_number text;

  v_goods_receipt_item_id uuid;

  v_quantity_returned
    numeric(18, 4);

  v_already_returned
    numeric(18, 4);

  v_remaining_returnable
    numeric(18, 4);

  v_ratio numeric;

  v_line_subtotal
    numeric(18, 2);

  v_line_tax
    numeric(18, 2);

  v_line_total
    numeric(18, 2);

  v_line_return_cost
    numeric(18, 4);

  v_line_reason text;

  v_line_notes text;

  v_line_number integer := 0;

  v_subtotal
    numeric(18, 2) := 0;

  v_tax_amount
    numeric(18, 2) := 0;

  v_grand_total
    numeric(18, 2) := 0;

  v_inventory_cost
    numeric(18, 4) := 0;

  v_recoverable_tax
    numeric(18, 2) := 0;

  v_pending_tax
    numeric(18, 2) := 0;

begin

  /* =======================================================
   * Security
   * ======================================================= */

  v_user_id :=
    auth.uid();

  if
    v_user_id is null
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
   * Validate Header
   * ======================================================= */

  if
    p_goods_receipt_id is null
  then
    raise exception
      'Goods Receipt ID is required.';
  end if;

  if
    p_return_date is null
  then
    raise exception
      'Supplier Return date is required.';
  end if;

  if
    p_posting_date is null
  then
    raise exception
      'Supplier Return posting date is required.';
  end if;

  if
    length(
      trim(
        coalesce(
          p_reason,
          ''
        )
      )
    ) <
      3
  then
    raise exception
      'A meaningful Supplier Return reason is required.';
  end if;

  if
    p_items is null
    or
    jsonb_typeof(
      p_items
    ) <>
      'array'
    or
    jsonb_array_length(
      p_items
    ) =
      0
  then
    raise exception
      'At least one Supplier Return item is required.';
  end if;


  /* =======================================================
   * Lock Completed Goods Receipt
   * ======================================================= */

  select
    *
  into
    v_receipt
  from
    public.goods_receipts
  where
    id =
      p_goods_receipt_id
  for update;

  if not found then
    raise exception
      'Goods Receipt was not found.';
  end if;

  if
    v_receipt.status <>
      'completed'
  then
    raise exception
      'Goods Receipt % must be completed before a Supplier Return can be created.',
      v_receipt.receipt_number;
  end if;

  if
    v_receipt.supplier_id is null
  then
    raise exception
      'Supplier Return requires a registered supplier.';
  end if;


  /* =======================================================
   * Lock Purchase Order
   * ======================================================= */

  select
    *
  into
    v_purchase_order
  from
    public.purchase_orders
  where
    id =
      v_receipt.purchase_order_id
  for update;

  if not found then
    raise exception
      'Purchase Order for Goods Receipt % was not found.',
      v_receipt.receipt_number;
  end if;

  if
    v_purchase_order.supplier_id <>
      v_receipt.supplier_id
  then
    raise exception
      'Goods Receipt % and Purchase Order % do not belong to the same supplier.',
      v_receipt.receipt_number,
      v_purchase_order.po_number;
  end if;


  /* =======================================================
   * Prevent Duplicate GRN Items
   * ======================================================= */

  if
    (
      select
        count(*)
      from
        jsonb_array_elements(
          p_items
        )
    )
    <>
    (
      select
        count(
          distinct
            item ->>
              'goodsReceiptItemId'
        )
      from
        jsonb_array_elements(
          p_items
        )
          item
    )
  then
    raise exception
      'The same Goods Receipt item cannot appear more than once in one Supplier Return.';
  end if;


  /* =======================================================
   * Create Header
   * ======================================================= */

  v_return_number :=
    public.next_supplier_return_number(
      p_return_date
    );

  insert into
    public.supplier_returns
  (
    return_number,
    quick_purchase_id,
    goods_receipt_id,
    supplier_id,
    warehouse_id,
    return_date,
    posting_date,
    status,
    reason,
    notes,
    currency_code,
    exchange_rate,
    tax_treatment,
    subtotal,
    discount_amount,
    tax_amount,
    recoverable_tax_amount,
    pending_tax_amount,
    grand_total,
    inventory_cost,
    created_by,
    updated_by
  )
  values
  (
    v_return_number,
    null,
    v_receipt.id,
    v_receipt.supplier_id,
    v_receipt.warehouse_id,
    p_return_date,
    p_posting_date,
    'draft',
    trim(
      p_reason
    ),
    nullif(
      trim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    ),
    v_purchase_order.currency_code,
    v_purchase_order.exchange_rate,
    case
      when v_purchase_order.vat_recovery_status = 'recoverable'
        and coalesce(v_purchase_order.tax_amount, 0) > 0
        then 'standard_vat'

      when v_purchase_order.vat_recovery_status = 'pending'
        and coalesce(v_purchase_order.tax_amount, 0) > 0
        then 'vat_pending'

      else
        'no_vat'
    end,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    v_user_id,
    v_user_id
  )
  returning
    id
  into
    v_return_id;


  /* =======================================================
   * Process Return Items
   * ======================================================= */

  for
    v_item
  in
    select
      value
    from
      jsonb_array_elements(
        p_items
      )
  loop

    v_line_number :=
      v_line_number + 1;

    begin

      v_goods_receipt_item_id :=
        nullif(
          v_item ->>
            'goodsReceiptItemId',
          ''
        )::uuid;

    exception
      when others then
        raise exception
          'Supplier Return line % requires a valid Goods Receipt item.',
          v_line_number;
    end;

    if
      v_goods_receipt_item_id
        is null
    then
      raise exception
        'Supplier Return line % requires a Goods Receipt item.',
        v_line_number;
    end if;


    begin

      v_quantity_returned :=
        coalesce(
          nullif(
            v_item ->>
              'quantityReturned',
            ''
          )::numeric,
          0
        );

    exception
      when others then
        raise exception
          'Supplier Return line % contains an invalid return quantity.',
          v_line_number;
    end;

    if
      v_quantity_returned <=
        0
    then
      raise exception
        'Supplier Return line % requires a quantity greater than zero.',
        v_line_number;
    end if;


    /* -----------------------------------------------------
     * Lock Original GRN Item
     * ----------------------------------------------------- */

    select
      *
    into
      v_receipt_item
    from
      public.goods_receipt_items
    where
      id =
        v_goods_receipt_item_id
      and
      goods_receipt_id =
        v_receipt.id
    for update;

    if not found then
      raise exception
        'Supplier Return line % does not belong to Goods Receipt %.',
        v_line_number,
        v_receipt.receipt_number;
    end if;

    if
      v_receipt_item.accepted_quantity <=
        0
    then
      raise exception
        'Goods Receipt % line % has no accepted quantity to return.',
        v_receipt.receipt_number,
        v_receipt_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Lock Purchase Order Item
     * ----------------------------------------------------- */

    select
      *
    into
      v_purchase_item
    from
      public.purchase_order_items
    where
      id =
        v_receipt_item.purchase_order_item_id
      and
      purchase_order_id =
        v_purchase_order.id
    for update;

    if not found then
      raise exception
        'Purchase Order item for Goods Receipt % line % was not found.',
        v_receipt.receipt_number,
        v_receipt_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Resolve Exact Original Inventory Item
     * ----------------------------------------------------- */

    select
      inventory_item.*
    into
      v_inventory_item
    from
      public.inventory_transaction_items
        inventory_item
    inner join
      public.inventory_transactions
        inventory_transaction
      on
        inventory_transaction.id =
          inventory_item.inventory_transaction_id
    where
      inventory_transaction.reference_type =
        'goods_receipt'
      and
      inventory_transaction.reference_id =
        v_receipt.id
      and
      inventory_transaction.status =
        'posted'
      and
      inventory_item.source_document_item_id =
        v_receipt_item.id;

    if not found then
      raise exception
        'Goods Receipt % line % does not have valid posted inventory lineage.',
        v_receipt.receipt_number,
        v_receipt_item.line_number;
    end if;

    if
      v_inventory_item.product_id <>
        v_receipt_item.product_id
    then
      raise exception
        'Goods Receipt % line % inventory lineage points to a different product.',
        v_receipt.receipt_number,
        v_receipt_item.line_number;
    end if;

    if
      v_inventory_item.warehouse_id <>
        v_receipt.warehouse_id
    then
      raise exception
        'Goods Receipt % line % inventory warehouse does not match the receipt warehouse.',
        v_receipt.receipt_number,
        v_receipt_item.line_number;
    end if;

    if
      v_inventory_item.quantity_change <=
        0
    then
      raise exception
        'Goods Receipt % line % does not point to a positive inventory receipt.',
        v_receipt.receipt_number,
        v_receipt_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Already Returned Quantity
     * ----------------------------------------------------- */

    select
      coalesce(
        sum(
          supplier_return_item.quantity_returned
        ),
        0
      )
    into
      v_already_returned
    from
      public.supplier_return_items
        supplier_return_item
    inner join
      public.supplier_returns
        supplier_return
      on
        supplier_return.id =
          supplier_return_item.supplier_return_id
    where
      supplier_return_item.goods_receipt_item_id =
        v_receipt_item.id
      and
      supplier_return.status <>
        'cancelled';

    v_remaining_returnable :=
      greatest(
        v_receipt_item.accepted_quantity
        -
        v_already_returned,
        0
      );

    if
      v_quantity_returned >
        v_remaining_returnable
    then
      raise exception
        'Return quantity % exceeds remaining returnable quantity % for Goods Receipt line %.',
        v_quantity_returned,
        v_remaining_returnable,
        v_receipt_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Commercial Return Amount
     *
     * PO line amounts represent ordered quantity.
     * Only the quantity being returned from this GRN is
     * reversed.
     * ----------------------------------------------------- */

    if
      v_purchase_item.ordered_quantity <=
        0
    then
      raise exception
        'Purchase Order line % has an invalid ordered quantity.',
        v_purchase_item.line_number;
    end if;

    v_ratio :=
      v_quantity_returned
      /
      v_purchase_item.ordered_quantity;

    v_line_subtotal :=
      round(
        v_purchase_item.line_subtotal
        *
        v_ratio,
        2
      );

    v_line_tax :=
      round(
        v_purchase_item.tax_amount
        *
        v_ratio,
        2
      );

    v_line_total :=
      round(
        v_purchase_item.line_total
        *
        v_ratio,
        2
      );


    /* -----------------------------------------------------
     * Historical Inventory Cost
     * ----------------------------------------------------- */

    v_line_return_cost :=
      round(
        v_quantity_returned
        *
        v_inventory_item.unit_cost,
        4
      );


    v_line_reason :=
      nullif(
        trim(
          coalesce(
            v_item ->>
              'reason',
            ''
          )
        ),
        ''
      );

    v_line_notes :=
      nullif(
        trim(
          coalesce(
            v_item ->>
              'notes',
            ''
          )
        ),
        ''
      );


    /* -----------------------------------------------------
     * Insert Supplier Return Item
     * ----------------------------------------------------- */

    insert into
      public.supplier_return_items
    (
      supplier_return_id,
      line_number,
      quick_purchase_item_id,
      goods_receipt_item_id,
      original_inventory_item_id,
      product_id,
      warehouse_id,
      quantity_returned,
      original_unit_cost,
      original_valuation_unit_cost,
      return_cost,
      line_subtotal,
      tax_percentage,
      tax_amount,
      line_total,
      reason,
      notes
    )
    values
    (
      v_return_id,
      v_line_number,
      null,
      v_receipt_item.id,
      v_inventory_item.id,
      v_receipt_item.product_id,
      v_receipt.warehouse_id,
      v_quantity_returned,
      v_inventory_item.unit_cost,
      v_inventory_item.valuation_unit_cost,
      v_line_return_cost,
      v_line_subtotal,
      v_purchase_item.tax_percent,
      v_line_tax,
      v_line_total,
      v_line_reason,
      v_line_notes
    );


    v_subtotal :=
      v_subtotal
      +
      v_line_subtotal;

    v_tax_amount :=
      v_tax_amount
      +
      v_line_tax;

    v_grand_total :=
      v_grand_total
      +
      v_line_total;

    v_inventory_cost :=
      v_inventory_cost
      +
      v_line_return_cost;

  end loop;


  /* =======================================================
   * VAT Split
   * ======================================================= */

    v_recoverable_tax :=
    0;

  v_pending_tax :=
    0;

  if
    coalesce(v_tax_amount, 0) >
      0
  then

    if
      v_purchase_order.vat_recovery_status =
        'recoverable'
    then

      v_recoverable_tax :=
        v_tax_amount;

    elsif
      v_purchase_order.vat_recovery_status =
        'pending'
    then

      v_pending_tax :=
        v_tax_amount;

    end if;

  end if;


  /* =======================================================
   * Update Header Totals
   * ======================================================= */

  update
    public.supplier_returns
  set
    subtotal =
      round(
        v_subtotal,
        2
      ),
    discount_amount =
      0,
    tax_amount =
      round(
        v_tax_amount,
        2
      ),
    recoverable_tax_amount =
      round(
        v_recoverable_tax,
        2
      ),
    pending_tax_amount =
      round(
        v_pending_tax,
        2
      ),
    grand_total =
      round(
        v_grand_total,
        2
      ),
    inventory_cost =
      round(
        v_inventory_cost,
        2
      ),
    updated_by =
      v_user_id,
    updated_at =
      now()
  where
    id =
      v_return_id;


  return
    v_return_id;

end;
$$;

/* =========================================================
 * 16. Supplier Return Inventory Dispatch - 8dp Valuation
 * ========================================================= */

create or replace function
  public.dispatch_supplier_return_inventory(
    p_supplier_return_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_return
    public.supplier_returns%rowtype;

  v_item
    public.supplier_return_items%rowtype;

  v_inventory_transaction_id uuid;

  v_existing_inventory_transaction_id uuid;

  v_inventory_transaction_number text;

  v_inventory_sequence bigint;

  v_stock
    public.warehouse_stock%rowtype;

  v_new_quantity
    numeric(18, 4);

  v_current_inventory_value
    numeric(20, 8);

  v_return_inventory_value
    numeric(20, 8);

  v_new_inventory_value
    numeric(20, 8);

  v_new_average_cost
    numeric(20, 8);

begin

  /* =======================================================
   * Security
   * ======================================================= */

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
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
    p_supplier_return_id is null
  then
    raise exception
      'Supplier Return ID is required.';
  end if;


  /* =======================================================
   * Lock Supplier Return
   * ======================================================= */

  select
    *
  into
    v_return
  from
    public.supplier_returns
  where
    id =
      p_supplier_return_id
  for update;


  if not found then
    raise exception
      'Supplier Return was not found.';
  end if;


  /* =======================================================
   * Idempotency
   * ======================================================= */

  if
    v_return.inventory_transaction_id
      is not null
  then

    select
      id
    into
      v_existing_inventory_transaction_id
    from
      public.inventory_transactions
    where
      id =
        v_return.inventory_transaction_id;


    if found then
      return
        v_existing_inventory_transaction_id;
    end if;


    raise exception
      'Supplier Return % references an inventory transaction that no longer exists.',
      v_return.return_number;

  end if;


  /* =======================================================
   * Status
   * ======================================================= */

  if
    v_return.status <>
      'approved'
  then
    raise exception
      'Supplier Return % must be approved before inventory dispatch. Current status is "%".',
      v_return.return_number,
      v_return.status;
  end if;


  /* =======================================================
   * Validate Items
   * ======================================================= */

  if not exists (
    select
      1
    from
      public.supplier_return_items
    where
      supplier_return_id =
        v_return.id
  )
  then
    raise exception
      'Supplier Return % does not contain any items.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Generate Inventory Transaction Number
   * ======================================================= */

  v_inventory_sequence :=
    nextval(
      'public.inventory_transaction_number_seq'
    );


  v_inventory_transaction_number :=
    'INV-'
    ||
    extract(
      year
      from
      v_return.return_date
    )::integer
    ||
    '-'
    ||
    lpad(
      v_inventory_sequence::text,
      6,
      '0'
    );


  /* =======================================================
   * Inventory Transaction Header
   * ======================================================= */

  insert into
    public.inventory_transactions
  (
    transaction_number,

    transaction_type,

    status,

    transaction_date,

    warehouse_id,

    reference_type,

    reference_id,

    reference_number,

    description,

    internal_notes,

    posted_at,

    created_by,

    posted_by,

    created_at,

    updated_at
  )
  values
  (
    v_inventory_transaction_number,

    'supplier_return',

    'posted',

    v_return.return_date,

    v_return.warehouse_id,

    'supplier_return',

    v_return.id,

    v_return.return_number,

    'Supplier Return - '
      ||
      v_return.return_number,

    nullif(
      trim(
        coalesce(
          v_return.notes,
          ''
        )
      ),
      ''
    ),

    now(),

    v_user_id,

    v_user_id,

    now(),

    now()
  )
  returning
    id
  into
    v_inventory_transaction_id;


  /* =======================================================
   * Process Supplier Return Items
   * ======================================================= */

  for
    v_item
  in

    select
      *
    from
      public.supplier_return_items
    where
      supplier_return_id =
        v_return.id
    order by
      line_number

  loop

    /* -----------------------------------------------------
     * Lock Warehouse Stock
     * ----------------------------------------------------- */

    select
      *
    into
      v_stock
    from
      public.warehouse_stock
    where
      warehouse_id =
        v_item.warehouse_id

      and
      product_id =
        v_item.product_id
    for update;


    if not found then
      raise exception
        'Warehouse stock was not found for Supplier Return line %.',
        v_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Validate Available Stock
     *
     * Reserved customer stock must not be consumed by a
     * Supplier Return.
     * ----------------------------------------------------- */

    if
      (
        v_stock.quantity_on_hand
        -
        v_stock.quantity_reserved
      ) <
        v_item.quantity_returned
    then
      raise exception
        'Insufficient available stock for Supplier Return line %. Available quantity is %, requested return quantity is %.',
        v_item.line_number,
        (
          v_stock.quantity_on_hand
          -
          v_stock.quantity_reserved
        ),
        v_item.quantity_returned;
    end if;


    /* -----------------------------------------------------
     * Calculate New Quantity
     * ----------------------------------------------------- */

    v_new_quantity :=
      v_stock.quantity_on_hand
      -
      v_item.quantity_returned;


    if
      v_new_quantity <
        0
    then
      raise exception
        'Supplier Return line % would create negative warehouse stock.',
        v_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Weighted-Average Value Recalculation
     *
     * Current value:
     *
     *   quantity_on_hand * average_unit_cost
     *
     * Returned value:
     *
     *   exact historical Supplier Return cost
     * ----------------------------------------------------- */

    v_current_inventory_value :=
      v_stock.quantity_on_hand
      *
      v_stock.average_unit_cost;


    v_return_inventory_value :=
      v_item.quantity_returned
      *
      v_item.original_valuation_unit_cost;


    v_new_inventory_value :=
      v_current_inventory_value
      -
      v_return_inventory_value;


    /*
     * Historical cost being returned cannot exceed the entire
     * current warehouse inventory value.
     *
     * A tiny rounding tolerance is allowed.
     */

    if
      v_new_inventory_value <
        -0.01
    then
      raise exception
        'Supplier Return line % historical return cost exceeds current warehouse inventory value.',
        v_item.line_number;
    end if;


    v_new_inventory_value :=
      greatest(
        v_new_inventory_value,
        0
      );


    if
      v_new_quantity >
        0
    then

      v_new_average_cost :=
        round(
          v_new_inventory_value
          /
          v_new_quantity,
          8
        );

    else

      v_new_average_cost :=
        0;

    end if;


    /* -----------------------------------------------------
     * Inventory Transaction Item
     * ----------------------------------------------------- */

    insert into
      public.inventory_transaction_items
    (
      inventory_transaction_id,

      warehouse_id,

      product_id,

      line_number,

      quantity_change,

      unit_cost,

      valuation_unit_cost,

      source_document_item_id,

      notes,

      created_at
    )
    values
    (
      v_inventory_transaction_id,

      v_item.warehouse_id,

      v_item.product_id,

      v_item.line_number,

      -v_item.quantity_returned,

      v_item.original_unit_cost,

      v_item.original_valuation_unit_cost,

      v_item.id,

      coalesce(
        v_item.notes,
        'Supplier Return '
          ||
          v_return.return_number
      ),

      now()
    );


    /* -----------------------------------------------------
     * Update Warehouse Stock
     *
     * quantity_available is generated automatically.
     * ----------------------------------------------------- */

    update
      public.warehouse_stock

    set
      quantity_on_hand =
        v_new_quantity,

      average_unit_cost =
        v_new_average_cost,

      last_transaction_at =
        now(),

      updated_at =
        now()

    where
      id =
        v_stock.id;

  end loop;


  /* =======================================================
   * Finalize Supplier Return
   * ======================================================= */

  update
    public.supplier_returns

  set
    status =
      'dispatched',

    inventory_transaction_id =
      v_inventory_transaction_id,

    dispatched_at =
      now(),

    dispatched_by =
      v_user_id,

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      v_return.id;


  return
    v_inventory_transaction_id;

end;
$$;

/* =========================================================
 * 17. Inventory Transaction Valuation Compatibility Trigger
 * ========================================================= */

create or replace function
  public.set_inventory_transaction_item_valuation_cost()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if
    new.valuation_unit_cost is null
  then

    new.valuation_unit_cost :=
      new.unit_cost::numeric(20, 8);

  end if;


  return
    new;

end;
$$;


drop trigger if exists
  set_inventory_transaction_item_valuation_cost
on
  public.inventory_transaction_items;


create trigger
  set_inventory_transaction_item_valuation_cost
before insert
on
  public.inventory_transaction_items
for each row
execute function
  public.set_inventory_transaction_item_valuation_cost();


comment on function
  public.set_inventory_transaction_item_valuation_cost()
is
  'Compatibility safeguard that defaults inventory_transaction_items.valuation_unit_cost from legacy unit_cost when a caller does not explicitly provide the authoritative 8dp valuation cost.';

/* =========================================================
 * 18. Historical Warehouse Valuation Normalization
 * ========================================================= */

do $$
declare
  v_issue_count bigint;
begin

  /*
   * Safety: warehouse quantity must reconcile exactly with
   * the posted inventory transaction ledger before any
   * historical average-cost normalization is permitted.
   */

  select
    count(*)
  into
    v_issue_count
  from
    public.warehouse_stock ws
  left join (
    select
      iti.warehouse_id,
      iti.product_id,
      sum(iti.quantity_change) as transaction_quantity
    from
      public.inventory_transaction_items iti
    join
      public.inventory_transactions it
        on it.id = iti.inventory_transaction_id
    where
      it.status = 'posted'
    group by
      iti.warehouse_id,
      iti.product_id
  ) tv
    on tv.warehouse_id = ws.warehouse_id
   and tv.product_id = ws.product_id
  where
    tv.product_id is null
    or abs(ws.quantity_on_hand - tv.transaction_quantity) > 0.0001;

  if v_issue_count > 0 then
    raise exception
      'Inventory precision upgrade aborted: warehouse stock quantity does not reconcile with the posted inventory transaction ledger.';
  end if;


  /*
   * Safety: every posted inventory transaction bucket must
   * have a corresponding warehouse_stock row.
   */

  select
    count(*)
  into
    v_issue_count
  from (
    select
      iti.warehouse_id,
      iti.product_id
    from
      public.inventory_transaction_items iti
    join
      public.inventory_transactions it
        on it.id = iti.inventory_transaction_id
    where
      it.status = 'posted'
    group by
      iti.warehouse_id,
      iti.product_id
  ) tv
  left join
    public.warehouse_stock ws
      on ws.warehouse_id = tv.warehouse_id
     and ws.product_id = tv.product_id
  where
    ws.product_id is null;

  if v_issue_count > 0 then
    raise exception
      'Inventory precision upgrade aborted: posted inventory transactions exist without warehouse stock rows.';
  end if;


  /*
   * Safety: zero-stock buckets must not carry residual
   * signed historical inventory value.
   */

  select
    count(*)
  into
    v_issue_count
  from
    public.warehouse_stock ws
  join (
    select
      iti.warehouse_id,
      iti.product_id,
      sum(iti.quantity_change * iti.valuation_unit_cost) as transaction_value
    from
      public.inventory_transaction_items iti
    join
      public.inventory_transactions it
        on it.id = iti.inventory_transaction_id
    where
      it.status = 'posted'
    group by
      iti.warehouse_id,
      iti.product_id
  ) tv
    on tv.warehouse_id = ws.warehouse_id
   and tv.product_id = ws.product_id
  where
    ws.quantity_on_hand = 0
    and abs(coalesce(tv.transaction_value, 0)) > 0.00000001;

  if v_issue_count > 0 then
    raise exception
      'Inventory precision upgrade aborted: zero-stock inventory buckets contain residual historical valuation.';
  end if;


  /*
   * Normalize only positive-stock rows.
   *
   * valuation_unit_cost was historically backfilled from
   * legacy unit_cost earlier in this migration. The signed
   * posted transaction ledger therefore becomes the
   * historical valuation control for the precision upgrade.
   */

  with transaction_valuation as (
    select
      iti.warehouse_id,
      iti.product_id,
      sum(iti.quantity_change * iti.valuation_unit_cost) as transaction_value
    from
      public.inventory_transaction_items iti
    join
      public.inventory_transactions it
        on it.id = iti.inventory_transaction_id
    where
      it.status = 'posted'
    group by
      iti.warehouse_id,
      iti.product_id
  )
  update
    public.warehouse_stock ws
  set
    average_unit_cost =
      round(
        tv.transaction_value / ws.quantity_on_hand,
        8
      ),
    updated_at = now()
  from
    transaction_valuation tv
  where
    tv.warehouse_id = ws.warehouse_id
    and tv.product_id = ws.product_id
    and ws.quantity_on_hand > 0
    and abs(
      (ws.quantity_on_hand * ws.average_unit_cost)
      - tv.transaction_value
    ) > 0.00000001;

end;
$$;
