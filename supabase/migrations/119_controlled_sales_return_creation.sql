/*
 * =========================================================
 * 119 — Controlled Sales Return Creation
 *
 * PURPOSE
 * -------
 *
 * Creates Sales Returns through one controlled RPC.
 *
 * Guarantees:
 *
 *   - authenticated administrator
 *   - valid Sales Order
 *   - valid Sales Order Item
 *   - valid Delivery Order Item
 *   - valid posted sales_issue
 *   - return cannot exceed the selected delivery issue
 *   - cumulative returns cannot exceed issued quantity
 *   - historical inventory cost comes from sales_issue
 *   - commercial values are derived from original SO line
 *   - header totals are calculated by the database
 *
 * This migration DOES NOT:
 *
 *   - increase warehouse stock
 *   - post the credit note to GL
 *   - reverse COGS
 *   - issue a cash refund
 *
 * Those remain separate controlled accounting events.
 * =========================================================
 */


/* =========================================================
 * 1. Create Draft Sales Return
 *
 * p_items JSON format:
 *
 * [
 *   {
 *     "salesOrderItemId": "uuid",
 *     "deliveryOrderItemId": "uuid",
 *     "quantityReturned": 2,
 *     "condition": "resalable",
 *     "reason": "Customer returned item",
 *     "notes": null
 *   }
 * ]
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
 * 2. Permissions
 * ========================================================= */

revoke all
on function
  public.create_sales_return(
    uuid,
    date,
    date,
    text,
    jsonb,
    text
  )
from public;


grant execute
on function
  public.create_sales_return(
    uuid,
    date,
    date,
    text,
    jsonb,
    text
  )
to authenticated;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.create_sales_return(
    uuid,
    date,
    date,
    text,
    jsonb,
    text
  )
is
  'Creates a controlled draft Sales Return from original Sales Order and Delivery Order lines. Validates returnable dispatched quantities, snapshots original Sales Order commercial values and resolves historical inventory cost from the original posted sales_issue inventory transaction.';