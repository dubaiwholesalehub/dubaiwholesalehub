/*
 * HM ERP
 * Unified Purchase Order Creation Engine
 *
 * Supports:
 * - Manual Purchase Orders
 * - Reorder Intelligence Purchase Orders
 *
 * RFQ Award Purchase Orders continue to use the existing
 * create_purchase_order_from_award() flow for now.
 *
 * This function:
 * - validates supplier
 * - validates items
 * - validates products
 * - generates a PO number automatically
 * - inserts the PO
 * - inserts all items
 * - calculates subtotal / discount / tax / totals
 * - returns the created Purchase Order
 */

create or replace function public.create_purchase_order(
  p_supplier_id uuid,
  p_source public.purchase_order_source default 'manual',
  p_currency_code text default 'AED',
  p_expected_delivery_date date default null,
  p_payment_terms text default null,
  p_incoterm text default null,
  p_loading_port text default null,
  p_delivery_location text default null,
  p_delivery_terms text default null,
  p_lead_time text default null,
  p_lead_time_days integer default null,
  p_packaging text default null,
  p_warranty text default null,
  p_supplier_notes text default null,
  p_internal_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns public.purchase_orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;

  v_purchase_order public.purchase_orders;

  v_supplier_exists boolean;

  v_item jsonb;

  v_product_id uuid;
  v_product record;

  v_line_number integer := 0;

  v_quantity numeric(14, 3);
  v_unit_price numeric(16, 4);

  v_discount_percent numeric(7, 4);
  v_discount_amount numeric(16, 4);

  v_line_subtotal numeric(16, 4);

  v_tax_percent numeric(7, 4);
  v_tax_amount numeric(16, 4);

  v_line_total numeric(16, 4);

  v_subtotal numeric(16, 4) := 0;
  v_total_discount numeric(16, 4) := 0;
  v_total_tax numeric(16, 4) := 0;
  v_total_amount numeric(16, 4) := 0;

  v_currency text;
begin
  /* =======================================================
   * Authentication
   * ======================================================= */

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Authentication is required to create a Purchase Order.';
  end if;


  /* =======================================================
   * Supplier Validation
   * ======================================================= */

  if p_supplier_id is null then
    raise exception
      'Supplier is required.';
  end if;

  select exists (
    select 1
    from public.suppliers
    where id = p_supplier_id
  )
  into v_supplier_exists;

  if not v_supplier_exists then
    raise exception
      'Supplier does not exist.';
  end if;


  /* =======================================================
   * Source Validation
   * ======================================================= */

  if p_source not in (
    'manual',
    'reorder'
  ) then
    raise exception
      'Unified Purchase Order creation currently supports manual and reorder sources only.';
  end if;


  /* =======================================================
   * Currency Validation
   * ======================================================= */

  v_currency :=
    upper(
      trim(
        coalesce(
          p_currency_code,
          'AED'
        )
      )
    );

  if char_length(v_currency) <> 3 then
    raise exception
      'Currency code must contain exactly 3 characters.';
  end if;


  /* =======================================================
   * Expected Delivery Validation
   * ======================================================= */

  if
    p_expected_delivery_date is not null
    and p_expected_delivery_date < current_date
  then
    raise exception
      'Expected delivery date cannot be before the Purchase Order date.';
  end if;


  if
    p_lead_time_days is not null
    and p_lead_time_days < 0
  then
    raise exception
      'Lead time days cannot be negative.';
  end if;


  /* =======================================================
   * Item Validation
   * ======================================================= */

  if
    p_items is null
    or jsonb_typeof(p_items) <> 'array'
  then
    raise exception
      'Purchase Order items must be provided as a JSON array.';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception
      'Purchase Order must contain at least one item.';
  end if;


  /* =======================================================
   * Create Draft Purchase Order
   * ======================================================= */

  insert into public.purchase_orders (
    status,
    source,

    rfq_id,
    supplier_id,
    supplier_quotation_id,

    order_date,
    expected_delivery_date,

    currency_code,

    subtotal,
    discount_amount,
    shipping_amount,
    tax_amount,
    other_charges,
    total_amount,

    payment_terms,
    incoterm,
    loading_port,
    delivery_location,
    delivery_terms,

    lead_time,
    lead_time_days,

    packaging,
    warranty,

    supplier_notes,
    internal_notes,

    created_by,
    updated_by
  )
  values (
    'draft',
    p_source,

    null,
    p_supplier_id,
    null,

    current_date,
    p_expected_delivery_date,

    v_currency,

    0,
    0,
    0,
    0,
    0,
    0,

    nullif(
      trim(
        coalesce(
          p_payment_terms,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_incoterm,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_loading_port,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_delivery_location,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_delivery_terms,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_lead_time,
          ''
        )
      ),
      ''
    ),

    p_lead_time_days,

    nullif(
      trim(
        coalesce(
          p_packaging,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_warranty,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_supplier_notes,
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

    v_user_id,
    v_user_id
  )
  returning *
  into v_purchase_order;


  /* =======================================================
   * Create Purchase Order Items
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

    begin
      v_product_id :=
        nullif(
          trim(
            v_item ->> 'productId'
          ),
          ''
        )::uuid;
    exception
      when others then
        raise exception
          'Invalid product ID on Purchase Order line %.',
          v_line_number;
    end;

    if v_product_id is null then
      raise exception
        'Product is required on Purchase Order line %.',
        v_line_number;
    end if;


    select
      p.id,
      p.name,
      p.sku,
      p.unit_id
    into v_product
    from public.products p
    where p.id = v_product_id;

    if not found then
      raise exception
        'Product does not exist on Purchase Order line %.',
        v_line_number;
    end if;


    /* -----------------------------------------------------
     * Quantity
     * ----------------------------------------------------- */

    begin
      v_quantity :=
        (v_item ->> 'quantity')::numeric;
    exception
      when others then
        raise exception
          'Invalid quantity on Purchase Order line %.',
          v_line_number;
    end;

    if
      v_quantity is null
      or v_quantity <= 0
    then
      raise exception
        'Quantity must be greater than zero on Purchase Order line %.',
        v_line_number;
    end if;


    /* -----------------------------------------------------
     * Unit Price
     * ----------------------------------------------------- */

    begin
      v_unit_price :=
        (v_item ->> 'unitPrice')::numeric;
    exception
      when others then
        raise exception
          'Invalid unit price on Purchase Order line %.',
          v_line_number;
    end;

    if
      v_unit_price is null
      or v_unit_price < 0
    then
      raise exception
        'Unit price cannot be negative on Purchase Order line %.',
        v_line_number;
    end if;


    /* -----------------------------------------------------
     * Discount
     * ----------------------------------------------------- */

    begin
      v_discount_percent :=
        coalesce(
          nullif(
            v_item ->> 'discountPercent',
            ''
          )::numeric,
          0
        );
    exception
      when others then
        raise exception
          'Invalid discount percentage on Purchase Order line %.',
          v_line_number;
    end;

    if
      v_discount_percent < 0
      or v_discount_percent > 100
    then
      raise exception
        'Discount percentage must be between 0 and 100 on Purchase Order line %.',
        v_line_number;
    end if;


    /* -----------------------------------------------------
     * Tax
     * ----------------------------------------------------- */

    begin
      v_tax_percent :=
        coalesce(
          nullif(
            v_item ->> 'taxPercent',
            ''
          )::numeric,
          0
        );
    exception
      when others then
        raise exception
          'Invalid tax percentage on Purchase Order line %.',
          v_line_number;
    end;

    if
      v_tax_percent < 0
      or v_tax_percent > 100
    then
      raise exception
        'Tax percentage must be between 0 and 100 on Purchase Order line %.',
        v_line_number;
    end if;


    /* -----------------------------------------------------
     * Line Calculations
     * ----------------------------------------------------- */

    v_line_subtotal :=
      round(
        v_quantity *
        v_unit_price,
        4
      );

    v_discount_amount :=
      round(
        v_line_subtotal *
        (
          v_discount_percent /
          100
        ),
        4
      );

    v_tax_amount :=
      round(
        (
          v_line_subtotal -
          v_discount_amount
        )
        *
        (
          v_tax_percent /
          100
        ),
        4
      );

    v_line_total :=
      round(
        v_line_subtotal -
        v_discount_amount +
        v_tax_amount,
        4
      );


    /* -----------------------------------------------------
     * Insert Line
     * ----------------------------------------------------- */

    insert into public.purchase_order_items (
      purchase_order_id,
      line_number,

      rfq_item_id,
      supplier_quotation_item_id,

      product_id,

      item_name,
      item_description,

      product_sku,
      supplier_sku,

      ordered_quantity,
      received_quantity,

      unit_id,

      unit_price,

      discount_percent,
      discount_amount,

      line_subtotal,

      tax_percent,
      tax_amount,

      line_total,

      lead_time,
      lead_time_days,

      packaging,
      warranty,

      item_notes
    )
    values (
      v_purchase_order.id,
      v_line_number,

      null,
      null,

      v_product.id,

      v_product.name,

      nullif(
        trim(
          coalesce(
            v_item ->> 'description',
            ''
          )
        ),
        ''
      ),

      v_product.sku,

      nullif(
        trim(
          coalesce(
            v_item ->> 'supplierSku',
            ''
          )
        ),
        ''
      ),

      v_quantity,
      0,

      v_product.unit_id,

      v_unit_price,

      v_discount_percent,
      v_discount_amount,

      v_line_subtotal,

      v_tax_percent,
      v_tax_amount,

      v_line_total,

      nullif(
        trim(
          coalesce(
            v_item ->> 'leadTime',
            ''
          )
        ),
        ''
      ),

      case
        when
          nullif(
            v_item ->> 'leadTimeDays',
            ''
          ) is null
        then null

        else
          (
            v_item ->>
            'leadTimeDays'
          )::integer
      end,

      nullif(
        trim(
          coalesce(
            v_item ->> 'packaging',
            ''
          )
        ),
        ''
      ),

      nullif(
        trim(
          coalesce(
            v_item ->> 'warranty',
            ''
          )
        ),
        ''
      ),

      nullif(
        trim(
          coalesce(
            v_item ->> 'notes',
            ''
          )
        ),
        ''
      )
    );


    /* -----------------------------------------------------
     * Accumulate Totals
     * ----------------------------------------------------- */

    v_subtotal :=
      v_subtotal +
      v_line_subtotal;

    v_total_discount :=
      v_total_discount +
      v_discount_amount;

    v_total_tax :=
      v_total_tax +
      v_tax_amount;

    v_total_amount :=
      v_total_amount +
      v_line_total;
  end loop;


  /* =======================================================
   * Update Header Totals
   * ======================================================= */

  update public.purchase_orders
  set
    subtotal =
      round(
        v_subtotal,
        4
      ),

    discount_amount =
      round(
        v_total_discount,
        4
      ),

    tax_amount =
      round(
        v_total_tax,
        4
      ),

    total_amount =
      round(
        v_total_amount,
        4
      ),

    updated_at =
      now(),

    updated_by =
      v_user_id

  where id =
    v_purchase_order.id

  returning *
  into v_purchase_order;


  return v_purchase_order;
end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function public.create_purchase_order(
  uuid,
  public.purchase_order_source,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text,
  jsonb
)
from public;


grant execute
on function public.create_purchase_order(
  uuid,
  public.purchase_order_source,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text,
  jsonb
)
to authenticated;


comment on function public.create_purchase_order(
  uuid,
  public.purchase_order_source,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text,
  jsonb
)
is
  'Creates a validated draft Purchase Order atomically for manual or reorder-driven procurement.';