/*
 * =========================================================
 * 121 — Fix Sales Return Inventory Receipt UUID Aggregate
 *
 * PostgreSQL does not support min(uuid).
 *
 * Recreates receive_sales_return_inventory() using a separate
 * warehouse lookup after validating that exactly one distinct
 * warehouse exists on the Sales Return.
 * =========================================================
 */


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
      v_item.original_unit_cost <
        0
    then
      raise exception
        'Sales Return line % contains invalid historical unit cost.',
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

          v_item.original_unit_cost,

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
 * Documentation
 * ========================================================= */

comment on function
  public.receive_sales_return_inventory(
    uuid
  )
is
  'Receives an approved resalable Sales Return into inventory. Creates one posted customer_return inventory transaction using historical original_unit_cost and updates warehouse stock using weighted-average costing.';