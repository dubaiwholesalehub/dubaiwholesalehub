/*
 * Milestone 8.3
 * Complete Goods Receipt and Post Inventory
 *
 * This function:
 *   1. Locks the Goods Receipt and Purchase Order
 *   2. Validates receiving quantities
 *   3. Creates a posted inventory transaction
 *   4. Creates inventory transaction items
 *   5. Updates warehouse stock and weighted average cost
 *   6. Updates Purchase Order received quantities
 *   7. Updates Purchase Order status
 *   8. Marks the Goods Receipt completed
 *
 * All operations run atomically.
 */


/* =========================================================
 * Complete Goods Receipt
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
  v_current_average_cost numeric(18, 4);
  v_new_quantity numeric(18, 4);
  v_new_average_cost numeric(18, 4);

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
 * Function permissions
 * ========================================================= */

revoke all
on function public.complete_goods_receipt(uuid)
from public;

grant execute
on function public.complete_goods_receipt(uuid)
to authenticated;