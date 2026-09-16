/*
 * =========================================================
 * 192 — Sales Order Modification Preview Engine
 *
 * PURPOSE
 * -------
 * Adds a READ/CALCULATION-ONLY preview RPC for controlled
 * modification of financially posted Sales Orders.
 *
 * This migration:
 *   - DOES NOT modify sales_orders or sales_order_items;
 *   - DOES NOT bypass migration 158 immutability;
 *   - DOES NOT post GL;
 *   - DOES NOT move inventory;
 *   - DOES NOT rewrite Customer Receipts;
 *   - DOES NOT create Sales Returns.
 *
 * The RPC validates a proposed corrected commercial state,
 * recalculates invoice totals using the ERP's current formula,
 * compares it with the immutable current state, and returns
 * commercial / payment / inventory preview information.
 *
 * Genuine physical customer returns remain in the existing
 * Sales Return / Credit Note workflow.
 * =========================================================
 */


/* =========================================================
 * Preview Contract
 *
 * p_after_snapshot:
 *
 * {
 *   "header": {
 *     "invoice_discount_amount": 0,
 *     "shipping_amount": 0,
 *     "round_off_amount": 0,
 *     "customer_notes": null,
 *     "internal_notes": null
 *   },
 *   "items": [
 *     {
 *       "id": "existing-sales-order-item-uuid-or-null",
 *       "product_id": "uuid-or-null",
 *       "unit_id": "uuid-or-null",
 *       "warehouse_id": "uuid-or-null",
 *       "sku": "text-or-null",
 *       "item_name": "Required",
 *       "description": "text-or-null",
 *       "quantity": 1,
 *       "unit_price": 10,
 *       "discount_percentage": 0,
 *       "tax_percentage": 5,
 *       "fulfilment_method": "stock",
 *       "line_notes": "text-or-null"
 *     }
 *   ]
 * }
 *
 * Existing item omitted from items[] = proposed removal.
 * Item with null/missing id          = proposed new line.
 *
 * Header fields not listed above remain immutable in this
 * preview version. Customer/currency/order identity is not
 * silently changed.
 * =========================================================
 */

