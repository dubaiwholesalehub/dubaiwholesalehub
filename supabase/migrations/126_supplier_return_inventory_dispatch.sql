/*
 * =========================================================
 * 126 — Supplier Return Inventory Dispatch
 *
 * PURPOSE
 * -------
 *
 * Dispatches an approved Supplier Return back to the supplier.
 *
 * This workflow:
 *
 *   Approved Supplier Return
 *          ↓
 *   supplier_return Inventory Transaction
 *          ↓
 *   Negative inventory movement
 *          ↓
 *   Warehouse stock reduction
 *          ↓
 *   Supplier Return = dispatched
 *
 *
 * IMPORTANT ACCOUNTING PRINCIPLE
 * ------------------------------
 *
 * Supplier Return inventory is removed using the exact
 * historical acquisition cost captured on Supplier Return
 * lines during controlled creation.
 *
 * Because warehouse_stock uses weighted-average valuation,
 * the remaining weighted average is recalculated so that:
 *
 *   remaining inventory value
 *   =
 *   previous inventory value
 *   -
 *   returned historical cost
 *
 *
 * GL IS NOT POSTED HERE.
 *
 * Migration 127 will handle:
 *
 *   Accounts Payable
 *   Supplier Credit
 *   Inventory
 *   Recoverable VAT
 *   Pending VAT
 * =========================================================
 */


/* =========================================================
 * 1. Dispatch Supplier Return Inventory
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
    numeric(18, 4);

  v_return_inventory_value
    numeric(18, 4);

  v_new_inventory_value
    numeric(18, 4);

  v_new_average_cost
    numeric(18, 4);

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
     *   quantity_on_hand × average_unit_cost
     *
     * Returned value:
     *
     *   exact historical Supplier Return cost
     * ----------------------------------------------------- */

    v_current_inventory_value :=
      round(
        v_stock.quantity_on_hand
        *
        v_stock.average_unit_cost,
        4
      );


    v_return_inventory_value :=
      round(
        v_item.return_cost,
        4
      );


    v_new_inventory_value :=
      round(
        v_current_inventory_value
        -
        v_return_inventory_value,
        4
      );


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
          4
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
 * 2. Permissions
 * ========================================================= */

revoke all
on function
  public.dispatch_supplier_return_inventory(
    uuid
  )
from public;


grant execute
on function
  public.dispatch_supplier_return_inventory(
    uuid
  )
to authenticated;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.dispatch_supplier_return_inventory(
    uuid
  )
is
  'Dispatches one approved Supplier Return as a posted supplier_return inventory transaction. Removes only unreserved available warehouse stock using the exact historical return cost and recalculates the remaining weighted-average inventory cost. GL posting is intentionally separate.';