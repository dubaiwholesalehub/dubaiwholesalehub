/*
 * HM ERP
 * Manual Inventory Operations
 *
 * Supports:
 * - Opening Balance
 * - Adjustment In
 * - Adjustment Out
 * - Stock Count
 *
 * Important:
 * - warehouse_stock is never edited directly by the UI
 * - quantity_available is generated automatically
 * - every stock change creates a posted inventory transaction
 * - stock cannot be reduced below reserved quantity
 * - incoming stock uses weighted-average costing
 */

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
  v_effective_unit_cost numeric(18, 4);

  v_current_on_hand numeric(18, 4);
  v_current_reserved numeric(18, 4);
  v_current_average_cost numeric(18, 4);

  v_new_on_hand numeric(18, 4);
  v_new_average_cost numeric(18, 4);

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

  v_reference_type :=
    case p_transaction_type

      when 'opening_balance'
        then 'opening_balance'

      when 'stock_count'
        then 'stock_count'

      else 'manual_adjustment'

    end;


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

revoke all
on function
  public.post_manual_inventory_transaction(
    text,
    uuid,
    date,
    text,
    text,
    text,
    jsonb
  )
from public;


grant execute
on function
  public.post_manual_inventory_transaction(
    text,
    uuid,
    date,
    text,
    text,
    text,
    jsonb
  )
to authenticated;


/*
 * =========================================================
 * Documentation
 * =========================================================
 */

comment on function
  public.post_manual_inventory_transaction(
    text,
    uuid,
    date,
    text,
    text,
    text,
    jsonb
  )
is
  'Posts audited manual inventory movements for opening balances, stock adjustments and physical stock counts. Updates warehouse stock atomically without directly modifying generated quantity_available.';