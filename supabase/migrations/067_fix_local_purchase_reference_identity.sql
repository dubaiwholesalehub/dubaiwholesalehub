/*
 * =========================================================
 * 067 — Fix Local Purchase Reference Identity
 *
 * Problem:
 *
 * post_local_purchase_inventory() previously used:
 *
 *   reference_type = 'supplier'
 *   reference_id   = supplier_id
 *
 * inventory_transactions has a unique index on:
 *
 *   transaction_type,
 *   reference_type,
 *   reference_id
 *
 * for posted transactions.
 *
 * This incorrectly meant that only ONE local purchase could
 * ever be posted for the same supplier.
 *
 * A supplier is not a unique source document. Multiple local
 * purchases from the same supplier are valid.
 *
 * Fix:
 *
 * - Continue validating the supplier.
 * - Do NOT use supplier_id as the inventory transaction's
 *   unique posting reference.
 * - Local purchases use NULL reference_type/reference_id.
 * - Preserve receipt number through reference_number.
 * - Preserve the existing inventory, weighted-average cost,
 *   warehouse-stock and transaction-line behavior.
 *
 * The unique inventory posting index is intentionally kept.
 * =========================================================
 */


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
  v_current_average_cost numeric(18, 4);

  v_new_quantity numeric(18, 4);
  v_new_average_cost numeric(18, 4);

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
     * Existing Stock — Weighted Average Cost
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
 * Permissions
 * ========================================================= */

revoke all
on function
  public.post_local_purchase_inventory(
    uuid,
    date,
    uuid,
    text,
    text,
    text,
    text,
    jsonb
  )
from public;


grant execute
on function
  public.post_local_purchase_inventory(
    uuid,
    date,
    uuid,
    text,
    text,
    text,
    text,
    jsonb
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.post_local_purchase_inventory(
    uuid,
    date,
    uuid,
    text,
    text,
    text,
    text,
    jsonb
  )
is
  'Posts inventory received through a direct local purchase without requiring a Purchase Order. Multiple local purchases from the same supplier are allowed because supplier ID is not used as the unique inventory posting reference.';