create or replace function public.preview_sales_order_modification(
  p_sales_order_id uuid,
  p_after_snapshot jsonb,
  p_modification_type text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_order public.sales_orders%rowtype;

  v_header jsonb;
  v_items jsonb;

  v_item jsonb;
  v_original_item public.sales_order_items%rowtype;

  v_item_id uuid;
  v_product_id uuid;
  v_unit_id uuid;
  v_warehouse_id uuid;

  v_item_name text;
  v_sku text;
  v_description text;
  v_fulfilment_method text;
  v_line_notes text;

  v_quantity numeric(18,4);
  v_unit_price numeric(18,4);
  v_discount_percentage numeric(9,4);
  v_tax_percentage numeric(9,4);

  v_gross numeric(18,2);
  v_item_discount numeric(18,2);
  v_line_subtotal numeric(18,2);
  v_allocated_invoice_discount numeric(18,2);
  v_taxable_base numeric(18,2);
  v_line_tax numeric(18,2);
  v_line_total numeric(18,2);

  v_subtotal numeric(18,2) := 0;
  v_item_discount_total numeric(18,2) := 0;
  v_net_item_total numeric(18,2) := 0;
  v_tax_amount numeric(18,2) := 0;

  v_invoice_discount numeric(18,2);
  v_shipping_amount numeric(18,2);
  v_round_off_amount numeric(18,2);
  v_revised_grand_total numeric(18,2);

  v_paid_amount numeric(18,2);
  v_revised_balance_due numeric(18,2);
  v_customer_credit_amount numeric(18,2);
  v_additional_amount_due numeric(18,2);
  v_existing_balance_due numeric(18,2);

  v_before_items jsonb;
  v_preview_items jsonb := '[]'::jsonb;
  v_inventory_changes jsonb := '[]'::jsonb;
  v_removed_items jsonb := '[]'::jsonb;

  v_before_snapshot jsonb;
  v_normalized_after_snapshot jsonb;
  v_difference_snapshot jsonb;

  v_existing_count integer;
  v_requested_existing_count integer;
  v_new_count integer := 0;
  v_changed_count integer := 0;
  v_removed_count integer := 0;

  v_original_quantity numeric(18,4);
  v_original_fulfilled numeric(18,4);
  v_inventory_delta numeric(18,4);
  v_inventory_action text;

  v_commercial_changed boolean;
  v_inventory_changed boolean;
begin
  /* =======================================================
   * Security
   * ======================================================= */

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception 'Administrator or manager access is required to preview Sales Order modifications.';
  end if;


  /* =======================================================
   * Input
   * ======================================================= */

  if p_sales_order_id is null then
    raise exception 'Sales Order ID is required.';
  end if;

  if p_modification_type not in (
    'entry_correction',
    'commercial_adjustment',
    'exchange_adjustment'
  ) then
    raise exception 'Invalid Sales Order modification type.';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null
     or length(trim(p_reason)) < 3
  then
    raise exception 'A modification reason of at least 3 characters is required.';
  end if;

  if p_after_snapshot is null
     or jsonb_typeof(p_after_snapshot) <> 'object'
  then
    raise exception 'Proposed Sales Order state must be a JSON object.';
  end if;

  v_header := coalesce(p_after_snapshot -> 'header', '{}'::jsonb);
  v_items := p_after_snapshot -> 'items';

  if jsonb_typeof(v_header) <> 'object' then
    raise exception 'Proposed header must be a JSON object.';
  end if;

  if v_items is null
     or jsonb_typeof(v_items) <> 'array'
  then
    raise exception 'Proposed items must be a JSON array.';
  end if;

  if jsonb_array_length(v_items) = 0 then
    raise exception 'A Sales Order modification must contain at least one resulting item.';
  end if;


  /* =======================================================
   * Lock/read Sales Order
   *
   * FOR SHARE prevents a concurrent destructive workflow
   * while keeping this function read/calculation-only.
   * ======================================================= */

  select *
  into v_order
  from public.sales_orders
  where id = p_sales_order_id
  for share;

  if not found then
    raise exception 'Sales Order was not found.';
  end if;

  if v_order.status = 'draft' then
    raise exception 'Draft Sales Orders should use the normal Edit Sales Order workflow.';
  end if;

  if v_order.status = 'cancelled' then
    raise exception 'Cancelled Sales Orders cannot be modified.';
  end if;

  if v_order.status = 'closed' then
    raise exception 'Closed Sales Orders cannot be modified directly.';
  end if;

  if v_order.status not in (
    'confirmed',
    'processing',
    'partially_fulfilled',
    'fulfilled',
    'completed'
  ) then
    raise exception 'Sales Order status "%" is not eligible for controlled modification.', v_order.status;
  end if;


  /* =======================================================
   * Reject identity/account ownership changes in preview v1
   * ======================================================= */

  if v_header ? 'customer_id'
     and nullif(v_header ->> 'customer_id', '')::uuid
         is distinct from v_order.customer_id
  then
    raise exception 'Customer cannot be changed in the posted Sales Order modification workflow.';
  end if;

  if v_header ? 'currency_code'
     and upper(trim(v_header ->> 'currency_code'))
         is distinct from upper(v_order.currency_code)
  then
    raise exception 'Currency cannot be changed in the posted Sales Order modification workflow.';
  end if;

  if v_header ? 'exchange_rate'
     and round((v_header ->> 'exchange_rate')::numeric, 8)
         is distinct from round(v_order.exchange_rate, 8)
  then
    raise exception 'Exchange rate cannot be changed in the posted Sales Order modification workflow.';
  end if;

  if v_header ? 'order_date'
     and (v_header ->> 'order_date')::date
         is distinct from v_order.order_date
  then
    raise exception 'Order date cannot be changed in the posted Sales Order modification workflow.';
  end if;


  /* =======================================================
   * Header Adjustments
   * ======================================================= */

  begin
    v_invoice_discount :=
      round(
        coalesce(
          nullif(v_header ->> 'invoice_discount_amount', '')::numeric,
          v_order.invoice_discount_amount,
          0
        ),
        2
      );

    v_shipping_amount :=
      round(
        coalesce(
          nullif(v_header ->> 'shipping_amount', '')::numeric,
          v_order.shipping_amount,
          0
        ),
        2
      );

    v_round_off_amount :=
      round(
        coalesce(
          nullif(v_header ->> 'round_off_amount', '')::numeric,
          v_order.round_off_amount,
          0
        ),
        2
      );
  exception
    when invalid_text_representation then
      raise exception 'Invoice discount, delivery charge and round-off must be valid numbers.';
  end;

  if v_invoice_discount < 0 then
    raise exception 'Invoice discount cannot be negative.';
  end if;

  if v_shipping_amount < 0 then
    raise exception 'Delivery charge cannot be negative.';
  end if;

  if v_round_off_amount < -10
     or v_round_off_amount > 10
  then
    raise exception 'Round-off must be between -10.00 and 10.00.';
  end if;


  /* =======================================================
   * Validate Existing Item IDs
   * ======================================================= */

  if exists (
    select 1
    from jsonb_array_elements(v_items) x
    where nullif(x ->> 'id', '') is not null
      and not exists (
        select 1
        from public.sales_order_items soi
        where soi.id = (x ->> 'id')::uuid
          and soi.sales_order_id = p_sales_order_id
      )
  ) then
    raise exception 'One or more proposed existing Sales Order items do not belong to this Sales Order.';
  end if;

  if (
    select count(*)
    from jsonb_array_elements(v_items) x
    where nullif(x ->> 'id', '') is not null
  ) <> (
    select count(distinct x ->> 'id')
    from jsonb_array_elements(v_items) x
    where nullif(x ->> 'id', '') is not null
  ) then
    raise exception 'The same Sales Order item cannot appear more than once in the proposed state.';
  end if;


  /* =======================================================
   * Pass 1 — validate lines and calculate gross/net totals
   * ======================================================= */

  for v_item in
    select value
    from jsonb_array_elements(v_items)
  loop
    begin
      v_item_id := nullif(v_item ->> 'id', '')::uuid;
      v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
      v_unit_id := nullif(v_item ->> 'unit_id', '')::uuid;
      v_warehouse_id := nullif(v_item ->> 'warehouse_id', '')::uuid;

      v_quantity := (v_item ->> 'quantity')::numeric;
      v_unit_price := (v_item ->> 'unit_price')::numeric;
      v_discount_percentage :=
        coalesce(nullif(v_item ->> 'discount_percentage', '')::numeric, 0);
      v_tax_percentage :=
        coalesce(nullif(v_item ->> 'tax_percentage', '')::numeric, 0);
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'One or more proposed Sales Order item values are invalid.';
    end;

    v_item_name := nullif(trim(coalesce(v_item ->> 'item_name', '')), '');
    v_sku := nullif(trim(coalesce(v_item ->> 'sku', '')), '');
    v_description := nullif(trim(coalesce(v_item ->> 'description', '')), '');
    v_fulfilment_method :=
      coalesce(
        nullif(trim(coalesce(v_item ->> 'fulfilment_method', '')), ''),
        'stock'
      );
    v_line_notes := nullif(trim(coalesce(v_item ->> 'line_notes', '')), '');

    if v_item_name is null then
      raise exception 'Every proposed Sales Order item requires an item name.';
    end if;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Every proposed Sales Order item quantity must be greater than zero.';
    end if;

    if v_unit_price is null or v_unit_price < 0 then
      raise exception 'Every proposed Sales Order item unit price must be zero or greater.';
    end if;

    if v_discount_percentage < 0 or v_discount_percentage > 100 then
      raise exception 'Item discount percentage must be between 0 and 100.';
    end if;

    if v_tax_percentage < 0 or v_tax_percentage > 100 then
      raise exception 'Item tax percentage must be between 0 and 100.';
    end if;

    if v_fulfilment_method not in (
      'stock',
      'local_purchase',
      'import_on_demand',
      'dropship',
      'service'
    ) then
      raise exception 'Invalid fulfilment method "%".', v_fulfilment_method;
    end if;

    if v_product_id is not null
       and not exists (
         select 1 from public.products p where p.id = v_product_id
       )
    then
      raise exception 'Proposed product % was not found.', v_product_id;
    end if;

    if v_unit_id is not null
       and not exists (
         select 1 from public.units u where u.id = v_unit_id
       )
    then
      raise exception 'Proposed unit % was not found.', v_unit_id;
    end if;

    if v_warehouse_id is not null
       and not exists (
         select 1 from public.warehouses w where w.id = v_warehouse_id
       )
    then
      raise exception 'Proposed warehouse % was not found.', v_warehouse_id;
    end if;

    /*
     * Keep an existing line's product identity stable.
     * Product replacement is represented as remove old + add new,
     * which produces a much clearer inventory/audit difference.
     */
    if v_item_id is not null then
      select *
      into v_original_item
      from public.sales_order_items
      where id = v_item_id
        and sales_order_id = p_sales_order_id;

      if v_product_id is distinct from v_original_item.product_id then
        raise exception 'Existing Sales Order item product cannot be replaced in-place. Remove the old line and add the new product as a new line.';
      end if;
    else
      v_new_count := v_new_count + 1;
    end if;

    v_gross :=
      round(v_quantity * v_unit_price, 2);

    v_item_discount :=
      round(
        v_gross * v_discount_percentage / 100,
        2
      );

    v_line_subtotal :=
      round(
        greatest(v_gross - v_item_discount, 0),
        2
      );

    v_subtotal :=
      round(v_subtotal + v_gross, 2);

    v_item_discount_total :=
      round(v_item_discount_total + v_item_discount, 2);

    v_net_item_total :=
      round(v_net_item_total + v_line_subtotal, 2);
  end loop;


  if v_invoice_discount > v_net_item_total then
    raise exception
      'Invoice discount % exceeds net merchandise value %.',
      v_invoice_discount,
      v_net_item_total;
  end if;


  /* =======================================================
   * Pass 2 — proportional invoice discount + VAT
   * ======================================================= */

  for v_item in
    select value
    from jsonb_array_elements(v_items)
  loop
    v_item_id := nullif(v_item ->> 'id', '')::uuid;
    v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
    v_unit_id := nullif(v_item ->> 'unit_id', '')::uuid;
    v_warehouse_id := nullif(v_item ->> 'warehouse_id', '')::uuid;

    v_item_name := nullif(trim(coalesce(v_item ->> 'item_name', '')), '');
    v_sku := nullif(trim(coalesce(v_item ->> 'sku', '')), '');
    v_description := nullif(trim(coalesce(v_item ->> 'description', '')), '');
    v_fulfilment_method :=
      coalesce(
        nullif(trim(coalesce(v_item ->> 'fulfilment_method', '')), ''),
        'stock'
      );
    v_line_notes := nullif(trim(coalesce(v_item ->> 'line_notes', '')), '');

    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit_price := (v_item ->> 'unit_price')::numeric;
    v_discount_percentage :=
      coalesce(nullif(v_item ->> 'discount_percentage', '')::numeric, 0);
    v_tax_percentage :=
      coalesce(nullif(v_item ->> 'tax_percentage', '')::numeric, 0);

    v_gross :=
      round(v_quantity * v_unit_price, 2);

    v_item_discount :=
      round(
        v_gross * v_discount_percentage / 100,
        2
      );

    v_line_subtotal :=
      round(
        greatest(v_gross - v_item_discount, 0),
        2
      );

    if v_net_item_total > 0 then
      v_allocated_invoice_discount :=
        round(
          v_invoice_discount
          * v_line_subtotal
          / v_net_item_total,
          2
        );
    else
      v_allocated_invoice_discount := 0;
    end if;

    v_taxable_base :=
      round(
        greatest(
          v_line_subtotal - v_allocated_invoice_discount,
          0
        ),
        2
      );

    v_line_tax :=
      round(
        v_taxable_base * v_tax_percentage / 100,
        2
      );

    v_line_total :=
      round(
        v_taxable_base + v_line_tax,
        2
      );

    v_tax_amount :=
      round(
        v_tax_amount + v_line_tax,
        2
      );

    v_original_quantity := 0;
    v_original_fulfilled := 0;
    v_inventory_delta := 0;
    v_inventory_action := 'none';

    if v_item_id is not null then
      select *
      into v_original_item
      from public.sales_order_items
      where id = v_item_id
        and sales_order_id = p_sales_order_id;

      v_original_quantity :=
        coalesce(v_original_item.quantity, 0);

      v_original_fulfilled :=
        coalesce(v_original_item.quantity_fulfilled, 0);

      /*
       * Inventory preview rule:
       *
       * For an ENTRY CORRECTION, only the portion that was
       * historically fulfilled can require restoration when
       * quantity is reduced.
       *
       * An increase above already fulfilled quantity is shown
       * as an additional issue requirement only when the order
       * is already fully fulfilled/completed.
       *
       * This is a PREVIEW. Migration 193 will perform exact
       * stock validation and posting atomically.
       */
      if p_modification_type = 'entry_correction'
         and v_quantity < v_original_fulfilled
      then
        v_inventory_delta :=
          round(v_original_fulfilled - v_quantity, 4);
        v_inventory_action := 'restore_stock';

      elsif p_modification_type = 'entry_correction'
            and v_order.fulfilment_status = 'fulfilled'
            and v_quantity > v_original_fulfilled
      then
        v_inventory_delta :=
          round(v_quantity - v_original_fulfilled, 4);
        v_inventory_action := 'issue_stock';
      end if;

      if
        round(v_original_item.quantity, 4)
          is distinct from round(v_quantity, 4)
        or round(v_original_item.unit_price, 4)
          is distinct from round(v_unit_price, 4)
        or round(v_original_item.discount_percentage, 4)
          is distinct from round(v_discount_percentage, 4)
        or round(v_original_item.tax_percentage, 4)
          is distinct from round(v_tax_percentage, 4)
        or v_original_item.unit_id
          is distinct from v_unit_id
        or v_original_item.warehouse_id
          is distinct from v_warehouse_id
        or v_original_item.sku
          is distinct from v_sku
        or v_original_item.item_name
          is distinct from v_item_name
        or v_original_item.description
          is distinct from v_description
        or v_original_item.fulfilment_method
          is distinct from v_fulfilment_method
        or v_original_item.line_notes
          is distinct from v_line_notes
      then
        v_changed_count := v_changed_count + 1;
      end if;

    else
      if p_modification_type = 'entry_correction'
         and v_order.fulfilment_status = 'fulfilled'
         and v_fulfilment_method = 'stock'
      then
        v_inventory_delta := round(v_quantity, 4);
        v_inventory_action := 'issue_stock';
      end if;
    end if;

    if v_inventory_action <> 'none' then
      v_inventory_changes :=
        v_inventory_changes
        ||
        jsonb_build_array(
          jsonb_build_object(
            'sales_order_item_id', v_item_id,
            'product_id', v_product_id,
            'warehouse_id',
              coalesce(v_warehouse_id, v_order.warehouse_id),
            'item_name', v_item_name,
            'action', v_inventory_action,
            'quantity', v_inventory_delta,
            'original_quantity', v_original_quantity,
            'original_fulfilled_quantity', v_original_fulfilled,
            'proposed_quantity', v_quantity
          )
        );
    end if;

    v_preview_items :=
      v_preview_items
      ||
      jsonb_build_array(
        jsonb_build_object(
          'id', v_item_id,
          'product_id', v_product_id,
          'unit_id', v_unit_id,
          'warehouse_id',
            coalesce(v_warehouse_id, v_order.warehouse_id),
          'sku', v_sku,
          'item_name', v_item_name,
          'description', v_description,
          'quantity', round(v_quantity, 4),
          'unit_price', round(v_unit_price, 4),
          'discount_percentage',
            round(v_discount_percentage, 4),
          'discount_amount', v_item_discount,
          'tax_percentage',
            round(v_tax_percentage, 4),
          'allocated_invoice_discount',
            v_allocated_invoice_discount,
          'taxable_base', v_taxable_base,
          'tax_amount', v_line_tax,
          'line_subtotal', v_line_subtotal,
          'line_total', v_line_total,
          'fulfilment_method', v_fulfilment_method,
          'line_notes', v_line_notes,
          'inventory_action', v_inventory_action,
          'inventory_quantity', v_inventory_delta
        )
      );
  end loop;


  /* =======================================================
   * Removed Existing Items
   * ======================================================= */

  select count(*)
  into v_existing_count
  from public.sales_order_items
  where sales_order_id = p_sales_order_id;

  select count(*)
  into v_requested_existing_count
  from jsonb_array_elements(v_items) x
  where nullif(x ->> 'id', '') is not null;

  v_removed_count :=
    greatest(
      v_existing_count - v_requested_existing_count,
      0
    );

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', soi.id,
          'product_id', soi.product_id,
          'warehouse_id',
            coalesce(soi.warehouse_id, v_order.warehouse_id),
          'item_name', soi.item_name,
          'quantity', soi.quantity,
          'quantity_fulfilled', soi.quantity_fulfilled,
          'inventory_action',
            case
              when p_modification_type = 'entry_correction'
                   and soi.quantity_fulfilled > 0
                then 'restore_stock'
              else 'none'
            end,
          'inventory_quantity',
            case
              when p_modification_type = 'entry_correction'
                then round(coalesce(soi.quantity_fulfilled, 0), 4)
              else 0
            end
        )
        order by soi.line_number, soi.id
      ),
      '[]'::jsonb
    )
  into v_removed_items
  from public.sales_order_items soi
  where soi.sales_order_id = p_sales_order_id
    and not exists (
      select 1
      from jsonb_array_elements(v_items) x
      where nullif(x ->> 'id', '')::uuid = soi.id
    );

  /*
   * Append inventory restoration preview for removed fulfilled
   * lines when this is an entry correction.
   */
  if p_modification_type = 'entry_correction' then
    select
      v_inventory_changes
      ||
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'sales_order_item_id', soi.id,
            'product_id', soi.product_id,
            'warehouse_id',
              coalesce(soi.warehouse_id, v_order.warehouse_id),
            'item_name', soi.item_name,
            'action', 'restore_stock',
            'quantity',
              round(coalesce(soi.quantity_fulfilled, 0), 4),
            'original_quantity', soi.quantity,
            'original_fulfilled_quantity',
              soi.quantity_fulfilled,
            'proposed_quantity', 0
          )
          order by soi.line_number, soi.id
        )
          filter (
            where coalesce(soi.quantity_fulfilled, 0) > 0
          ),
        '[]'::jsonb
      )
    into v_inventory_changes
    from public.sales_order_items soi
    where soi.sales_order_id = p_sales_order_id
      and not exists (
        select 1
        from jsonb_array_elements(v_items) x
        where nullif(x ->> 'id', '')::uuid = soi.id
      );
  end if;


  /* =======================================================
   * Final Totals
   * ======================================================= */

  v_revised_grand_total :=
    round(
      greatest(
        v_net_item_total
        - v_invoice_discount
        + v_tax_amount
        + v_shipping_amount
        + v_round_off_amount,
        0
      ),
      2
    );

  v_paid_amount :=
    round(
      coalesce(v_order.paid_amount, 0),
      2
    );

  v_existing_balance_due :=
    round(
      coalesce(v_order.balance_due, 0),
      2
    );

  v_revised_balance_due :=
    round(
      greatest(
        v_revised_grand_total - v_paid_amount,
        0
      ),
      2
    );

  v_customer_credit_amount :=
    round(
      greatest(
        v_paid_amount - v_revised_grand_total,
        0
      ),
      2
    );

  /*
   * "additional_amount_due" means the increase in what the
   * customer owes compared with the current open balance,
   * not the entire revised balance.
   */
  v_additional_amount_due :=
    round(
      greatest(
        v_revised_balance_due - v_existing_balance_due,
        0
      ),
      2
    );


  /* =======================================================
   * Before Snapshot
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        to_jsonb(soi)
        order by soi.line_number, soi.id
      ),
      '[]'::jsonb
    )
  into v_before_items
  from public.sales_order_items soi
  where soi.sales_order_id = p_sales_order_id;

  v_before_snapshot :=
    jsonb_build_object(
      'header',
        to_jsonb(v_order),
      'items',
        v_before_items
    );


  /* =======================================================
   * Normalized Proposed Snapshot
   * ======================================================= */

  v_normalized_after_snapshot :=
    jsonb_build_object(
      'header',
        jsonb_build_object(
          'sales_order_id', v_order.id,
          'order_number', v_order.order_number,
          'customer_id', v_order.customer_id,
          'order_date', v_order.order_date,
          'currency_code', v_order.currency_code,
          'exchange_rate', v_order.exchange_rate,
          'status', v_order.status,
          'fulfilment_status', v_order.fulfilment_status,
          'subtotal', v_subtotal,
          'discount_amount', v_item_discount_total,
          'invoice_discount_amount', v_invoice_discount,
          'tax_amount', v_tax_amount,
          'shipping_amount', v_shipping_amount,
          'round_off_amount', v_round_off_amount,
          'grand_total', v_revised_grand_total,
          'paid_amount', v_paid_amount,
          'balance_due', v_revised_balance_due,
          'customer_notes',
            case
              when v_header ? 'customer_notes'
                then nullif(v_header ->> 'customer_notes', '')
              else v_order.customer_notes
            end,
          'internal_notes',
            case
              when v_header ? 'internal_notes'
                then nullif(v_header ->> 'internal_notes', '')
              else v_order.internal_notes
            end
        ),
      'items',
        v_preview_items
    );


  /* =======================================================
   * Difference Snapshot
   * ======================================================= */

  v_inventory_changed :=
    jsonb_array_length(v_inventory_changes) > 0;

  v_commercial_changed :=
    round(v_order.grand_total, 2)
      is distinct from v_revised_grand_total
    or round(v_order.subtotal, 2)
      is distinct from v_subtotal
    or round(v_order.discount_amount, 2)
      is distinct from v_item_discount_total
    or round(v_order.invoice_discount_amount, 2)
      is distinct from v_invoice_discount
    or round(v_order.tax_amount, 2)
      is distinct from v_tax_amount
    or round(v_order.shipping_amount, 2)
      is distinct from v_shipping_amount
    or round(v_order.round_off_amount, 2)
      is distinct from v_round_off_amount
    or v_changed_count > 0
    or v_new_count > 0
    or v_removed_count > 0
    or (
      case
        when v_header ? 'customer_notes'
          then nullif(v_header ->> 'customer_notes', '')
        else v_order.customer_notes
      end
    ) is distinct from v_order.customer_notes
    or (
      case
        when v_header ? 'internal_notes'
          then nullif(v_header ->> 'internal_notes', '')
        else v_order.internal_notes
      end
    ) is distinct from v_order.internal_notes;

  if not v_commercial_changed then
    raise exception 'The proposed Sales Order state does not contain any changes.';
  end if;

  v_difference_snapshot :=
    jsonb_build_object(
      'totals',
        jsonb_build_object(
          'original_grand_total',
            round(v_order.grand_total, 2),
          'revised_grand_total',
            v_revised_grand_total,
          'total_difference',
            round(
              v_revised_grand_total
              - round(v_order.grand_total, 2),
              2
            ),
          'original_tax_amount',
            round(v_order.tax_amount, 2),
          'revised_tax_amount',
            v_tax_amount,
          'tax_difference',
            round(
              v_tax_amount
              - round(v_order.tax_amount, 2),
              2
            )
        ),
      'payments',
        jsonb_build_object(
          'paid_amount_preserved',
            v_paid_amount,
          'original_balance_due',
            v_existing_balance_due,
          'revised_balance_due',
            v_revised_balance_due,
          'additional_amount_due',
            v_additional_amount_due,
          'customer_credit_amount',
            v_customer_credit_amount
        ),
      'items',
        jsonb_build_object(
          'existing_item_count',
            v_existing_count,
          'changed_item_count',
            v_changed_count,
          'new_item_count',
            v_new_count,
          'removed_item_count',
            v_removed_count,
          'removed_items',
            v_removed_items
        ),
      'inventory',
        jsonb_build_object(
          'requires_inventory_correction',
            v_inventory_changed,
          'changes',
            v_inventory_changes
        ),
      'accounting',
        jsonb_build_object(
          'requires_commercial_correction',
            round(v_order.grand_total, 2)
              is distinct from v_revised_grand_total
            or round(v_order.tax_amount, 2)
              is distinct from v_tax_amount,
          'receipts_will_be_rewritten',
            false,
          'original_receipts_preserved',
            true,
          'posting_performed',
            false
        )
    );


  /* =======================================================
   * Return Preview
   * ======================================================= */

  return
    jsonb_build_object(
      'mode',
        'preview_only',
      'sales_order_id',
        v_order.id,
      'order_number',
        v_order.order_number,
      'status',
        v_order.status,
      'modification_type',
        p_modification_type,
      'reason',
        trim(p_reason),
      'eligible',
        true,
      'before_snapshot',
        v_before_snapshot,
      'after_snapshot',
        v_normalized_after_snapshot,
      'difference_snapshot',
        v_difference_snapshot,
      'revision_values',
        jsonb_build_object(
          'original_grand_total',
            round(v_order.grand_total, 2),
          'revised_grand_total',
            v_revised_grand_total,
          'total_difference',
            round(
              v_revised_grand_total
              - round(v_order.grand_total, 2),
              2
            ),
          'original_paid_amount',
            v_paid_amount,
          'revised_balance_due',
            v_revised_balance_due,
          'customer_credit_amount',
            v_customer_credit_amount,
          'additional_amount_due',
            v_additional_amount_due
        ),
      'warnings',
        case
          when p_modification_type in (
            'commercial_adjustment',
            'exchange_adjustment'
          )
          then jsonb_build_array(
            'Physical customer returns must use the existing Sales Return / Credit Note workflow.'
          )
          else '[]'::jsonb
        end
    );
end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function public.preview_sales_order_modification(
  uuid,
  jsonb,
  text,
  text
)
from public, anon;

grant execute
on function public.preview_sales_order_modification(
  uuid,
  jsonb,
  text,
  text
)
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function public.preview_sales_order_modification(
  uuid,
  jsonb,
  text,
  text
)
is
  'Read/calculation-only management preview for controlled modification of a financially posted Sales Order. Validates proposed commercial lines, recalculates item discounts, proportional invoice discount, VAT, delivery charge, round-off, payment difference and potential inventory correction without mutating Sales Orders, inventory, GL, receipts or Sales Returns.';
