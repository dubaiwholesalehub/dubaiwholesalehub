/*
 * =========================================================
 * 120 — Sales Return Inventory Receipt
 *
 * PURPOSE
 * -------
 *
 * Provides controlled physical receipt of customer returns.
 *
 * Workflow:
 *
 *   draft
 *     -> approved
 *     -> received
 *
 *
 * APPROVAL
 * --------
 *
 * Revalidates:
 *
 *   - return exists
 *   - return contains items
 *   - quantities remain valid
 *   - all items belong to one warehouse
 *   - only resalable items are accepted by this workflow
 *
 *
 * RECEIPT
 * -------
 *
 * Creates one posted inventory transaction:
 *
 *   transaction_type = customer_return
 *
 * Each return line creates:
 *
 *   positive quantity_change
 *   historical original_unit_cost
 *
 *
 * Warehouse costing uses the existing weighted-average
 * inventory-cost method.
 *
 *
 * IMPORTANT
 * ---------
 *
 * This migration does NOT yet post the commercial Credit Note
 * or COGS reversal to the General Ledger.
 *
 * That will follow in migration 121.
 * =========================================================
 */


/* =========================================================
 * 1. Approve Sales Return
 * ========================================================= */

create or replace function
  public.approve_sales_return(
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

  v_warehouse_count integer;

begin

  /* =======================================================
   * Authentication
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


  if
    p_sales_return_id is null
  then
    raise exception
      'Sales Return is required.';
  end if;


  /* =======================================================
   * Lock Return
   * ======================================================= */

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


  /*
   * Idempotent approval.
   */

  if
    v_return.status =
      'approved'
  then
    return
      v_return.id;
  end if;


  if
    v_return.status <>
      'draft'
  then
    raise exception
      'Only draft Sales Returns can be approved. Return % is %.',
      v_return.return_number,
      v_return.status;
  end if;


  /* =======================================================
   * Revalidate Accounting Period
   * ======================================================= */

  perform
    public.get_gl_accounting_period(
      v_return.posting_date,
      true
    );


  /* =======================================================
   * Items Required
   * ======================================================= */

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


  /* =======================================================
   * Single-Warehouse Rule
   *
   * inventory_transactions has one warehouse_id.
   *
   * Multi-warehouse returns will require a future extension
   * with multiple inventory transaction headers.
   * ======================================================= */

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


  /* =======================================================
   * Condition Control
   *
   * Current warehouse_stock does not track stock condition.
   *
   * Therefore this production workflow only receives items
   * that are suitable for normal resale inventory.
   *
   * Damaged / defective / other condition handling will need
   * a quarantine or write-off workflow.
   * ======================================================= */

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
      'Sales Return % contains non-resalable items. Damaged/defective returns require a separate inventory disposition workflow.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Validate Item Costs / Quantities
   * ======================================================= */

  if exists (
    select
      1
    from
      public.sales_return_items
    where
      sales_return_id =
        v_return.id

      and
      (
        quantity_returned <=
          0

        or

        original_unit_cost <
          0
      )
  )
  then
    raise exception
      'Sales Return % contains invalid quantity or inventory cost.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Validate Return Totals
   * ======================================================= */

  if
    v_return.grand_total <=
      0
  then
    raise exception
      'Sales Return % has zero commercial value.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Approve
   * ======================================================= */

  perform
    set_config(
      'app.sales_return_internal_write',
      'on',
      true
    );


  update
    public.sales_returns
  set
    status =
      'approved',

    approved_at =
      now(),

    approved_by =
      v_user_id,

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      v_return.id;


  return
    v_return.id;

end;
$$;


/* =========================================================
 * 2. Receive Approved Sales Return Into Inventory
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

  v_current_average_cost numeric(18, 4);

  v_new_quantity numeric(18, 4);

  v_new_average_cost numeric(18, 4);

begin

  /* =======================================================
   * Authentication
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


  if
    p_sales_return_id is null
  then
    raise exception
      'Sales Return is required.';
  end if;


  /* =======================================================
   * Lock Sales Return
   * ======================================================= */

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


  /*
   * Idempotency:
   *
   * A successfully received return should simply return its
   * existing inventory transaction when called again.
   */

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


  /* =======================================================
   * Accounting Period
   *
   * Inventory receipt will later drive its COGS-reversal
   * journal, so the posting date must remain open.
   * ======================================================= */

  perform
    public.get_gl_accounting_period(
      v_return.posting_date,
      true
    );


  /* =======================================================
   * Validate Return Items
   * ======================================================= */

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
    ),

    min(
      warehouse_id
    )

  into
    v_warehouse_count,
    v_warehouse_id

  from
    public.sales_return_items

  where
    sales_return_id =
      v_return.id;


  if
    v_warehouse_count <>
      1
    or
    v_warehouse_id is null
  then
    raise exception
      'Sales Return % must contain items from exactly one warehouse.',
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


  /* =======================================================
   * Duplicate Inventory Protection
   * ======================================================= */

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

    /*
     * Repair header reference if the inventory movement
     * already exists but the return was not updated because
     * of an interrupted earlier request.
     */

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


  /* =======================================================
   * Generate Inventory Transaction Number
   *
   * Existing ERP format:
   *
   *   INV-YYYY-NNNNNN
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
   * Create Posted Customer Return Inventory Header
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


  /* =======================================================
   * Process Every Return Line
   * ======================================================= */

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
      v_item.original_unit_cost <
        0
    then
      raise exception
        'Sales Return line % contains invalid historical unit cost.',
        v_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Record Positive Customer Return Inventory Movement
     *
     * The source document is the Sales Return Item itself.
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

        v_item.quantity_returned,

        v_item.original_unit_cost,

        v_item.id,

        coalesce(
          v_item.return_reason,
          v_item.notes
        ),

        now()
      );


    /* -----------------------------------------------------
     * Lock Current Warehouse Stock
     * ----------------------------------------------------- */

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


    /* -----------------------------------------------------
     * First Stock For Product/Warehouse
     * ----------------------------------------------------- */

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

          v_item.original_unit_cost,

          now(),

          now(),
          now()
        );


    /* -----------------------------------------------------
     * Existing Stock — Weighted Average
     * ----------------------------------------------------- */

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
                v_item.original_unit_cost
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


  /* =======================================================
   * Mark Sales Return Received
   * ======================================================= */

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
 * 3. Permissions
 * ========================================================= */

revoke all
on function
  public.approve_sales_return(
    uuid
  )
from public;


grant execute
on function
  public.approve_sales_return(
    uuid
  )
to authenticated;


revoke all
on function
  public.receive_sales_return_inventory(
    uuid
  )
from public;


grant execute
on function
  public.receive_sales_return_inventory(
    uuid
  )
to authenticated;


/* =========================================================
 * 4. Documentation
 * ========================================================= */

comment on function
  public.approve_sales_return(
    uuid
  )
is
  'Approves a draft Sales Return after validating its accounting period, items, warehouse consistency, quantities, historical costs and resalable condition.';


comment on function
  public.receive_sales_return_inventory(
    uuid
  )
is
  'Receives an approved resalable Sales Return into inventory. Creates one posted customer_return inventory transaction using the Sales Return historical original_unit_cost and updates warehouse stock through weighted-average costing. Repeated calls are idempotent.';