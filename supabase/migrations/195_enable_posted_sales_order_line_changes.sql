/* =========================================================
 * 195 - Posted Sales Order Add / Remove Line Extension
 *
 * Preserves historical rows and original GL/inventory evidence.
 * Removal is logical/revision-linked; physical DELETE remains prohibited.
 * ========================================================= */

alter table public.sales_order_items
  add column if not exists is_revision_removed boolean not null default false,
  add column if not exists revision_removed_at timestamptz,
  add column if not exists revision_removed_by uuid references public.profiles(id) on delete set null,
  add column if not exists revision_removed_revision_id uuid references public.sales_order_revisions(id) on delete restrict;

alter table public.sales_order_items
  drop constraint if exists sales_order_items_revision_removed_state_check;
alter table public.sales_order_items
  add constraint sales_order_items_revision_removed_state_check check (
    (is_revision_removed = false and revision_removed_at is null and revision_removed_revision_id is null)
    or
    (is_revision_removed = true and revision_removed_at is not null and revision_removed_revision_id is not null)
  );

create index if not exists sales_order_items_active_order_idx
  on public.sales_order_items(sales_order_id,line_number)
  where is_revision_removed = false;

alter table public.sales_order_revision_effects
  drop constraint if exists sales_order_revision_effects_type_check;
alter table public.sales_order_revision_effects
  add constraint sales_order_revision_effects_type_check check (
    effect_type in (
      'commercial_gl','inventory_restore','inventory_issue','inventory_gl',
      'customer_credit','additional_receivable','sales_order_update','sales_order_item_update',
      'sales_order_item_added','sales_order_item_removed'
    )
  );

create or replace function
  public.enforce_sales_order_item_lifecycle_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_parent_status text;
  v_new_parent_status text;

  v_order_id uuid;

  v_revision_write boolean := false;

  v_old_business jsonb;
  v_new_business jsonb;
begin

  if tg_op = 'INSERT' then

    v_order_id :=
      new.sales_order_id;


    select
      status
    into
      v_new_parent_status
    from
      public.sales_orders
    where
      id =
        v_order_id;


    if not found then
      raise exception
        'Parent Sales Order was not found.'
        using errcode = 'P0001';
    end if;


    if v_new_parent_status = 'draft' then
      return new;
    end if;


    v_revision_write :=
      public.is_authorized_sales_order_revision_write(
        v_order_id
      );


    if not v_revision_write then
      raise exception
        'Items cannot be added to a Sales Order in status "%". Confirmed Sales Order commercial lines are immutable.',
        v_new_parent_status
        using errcode = 'P0001';
    end if;


    /* Migration 195: a posted-line INSERT is allowed only inside the
     * transaction-local, revision-linked SECURITY DEFINER workflow. */
    if new.is_revision_removed then
      raise exception 'A newly added revision line cannot start in removed state.' using errcode = 'P0001';
    end if;
    return new;

  end if;


  if tg_op = 'DELETE' then

    v_order_id :=
      old.sales_order_id;


    select
      status
    into
      v_old_parent_status
    from
      public.sales_orders
    where
      id =
        v_order_id;


    if not found then
      return old;
    end if;


    if v_old_parent_status = 'draft' then
      return old;
    end if;


    /*
     * Never physically delete historical posted lines.
     */
    raise exception
      'Posted Sales Order lines cannot be deleted. Use a controlled quantity correction or Sales Return.'
      using errcode = 'P0001';

  end if;


  v_order_id :=
    old.sales_order_id;


  select
    status
  into
    v_old_parent_status
  from
    public.sales_orders
  where
    id =
      old.sales_order_id;


  if not found then
    raise exception
      'Original parent Sales Order was not found.'
      using errcode = 'P0001';
  end if;


  select
    status
  into
    v_new_parent_status
  from
    public.sales_orders
  where
    id =
      new.sales_order_id;


  if not found then
    raise exception
      'Target parent Sales Order was not found.'
      using errcode = 'P0001';
  end if;


  if v_old_parent_status = 'draft' then

    if v_new_parent_status <> 'draft' then
      raise exception
        'Sales Order items cannot be moved into a non-draft Sales Order.'
        using errcode = 'P0001';
    end if;

    return new;

  end if;


  if
    new.sales_order_id
      is distinct from
    old.sales_order_id
  then
    raise exception
      'Confirmed Sales Order items cannot be moved between Sales Orders.'
      using errcode = 'P0001';
  end if;


  v_revision_write :=
    public.is_authorized_sales_order_revision_write(
      old.sales_order_id
    );


  if v_revision_write then

    /*
     * Historical identity remains protected even during a
     * controlled revision.
     *
     * Product replacement is represented by a later explicit
     * exchange workflow, not by silently changing product_id.
     */
    if
      new.id is distinct from old.id
      or
      new.sales_order_id is distinct from old.sales_order_id
      or
      new.product_id is distinct from old.product_id
      or
      new.created_at is distinct from old.created_at
    then
      raise exception
        'Controlled Sales Order revision attempted to change a protected line identity field.'
        using errcode = 'P0001';
    end if;


    if new.is_revision_removed and new.revision_removed_revision_id is null then
      raise exception 'Revision-removed Sales Order lines require a revision reference.' using errcode = 'P0001';
    end if;

    if
      new.quantity <= 0
      or
      new.quantity_fulfilled < 0
      or
      new.quantity_fulfilled > new.quantity
    then
      raise exception
        'Controlled Sales Order revision produced invalid line quantities.'
        using errcode = 'P0001';
    end if;


    return new;

  end if;


  /*
   * Standard Migration-158 behavior.
   */
  v_old_business :=
    to_jsonb(old)
      - 'warehouse_id'
      - 'fulfilment_status'
      - 'quantity_reserved'
      - 'quantity_allocated'
      - 'quantity_fulfilled'
      - 'shortage_quantity'
      - 'procurement_required'
      - 'updated_at';

  v_new_business :=
    to_jsonb(new)
      - 'warehouse_id'
      - 'fulfilment_status'
      - 'quantity_reserved'
      - 'quantity_allocated'
      - 'quantity_fulfilled'
      - 'shortage_quantity'
      - 'procurement_required'
      - 'updated_at';


  if v_old_business is distinct from v_new_business then
    raise exception
      'Confirmed Sales Order item commercial fields are immutable. Use the controlled fulfilment or Sales Order modification workflow.'
      using errcode = 'P0001';
  end if;


  if
    new.quantity_fulfilled <
    old.quantity_fulfilled
  then
    raise exception
      'Sales Order fulfilled quantity cannot be reduced directly. Use the controlled Sales Return or Sales Order modification workflow.'
      using errcode = 'P0001';
  end if;


  if
    new.quantity_reserved < 0
    or
    new.quantity_allocated < 0
    or
    new.quantity_fulfilled < 0
    or
    new.quantity_cancelled < 0
    or
    new.shortage_quantity < 0
  then
    raise exception
      'Sales Order operational quantities cannot be negative.'
      using errcode = 'P0001';
  end if;


  return new;

end;
$$;




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
          and coalesce(soi.is_revision_removed,false) = false
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
        and sales_order_id = p_sales_order_id
        and coalesce(is_revision_removed,false) = false;

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
        and sales_order_id = p_sales_order_id
        and coalesce(is_revision_removed,false) = false;

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
  where sales_order_id = p_sales_order_id
    and coalesce(is_revision_removed,false) = false;

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
    and coalesce(soi.is_revision_removed,false) = false
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
      and coalesce(soi.is_revision_removed,false) = false
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
  where soi.sales_order_id = p_sales_order_id
    and coalesce(soi.is_revision_removed,false) = false;

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


create or replace function
  public.apply_sales_order_modification(
    p_sales_order_id uuid,
    p_after_snapshot jsonb,
    p_modification_type text,
    p_reason text,
    p_idempotency_key text,
    p_notes text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_order public.sales_orders%rowtype;
  v_item public.sales_order_items%rowtype;
  v_stock public.warehouse_stock%rowtype;

  v_preview jsonb;
  v_before_snapshot jsonb;
  v_normalized_after jsonb;
  v_difference_snapshot jsonb;

  v_revision_id uuid;
  v_existing_revision public.sales_order_revisions%rowtype;
  v_revision_number integer;

  v_header jsonb;
  v_items jsonb;
  v_proposed jsonb;

  v_existing_count integer;
  v_proposed_count integer;
  v_match_count integer;

  v_invoice_discount numeric(18,2);
  v_shipping numeric(18,2);
  v_round_off numeric(18,2);

  v_gross_subtotal numeric(18,2) := 0;
  v_item_discount_total numeric(18,2) := 0;
  v_net_item_total numeric(18,2) := 0;
  v_tax_total numeric(18,2) := 0;
  v_grand_total numeric(18,2) := 0;
  v_balance_due numeric(18,2) := 0;
  v_customer_credit numeric(18,2) := 0;
  v_additional_due numeric(18,2) := 0;

  v_line_subtotal numeric(18,2);
  v_line_discount numeric(18,2);
  v_line_net numeric(18,2);
  v_line_tax numeric(18,2);
  v_line_total numeric(18,2);
  v_allocated_invoice_discount numeric(18,2);
  v_adjusted_taxable numeric(18,2);

  v_new_quantity numeric(18,4);
  v_new_unit_price numeric(18,4);
  v_new_discount_percentage numeric(9,4);
  v_new_tax_percentage numeric(9,4);

  v_old_tax numeric(18,2);
  v_old_total numeric(18,2);
  v_old_revenue numeric(18,2);
  v_new_revenue numeric(18,2);
  v_delta_tax numeric(18,2);
  v_delta_total numeric(18,2);
  v_delta_revenue numeric(18,2);

  v_ar_account_id uuid;
  v_revenue_account_id uuid;
  v_vat_account_id uuid;
  v_inventory_account_id uuid;
  v_cogs_account_id uuid;

  v_gl_lines jsonb := '[]'::jsonb;
  v_inventory_gl_lines jsonb := '[]'::jsonb;
  v_commercial_journal_id uuid;
  v_inventory_journal_id uuid;

  v_restore_transaction_id uuid;
  v_issue_transaction_id uuid;
  v_inventory_transaction_number text;
  v_inventory_sequence bigint;

  v_restore_total numeric(20,8) := 0;
  v_issue_total numeric(20,8) := 0;
  v_qty_difference numeric(18,4);
  v_historical_unit_cost numeric(18,4);
  v_historical_valuation_cost numeric(20,8);
  v_current_average_cost numeric(20,8);
  v_new_stock_quantity numeric(18,4);
  v_new_average_cost numeric(20,8);
  v_current_stock_value numeric(28,8);
  v_change_value numeric(28,8);

  v_line_number integer;
  v_restore_line_number integer := 0;
  v_issue_line_number integer := 0;
  v_effect_sequence integer := 0;

  v_warehouse_id uuid;
  v_order_warehouse_count integer;
  v_delivery_item_id uuid;
  v_issue_match_count integer;

  v_payment_status text;
  v_result jsonb;
  v_new_item_id uuid;
  v_next_line_number integer;
  v_new_product_id uuid;
  v_new_unit_id uuid;
  v_new_warehouse_id uuid;
  v_new_item_name text;
  v_new_sku text;
  v_new_description text;
  v_new_fulfilment_method text;
  v_new_line_notes text;
begin
  /* ---------------- Security ---------------- */
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception 'Administrator access is required to apply Sales Order modifications.';
  end if;

  if p_sales_order_id is null then
    raise exception 'Sales Order ID is required.';
  end if;

  if p_after_snapshot is null or jsonb_typeof(p_after_snapshot) <> 'object' then
    raise exception 'After snapshot must be a JSON object.';
  end if;

  if p_modification_type not in ('entry_correction','commercial_adjustment') then
    raise exception 'Modification type must be entry_correction or commercial_adjustment in phase 193.';
  end if;

  if length(trim(coalesce(p_reason,''))) < 3 then
    raise exception 'Modification reason must contain at least 3 characters.';
  end if;

  if length(trim(coalesce(p_idempotency_key,''))) < 8 then
    raise exception 'A stable idempotency key of at least 8 characters is required.';
  end if;

  /* ---------------- Idempotency ---------------- */
  select *
  into v_existing_revision
  from public.sales_order_revisions
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    if v_existing_revision.sales_order_id is distinct from p_sales_order_id then
      raise exception 'Idempotency key already belongs to another Sales Order.';
    end if;

    if v_existing_revision.status = 'applied' then
      return jsonb_build_object(
        'revisionId', v_existing_revision.id,
        'revisionNumber', v_existing_revision.revision_number,
        'status', v_existing_revision.status,
        'salesOrderId', v_existing_revision.sales_order_id,
        'originalGrandTotal', v_existing_revision.original_grand_total,
        'revisedGrandTotal', v_existing_revision.revised_grand_total,
        'totalDifference', v_existing_revision.total_difference,
        'revisedBalanceDue', v_existing_revision.revised_balance_due,
        'customerCreditAmount', v_existing_revision.customer_credit_amount,
        'additionalAmountDue', v_existing_revision.additional_amount_due,
        'commercialJournalId', v_existing_revision.commercial_journal_entry_id,
        'inventoryJournalId', v_existing_revision.inventory_journal_entry_id,
        'inventoryTransactionId', v_existing_revision.inventory_transaction_id,
        'idempotentReplay', true
      );
    end if;

    raise exception 'Idempotency key already exists with revision status "%".', v_existing_revision.status;
  end if;

  /* ---------------- Lock order ---------------- */
  select *
  into v_order
  from public.sales_orders
  where id = p_sales_order_id
  for update;

  if not found then
    raise exception 'Sales Order was not found.';
  end if;

  if v_order.status not in ('fulfilled','completed') then
    raise exception
      'Posted Sales Order modification supports fulfilled/completed Sales Orders only. Current status is "%".',
      v_order.status;
  end if;

  /* Validate accounting period before any correction work. */
  perform public.get_gl_accounting_period(current_date, true);

  /* ---------------- Canonical preview validation ---------------- */
  v_preview := public.preview_sales_order_modification(
    p_sales_order_id,
    p_after_snapshot,
    p_modification_type,
    p_reason
  );

  if v_preview is null then
    raise exception 'Sales Order modification preview returned no result.';
  end if;

  /* We preserve the canonical preview as the difference audit payload. */
  v_difference_snapshot := v_preview;

  v_header := coalesce(p_after_snapshot -> 'header', '{}'::jsonb);
  v_items := p_after_snapshot -> 'items';

  if jsonb_typeof(v_items) <> 'array' then
    raise exception 'After snapshot items must be a JSON array.';
  end if;

  /* Migration 195: active existing lines may be omitted (removal), and
     null/missing IDs represent newly added lines. Removed historical rows are
     never treated as active invoice lines again. */
  select count(*) into v_existing_count
  from public.sales_order_items
  where sales_order_id = v_order.id
    and coalesce(is_revision_removed,false) = false;

  select jsonb_array_length(v_items) into v_proposed_count;

  if exists (
    select 1
    from jsonb_array_elements(v_items) p
    where nullif(p ->> 'id','') is not null
      and not exists (
        select 1 from public.sales_order_items soi
        where soi.id = nullif(p ->> 'id','')::uuid
          and soi.sales_order_id = v_order.id
          and coalesce(soi.is_revision_removed,false) = false
      )
  ) then
    raise exception 'One or more proposed existing Sales Order lines are not active lines of this Sales Order.';
  end if;

  if exists (
    select 1 from (
      select nullif(p ->> 'id','')::uuid as id, count(*) c
      from jsonb_array_elements(v_items) p
      where nullif(p ->> 'id','') is not null
      group by nullif(p ->> 'id','')::uuid
    ) d where d.c <> 1
  ) then
    raise exception 'Duplicate existing Sales Order item IDs are not allowed.';
  end if;

  /* One warehouse keeps phase-193 inventory correction atomic and explicit. */
  select count(distinct coalesce(soi.warehouse_id, v_order.warehouse_id))
  into v_order_warehouse_count
  from public.sales_order_items soi
  where soi.sales_order_id = v_order.id
    and coalesce(soi.is_revision_removed,false) = false
    and soi.product_id is not null;

  if v_order_warehouse_count > 1 then
    raise exception 'Posted Sales Order inventory correction currently supports one warehouse per Sales Order.';
  end if;

  /* ---------------- Recalculate corrected totals ---------------- */
  v_invoice_discount := round(coalesce(nullif(v_header ->> 'invoice_discount_amount','')::numeric, v_order.invoice_discount_amount, 0),2);
  v_shipping := round(coalesce(nullif(v_header ->> 'shipping_amount','')::numeric, v_order.shipping_amount, 0),2);
  v_round_off := round(coalesce(nullif(v_header ->> 'round_off_amount','')::numeric, v_order.round_off_amount, 0),2);

  if v_invoice_discount < 0 then
    raise exception 'Invoice discount cannot be negative.';
  end if;
  if v_shipping < 0 then
    raise exception 'Delivery charge cannot be negative.';
  end if;
  if v_round_off < -10 or v_round_off > 10 then
    raise exception 'Round off must be between -10 and 10.';
  end if;

  for v_proposed in
    select value from jsonb_array_elements(v_items)
  loop
    v_item := null;
    if nullif(v_proposed ->> 'id','') is not null then
      select * into v_item
      from public.sales_order_items
      where id = nullif(v_proposed ->> 'id','')::uuid
        and sales_order_id = v_order.id
        and coalesce(is_revision_removed,false) = false
      for update;
      if not found then
        raise exception 'Existing Sales Order line is not active.';
      end if;
    end if;

    v_new_quantity := nullif(v_proposed ->> 'quantity','')::numeric;
    v_new_unit_price := nullif(v_proposed ->> 'unit_price','')::numeric;
    v_new_discount_percentage := coalesce(nullif(v_proposed ->> 'discount_percentage','')::numeric,0);
    v_new_tax_percentage := coalesce(nullif(v_proposed ->> 'tax_percentage','')::numeric,0);

    if v_new_quantity is null or v_new_quantity <= 0 then
      raise exception 'Quantity must be greater than zero.';
    end if;
    if v_new_unit_price is null or v_new_unit_price < 0 then
      raise exception 'Unit price cannot be negative.';
    end if;
    if v_new_discount_percentage < 0 or v_new_discount_percentage > 100 then
      raise exception 'Discount percentage must be between 0 and 100.';
    end if;
    if v_new_tax_percentage < 0 or v_new_tax_percentage > 100 then
      raise exception 'Tax percentage must be between 0 and 100.';
    end if;

    if nullif(v_proposed ->> 'id','') is not null
       and v_item.product_id is distinct from nullif(v_proposed ->> 'product_id','')::uuid then
      raise exception 'Existing product identity cannot be replaced in-place. Remove the old line and add a new line.';
    end if;

    v_line_subtotal := round(v_new_quantity * v_new_unit_price, 2);
    v_line_discount := round(v_line_subtotal * v_new_discount_percentage / 100, 2);
    v_line_net := round(v_line_subtotal - v_line_discount, 2);

    v_gross_subtotal := v_gross_subtotal + v_line_subtotal;
    v_item_discount_total := v_item_discount_total + v_line_discount;
    v_net_item_total := v_net_item_total + v_line_net;
  end loop;

  if v_invoice_discount > v_net_item_total then
    raise exception 'Invoice discount cannot exceed merchandise value after item discounts.';
  end if;

  /* Header VAT after proportional invoice-level discount allocation. */
  for v_proposed in
    select value from jsonb_array_elements(v_items)
  loop
    v_new_quantity := nullif(v_proposed ->> 'quantity','')::numeric;
    v_new_unit_price := nullif(v_proposed ->> 'unit_price','')::numeric;
    v_new_discount_percentage := coalesce(nullif(v_proposed ->> 'discount_percentage','')::numeric,0);
    v_new_tax_percentage := coalesce(nullif(v_proposed ->> 'tax_percentage','')::numeric,0);

    v_line_subtotal := round(v_new_quantity * v_new_unit_price, 2);
    v_line_discount := round(v_line_subtotal * v_new_discount_percentage / 100, 2);
    v_line_net := round(v_line_subtotal - v_line_discount, 2);

    v_allocated_invoice_discount := case
      when v_net_item_total > 0
      then round(v_invoice_discount * v_line_net / v_net_item_total, 2)
      else 0
    end;

    v_adjusted_taxable := greatest(round(v_line_net - v_allocated_invoice_discount,2),0);
    v_tax_total := v_tax_total + round(v_adjusted_taxable * v_new_tax_percentage / 100,2);
  end loop;

  v_gross_subtotal := round(v_gross_subtotal,2);
  v_item_discount_total := round(v_item_discount_total,2);
  v_net_item_total := round(v_net_item_total,2);
  v_tax_total := round(v_tax_total,2);
  v_grand_total := greatest(round(v_net_item_total - v_invoice_discount + v_tax_total + v_shipping + v_round_off,2),0);
  v_balance_due := greatest(round(v_grand_total - coalesce(v_order.paid_amount,0),2),0);
  v_customer_credit := greatest(round(coalesce(v_order.paid_amount,0) - v_grand_total,2),0);
  v_additional_due := greatest(round(v_balance_due - coalesce(v_order.balance_due,0),2),0);

  /* Receipts are immutable.  Do not invent a refund/advance allocation here. */
  if v_customer_credit > 0 then
    raise exception
      'Corrected total would create customer credit of %. Existing receipts will not be rewritten. Use the customer-credit/refund workflow before applying this revision.',
      v_customer_credit;
  end if;

  /* ---------------- Immutable before snapshot ---------------- */
  select jsonb_build_object(
    'header', jsonb_build_object(
      'id', v_order.id,
      'order_number', v_order.order_number,
      'status', v_order.status,
      'fulfilment_status', v_order.fulfilment_status,
      'payment_status', v_order.payment_status,
      'customer_id', v_order.customer_id,
      'order_date', v_order.order_date,
      'currency_code', v_order.currency_code,
      'exchange_rate', v_order.exchange_rate,
      'subtotal', v_order.subtotal,
      'discount_amount', v_order.discount_amount,
      'invoice_discount_amount', coalesce(v_order.invoice_discount_amount,0),
      'tax_amount', v_order.tax_amount,
      'shipping_amount', v_order.shipping_amount,
      'round_off_amount', coalesce(v_order.round_off_amount,0),
      'grand_total', v_order.grand_total,
      'paid_amount', v_order.paid_amount,
      'balance_due', v_order.balance_due,
      'customer_notes', v_order.customer_notes,
      'internal_notes', v_order.internal_notes
    ),
    'items', coalesce((
      select jsonb_agg(to_jsonb(soi) order by soi.line_number)
      from public.sales_order_items soi
      where soi.sales_order_id = v_order.id
        and coalesce(soi.is_revision_removed,false) = false
    ), '[]'::jsonb)
  ) into v_before_snapshot;

  v_normalized_after := jsonb_build_object(
    'header', jsonb_build_object(
      'invoice_discount_amount', v_invoice_discount,
      'shipping_amount', v_shipping,
      'round_off_amount', v_round_off,
      'customer_notes', coalesce(v_header ->> 'customer_notes', v_order.customer_notes),
      'internal_notes', coalesce(v_header ->> 'internal_notes', v_order.internal_notes),
      'subtotal', v_gross_subtotal,
      'discount_amount', v_item_discount_total,
      'tax_amount', v_tax_total,
      'grand_total', v_grand_total,
      'paid_amount', v_order.paid_amount,
      'balance_due', v_balance_due
    ),
    'items', v_items
  );

  /* ---------------- Create draft revision ---------------- */
  perform pg_advisory_xact_lock(hashtext(v_order.id::text));

  select coalesce(max(revision_number),0) + 1
  into v_revision_number
  from public.sales_order_revisions
  where sales_order_id = v_order.id;

  insert into public.sales_order_revisions (
    sales_order_id,
    revision_number,
    modification_type,
    reason,
    notes,
    status,
    before_snapshot,
    after_snapshot,
    difference_snapshot,
    original_grand_total,
    revised_grand_total,
    total_difference,
    original_paid_amount,
    revised_balance_due,
    customer_credit_amount,
    additional_amount_due,
    idempotency_key,
    created_by,
    created_at
  ) values (
    v_order.id,
    v_revision_number,
    p_modification_type,
    trim(p_reason),
    p_notes,
    'draft',
    v_before_snapshot,
    v_normalized_after,
    v_difference_snapshot,
    round(v_order.grand_total,2),
    v_grand_total,
    round(v_grand_total - v_order.grand_total,2),
    coalesce(v_order.paid_amount,0),
    v_balance_due,
    v_customer_credit,
    v_additional_due,
    p_idempotency_key,
    v_user_id,
    now()
  ) returning id into v_revision_id;

  /* Transaction-local authorization for the lifecycle guards. */
  perform set_config(
    'app.sales_order_revision_internal_write',
    v_revision_id::text,
    true
  );

  /* ---------------- Inventory corrections ----------------
   * Quantity corrections on fulfilled documents mean the physical issue
   * itself was entered incorrectly. Genuine later customer returns belong
   * to Sales Return, not this RPC.
   */
  if p_modification_type <> 'entry_correction' and (
    exists (
      select 1 from jsonb_array_elements(v_items) p
      left join public.sales_order_items soi
        on soi.id = nullif(p ->> 'id','')::uuid
       and soi.sales_order_id = v_order.id
       and coalesce(soi.is_revision_removed,false) = false
      where nullif(p ->> 'id','') is null
         or round((p ->> 'quantity')::numeric,4) <> round(soi.quantity,4)
    )
    or exists (
      select 1 from public.sales_order_items soi
      where soi.sales_order_id = v_order.id
        and coalesce(soi.is_revision_removed,false) = false
        and not exists (
          select 1 from jsonb_array_elements(v_items) p
          where nullif(p ->> 'id','')::uuid = soi.id
        )
    )
  ) then
    raise exception 'Adding, removing or changing quantity on fulfilled Sales Orders requires modification_type = entry_correction.';
  end if;

  /* Resolve the single warehouse used by physical lines. */
  select coalesce(min(coalesce(soi.warehouse_id, v_order.warehouse_id)::text)::uuid, v_order.warehouse_id)
  into v_warehouse_id
  from public.sales_order_items soi
  where soi.sales_order_id = v_order.id
    and coalesce(soi.is_revision_removed,false) = false
    and soi.product_id is not null;

  /* Create restore header only if required. */
  if exists (
    select 1
    from public.sales_order_items soi
    where soi.sales_order_id = v_order.id
      and coalesce(soi.is_revision_removed,false) = false
      and coalesce(soi.quantity_fulfilled,0) > 0
      and (
        not exists (select 1 from jsonb_array_elements(v_items) p where nullif(p ->> 'id','')::uuid = soi.id)
        or exists (select 1 from jsonb_array_elements(v_items) p where nullif(p ->> 'id','')::uuid = soi.id and (p ->> 'quantity')::numeric < soi.quantity)
      )
  ) then
    v_inventory_sequence := nextval('public.inventory_transaction_number_seq');
    v_inventory_transaction_number := 'INV-' || extract(year from current_date)::integer || '-' || lpad(v_inventory_sequence::text,6,'0');

    insert into public.inventory_transactions (
      transaction_number, transaction_type, status, transaction_date,
      warehouse_id, reference_type, reference_id, reference_number,
      description, internal_notes, posted_at, created_by, posted_by,
      created_at, updated_at
    ) values (
      v_inventory_transaction_number, 'adjustment_in', 'posted', current_date,
      v_warehouse_id, 'sales_order_revision', v_revision_id, v_order.order_number,
      'Sales Order entry correction - stock restoration - ' || v_order.order_number,
      trim(p_reason), now(), v_user_id, v_user_id, now(), now()
    ) returning id into v_restore_transaction_id;
  end if;

  /* Create issue header only if required. */
  if exists (
    select 1
    from jsonb_array_elements(v_items) p
    left join public.sales_order_items soi
      on soi.id = nullif(p ->> 'id','')::uuid
     and soi.sales_order_id = v_order.id
     and coalesce(soi.is_revision_removed,false) = false
    where (nullif(p ->> 'id','') is null and coalesce(p ->> 'fulfilment_method','stock') = 'stock')
       or (soi.id is not null and (p ->> 'quantity')::numeric > soi.quantity)
  ) then
    v_inventory_sequence := nextval('public.inventory_transaction_number_seq');
    v_inventory_transaction_number := 'INV-' || extract(year from current_date)::integer || '-' || lpad(v_inventory_sequence::text,6,'0');

    insert into public.inventory_transactions (
      transaction_number, transaction_type, status, transaction_date,
      warehouse_id, reference_type, reference_id, reference_number,
      description, internal_notes, posted_at, created_by, posted_by,
      created_at, updated_at
    ) values (
      v_inventory_transaction_number, 'adjustment_out', 'posted', current_date,
      v_warehouse_id, 'sales_order_revision', v_revision_id, v_order.order_number,
      'Sales Order entry correction - additional stock issue - ' || v_order.order_number,
      trim(p_reason), now(), v_user_id, v_user_id, now(), now()
    ) returning id into v_issue_transaction_id;
  end if;

  /* Apply each existing line and its physical difference. */
  for v_proposed in
    select value from jsonb_array_elements(v_items)
    where nullif(value ->> 'id','') is not null
  loop
    select * into v_item
    from public.sales_order_items
    where id = (v_proposed ->> 'id')::uuid
      and sales_order_id = v_order.id
      and coalesce(is_revision_removed,false) = false
    for update;

    v_new_quantity := (v_proposed ->> 'quantity')::numeric;
    v_new_unit_price := (v_proposed ->> 'unit_price')::numeric;
    v_new_discount_percentage := coalesce(nullif(v_proposed ->> 'discount_percentage','')::numeric,0);
    v_new_tax_percentage := coalesce(nullif(v_proposed ->> 'tax_percentage','')::numeric,0);
    v_qty_difference := round(v_new_quantity - v_item.quantity,4);

    v_line_subtotal := round(v_new_quantity * v_new_unit_price,2);
    v_line_discount := round(v_line_subtotal * v_new_discount_percentage / 100,2);
    v_line_net := round(v_line_subtotal - v_line_discount,2);
    /* Item tax/line_total remain pre invoice-discount for compatibility;
       header VAT is the authoritative invoice-discount-adjusted VAT. */
    v_line_tax := round(v_line_net * v_new_tax_percentage / 100,2);
    v_line_total := round(v_line_net + v_line_tax,2);

    if v_qty_difference < 0 then
      if exists (
        select 1
        from public.sales_return_items sri
        join public.sales_returns sr on sr.id = sri.sales_return_id
        where sri.sales_order_item_id = v_item.id
          and sr.status <> 'cancelled'
      ) then
        raise exception
          'Sales Order line % already has Sales Return history. Quantity reduction must continue through the Sales Return workflow.',
          v_item.line_number;
      end if;

      /* Require one exact historical posted sales_issue source for this line.
       * Multi-delivery history is intentionally deferred to the extension.
       */
      select count(*), min(doi.id::text)::uuid
      into v_issue_match_count, v_delivery_item_id
      from public.delivery_order_items doi
      join public.inventory_transaction_items iti
        on iti.source_document_item_id = doi.id
       and iti.product_id = v_item.product_id
       and iti.warehouse_id = coalesce(v_item.warehouse_id, v_order.warehouse_id)
       and iti.quantity_change < 0
      join public.inventory_transactions it
        on it.id = iti.inventory_transaction_id
       and it.transaction_type = 'sales_issue'
       and it.status = 'posted'
      where doi.sales_order_item_id = v_item.id;

      if v_issue_match_count <> 1 then
        raise exception
          'Sales Order line % has % historical sales_issue sources. Phase 193 requires exactly one; use the multi-delivery extension.',
          v_item.line_number, v_issue_match_count;
      end if;

      select iti.unit_cost, iti.valuation_unit_cost
      into v_historical_unit_cost, v_historical_valuation_cost
      from public.inventory_transaction_items iti
      join public.inventory_transactions it on it.id = iti.inventory_transaction_id
      where iti.source_document_item_id = v_delivery_item_id
        and iti.product_id = v_item.product_id
        and iti.warehouse_id = coalesce(v_item.warehouse_id, v_order.warehouse_id)
        and iti.quantity_change < 0
        and it.transaction_type = 'sales_issue'
        and it.status = 'posted'
      limit 1;

      v_restore_line_number := v_restore_line_number + 1;

      insert into public.inventory_transaction_items (
        inventory_transaction_id, warehouse_id, product_id, line_number,
        quantity_change, unit_cost, valuation_unit_cost,
        source_document_item_id, notes, created_at
      ) values (
        v_restore_transaction_id,
        coalesce(v_item.warehouse_id, v_order.warehouse_id),
        v_item.product_id,
        v_restore_line_number,
        abs(v_qty_difference),
        v_historical_unit_cost,
        v_historical_valuation_cost,
        v_item.id,
        'Entry correction restore for ' || v_order.order_number || ' line ' || v_item.line_number,
        now()
      );

      select * into v_stock
      from public.warehouse_stock
      where warehouse_id = coalesce(v_item.warehouse_id, v_order.warehouse_id)
        and product_id = v_item.product_id
      for update;

      if not found then
        insert into public.warehouse_stock (
          warehouse_id, product_id, quantity_on_hand, quantity_reserved,
          average_unit_cost, last_transaction_at, created_at, updated_at
        ) values (
          coalesce(v_item.warehouse_id, v_order.warehouse_id),
          v_item.product_id,
          abs(v_qty_difference), 0,
          v_historical_valuation_cost,
          now(), now(), now()
        );
      else
        v_new_stock_quantity := v_stock.quantity_on_hand + abs(v_qty_difference);
        v_new_average_cost := case when v_new_stock_quantity > 0 then
          round(((v_stock.quantity_on_hand * v_stock.average_unit_cost) +
                 (abs(v_qty_difference) * v_historical_valuation_cost)) /
                v_new_stock_quantity,8)
          else 0 end;

        update public.warehouse_stock
        set quantity_on_hand = v_new_stock_quantity,
            average_unit_cost = v_new_average_cost,
            last_transaction_at = now(),
            updated_at = now()
        where id = v_stock.id;
      end if;

      v_change_value := round(abs(v_qty_difference) * v_historical_valuation_cost,8);
      v_restore_total := v_restore_total + v_change_value;

      v_effect_sequence := v_effect_sequence + 1;
      insert into public.sales_order_revision_effects (
        revision_id, sales_order_id, effect_type, effect_sequence,
        sales_order_item_id, product_id, warehouse_id,
        inventory_transaction_id, quantity_change, unit_cost, total_cost,
        effect_data, created_by
      ) values (
        v_revision_id, v_order.id, 'inventory_restore', v_effect_sequence,
        v_item.id, v_item.product_id, coalesce(v_item.warehouse_id,v_order.warehouse_id),
        v_restore_transaction_id, abs(v_qty_difference),
        v_historical_valuation_cost, v_change_value,
        jsonb_build_object('costBasis','historical_sales_issue','deliveryOrderItemId',v_delivery_item_id),
        v_user_id
      );

    elsif v_qty_difference > 0 then
      select * into v_stock
      from public.warehouse_stock
      where warehouse_id = coalesce(v_item.warehouse_id, v_order.warehouse_id)
        and product_id = v_item.product_id
      for update;

      if not found then
        raise exception 'No warehouse stock exists for additional issue on Sales Order line %.', v_item.line_number;
      end if;

      if (v_stock.quantity_on_hand - v_stock.quantity_reserved) < v_qty_difference then
        raise exception
          'Insufficient available stock for Sales Order line %. Required %, available %.',
          v_item.line_number, v_qty_difference,
          (v_stock.quantity_on_hand - v_stock.quantity_reserved);
      end if;

      v_current_average_cost := v_stock.average_unit_cost;
      v_issue_line_number := v_issue_line_number + 1;

      insert into public.inventory_transaction_items (
        inventory_transaction_id, warehouse_id, product_id, line_number,
        quantity_change, unit_cost, valuation_unit_cost,
        source_document_item_id, notes, created_at
      ) values (
        v_issue_transaction_id,
        coalesce(v_item.warehouse_id, v_order.warehouse_id),
        v_item.product_id,
        v_issue_line_number,
        -v_qty_difference,
        round(v_current_average_cost,4),
        v_current_average_cost,
        v_item.id,
        'Entry correction additional issue for ' || v_order.order_number || ' line ' || v_item.line_number,
        now()
      );

      update public.warehouse_stock
      set quantity_on_hand = quantity_on_hand - v_qty_difference,
          last_transaction_at = now(),
          updated_at = now()
      where id = v_stock.id;

      v_change_value := round(v_qty_difference * v_current_average_cost,8);
      v_issue_total := v_issue_total + v_change_value;

      v_effect_sequence := v_effect_sequence + 1;
      insert into public.sales_order_revision_effects (
        revision_id, sales_order_id, effect_type, effect_sequence,
        sales_order_item_id, product_id, warehouse_id,
        inventory_transaction_id, quantity_change, unit_cost, total_cost,
        effect_data, created_by
      ) values (
        v_revision_id, v_order.id, 'inventory_issue', v_effect_sequence,
        v_item.id, v_item.product_id, coalesce(v_item.warehouse_id,v_order.warehouse_id),
        v_issue_transaction_id, -v_qty_difference,
        v_current_average_cost, v_change_value,
        jsonb_build_object('costBasis','current_weighted_average'),
        v_user_id
      );
    end if;

    update public.sales_order_items
    set quantity = v_new_quantity,
        unit_price = v_new_unit_price,
        discount_percentage = v_new_discount_percentage,
        discount_amount = v_line_discount,
        tax_percentage = v_new_tax_percentage,
        tax_amount = v_line_tax,
        line_subtotal = v_line_subtotal,
        line_total = v_line_total,
        quantity_fulfilled = case
          when coalesce(quantity_fulfilled,0) > 0 then v_new_quantity
          else quantity_fulfilled
        end,
        updated_at = now()
    where id = v_item.id;

    v_effect_sequence := v_effect_sequence + 1;
    insert into public.sales_order_revision_effects (
      revision_id, sales_order_id, effect_type, effect_sequence,
      sales_order_item_id, product_id, warehouse_id,
      quantity_change, amount_change, effect_data, created_by
    ) values (
      v_revision_id, v_order.id, 'sales_order_item_update', v_effect_sequence,
      v_item.id, v_item.product_id, coalesce(v_item.warehouse_id,v_order.warehouse_id),
      v_qty_difference,
      round(v_line_total - coalesce(v_item.line_total,0),2),
      jsonb_build_object(
        'oldQuantity',v_item.quantity,'newQuantity',v_new_quantity,
        'oldUnitPrice',v_item.unit_price,'newUnitPrice',v_new_unit_price,
        'oldDiscountPercentage',v_item.discount_percentage,'newDiscountPercentage',v_new_discount_percentage,
        'oldTaxPercentage',v_item.tax_percentage,'newTaxPercentage',v_new_tax_percentage
      ),
      v_user_id
    );
  end loop;

  /* ---------------- Removed active lines ---------------- */
  for v_item in
    select soi.*
    from public.sales_order_items soi
    where soi.sales_order_id = v_order.id
      and coalesce(soi.is_revision_removed,false) = false
      and not exists (
        select 1 from jsonb_array_elements(v_items) p
        where nullif(p ->> 'id','')::uuid = soi.id
      )
    order by soi.line_number
    for update
  loop
    if exists (
      select 1 from public.sales_return_items sri
      join public.sales_returns sr on sr.id = sri.sales_return_id
      where sri.sales_order_item_id = v_item.id and sr.status <> 'cancelled'
    ) then
      raise exception 'Sales Order line % has Sales Return history and cannot be removed by entry correction.', v_item.line_number;
    end if;

    if coalesce(v_item.quantity_fulfilled,0) > 0 and v_item.product_id is not null then
      select count(*), min(doi.id::text)::uuid
      into v_issue_match_count, v_delivery_item_id
      from public.delivery_order_items doi
      join public.inventory_transaction_items iti
        on iti.source_document_item_id = doi.id
       and iti.product_id = v_item.product_id
       and iti.warehouse_id = coalesce(v_item.warehouse_id, v_order.warehouse_id)
       and iti.quantity_change < 0
      join public.inventory_transactions it
        on it.id = iti.inventory_transaction_id
       and it.transaction_type = 'sales_issue' and it.status = 'posted'
      where doi.sales_order_item_id = v_item.id;

      if v_issue_match_count <> 1 then
        raise exception 'Sales Order line % has % historical sales_issue sources. Removal requires exactly one.', v_item.line_number, v_issue_match_count;
      end if;

      select iti.unit_cost, iti.valuation_unit_cost
      into v_historical_unit_cost, v_historical_valuation_cost
      from public.inventory_transaction_items iti
      join public.inventory_transactions it on it.id = iti.inventory_transaction_id
      where iti.source_document_item_id = v_delivery_item_id
        and iti.product_id = v_item.product_id
        and iti.warehouse_id = coalesce(v_item.warehouse_id, v_order.warehouse_id)
        and iti.quantity_change < 0
        and it.transaction_type = 'sales_issue' and it.status = 'posted'
      limit 1;

      v_restore_line_number := v_restore_line_number + 1;
      insert into public.inventory_transaction_items (
        inventory_transaction_id, warehouse_id, product_id, line_number,
        quantity_change, unit_cost, valuation_unit_cost,
        source_document_item_id, notes, created_at
      ) values (
        v_restore_transaction_id, coalesce(v_item.warehouse_id,v_order.warehouse_id),
        v_item.product_id, v_restore_line_number, v_item.quantity_fulfilled,
        v_historical_unit_cost, v_historical_valuation_cost, v_item.id,
        'Entry correction removal restore for ' || v_order.order_number || ' line ' || v_item.line_number, now()
      );

      select * into v_stock from public.warehouse_stock
      where warehouse_id = coalesce(v_item.warehouse_id,v_order.warehouse_id)
        and product_id = v_item.product_id for update;

      if not found then
        insert into public.warehouse_stock (
          warehouse_id, product_id, quantity_on_hand, quantity_reserved,
          average_unit_cost, last_transaction_at, created_at, updated_at
        ) values (
          coalesce(v_item.warehouse_id,v_order.warehouse_id), v_item.product_id,
          v_item.quantity_fulfilled, 0, v_historical_valuation_cost, now(), now(), now()
        );
      else
        v_new_stock_quantity := v_stock.quantity_on_hand + v_item.quantity_fulfilled;
        v_new_average_cost := case when v_new_stock_quantity > 0 then
          round(((v_stock.quantity_on_hand*v_stock.average_unit_cost) +
                 (v_item.quantity_fulfilled*v_historical_valuation_cost))/v_new_stock_quantity,8)
          else 0 end;
        update public.warehouse_stock
        set quantity_on_hand=v_new_stock_quantity, average_unit_cost=v_new_average_cost,
            last_transaction_at=now(), updated_at=now()
        where id=v_stock.id;
      end if;

      v_change_value := round(v_item.quantity_fulfilled*v_historical_valuation_cost,8);
      v_restore_total := v_restore_total + v_change_value;
      v_effect_sequence := v_effect_sequence + 1;
      insert into public.sales_order_revision_effects (
        revision_id,sales_order_id,effect_type,effect_sequence,sales_order_item_id,
        product_id,warehouse_id,inventory_transaction_id,quantity_change,unit_cost,total_cost,effect_data,created_by
      ) values (
        v_revision_id,v_order.id,'inventory_restore',v_effect_sequence,v_item.id,v_item.product_id,
        coalesce(v_item.warehouse_id,v_order.warehouse_id),v_restore_transaction_id,v_item.quantity_fulfilled,
        v_historical_valuation_cost,v_change_value,
        jsonb_build_object('costBasis','historical_sales_issue','lineRemoval',true,'deliveryOrderItemId',v_delivery_item_id),v_user_id
      );
    end if;

    update public.sales_order_items
    set is_revision_removed=true,
        revision_removed_at=now(),
        revision_removed_by=v_user_id,
        revision_removed_revision_id=v_revision_id,
        fulfilment_status='cancelled',
        updated_at=now()
    where id=v_item.id;

    v_effect_sequence := v_effect_sequence + 1;
    insert into public.sales_order_revision_effects (
      revision_id,sales_order_id,effect_type,effect_sequence,sales_order_item_id,
      product_id,warehouse_id,quantity_change,amount_change,effect_data,created_by
    ) values (
      v_revision_id,v_order.id,'sales_order_item_removed',v_effect_sequence,v_item.id,v_item.product_id,
      coalesce(v_item.warehouse_id,v_order.warehouse_id),-coalesce(v_item.quantity,0),-coalesce(v_item.line_total,0),
      jsonb_build_object('historicalRowPreserved',true,'originalLineNumber',v_item.line_number),v_user_id
    );
  end loop;

  /* ---------------- Newly added lines ---------------- */
  select coalesce(max(line_number),0) into v_next_line_number
  from public.sales_order_items where sales_order_id=v_order.id;

  for v_proposed in
    select value from jsonb_array_elements(v_items)
    where nullif(value ->> 'id','') is null
  loop
    v_new_product_id := nullif(v_proposed ->> 'product_id','')::uuid;
    v_new_unit_id := nullif(v_proposed ->> 'unit_id','')::uuid;
    v_new_warehouse_id := coalesce(nullif(v_proposed ->> 'warehouse_id','')::uuid,v_order.warehouse_id);
    v_new_item_name := nullif(trim(coalesce(v_proposed ->> 'item_name','')),'');
    v_new_sku := nullif(trim(coalesce(v_proposed ->> 'sku','')),'');
    v_new_description := nullif(trim(coalesce(v_proposed ->> 'description','')),'');
    v_new_fulfilment_method := coalesce(nullif(trim(coalesce(v_proposed ->> 'fulfilment_method','')),''),'stock');
    v_new_line_notes := nullif(trim(coalesce(v_proposed ->> 'line_notes','')),'');
    v_new_quantity := (v_proposed ->> 'quantity')::numeric;
    v_new_unit_price := (v_proposed ->> 'unit_price')::numeric;
    v_new_discount_percentage := coalesce(nullif(v_proposed ->> 'discount_percentage','')::numeric,0);
    v_new_tax_percentage := coalesce(nullif(v_proposed ->> 'tax_percentage','')::numeric,0);
    v_line_subtotal := round(v_new_quantity*v_new_unit_price,2);
    v_line_discount := round(v_line_subtotal*v_new_discount_percentage/100,2);
    v_line_net := round(v_line_subtotal-v_line_discount,2);
    v_line_tax := round(v_line_net*v_new_tax_percentage/100,2);
    v_line_total := round(v_line_net+v_line_tax,2);
    v_next_line_number := v_next_line_number + 1;

    insert into public.sales_order_items (
      sales_order_id,line_number,product_id,unit_id,warehouse_id,sku,item_name,description,
      quantity,unit_price,discount_percentage,discount_amount,tax_percentage,tax_amount,
      line_subtotal,line_total,fulfilment_method,fulfilment_status,quantity_reserved,
      quantity_allocated,quantity_fulfilled,quantity_cancelled,shortage_quantity,
      procurement_required,line_notes,created_at,updated_at
    ) values (
      v_order.id,v_next_line_number,v_new_product_id,v_new_unit_id,v_new_warehouse_id,v_new_sku,v_new_item_name,v_new_description,
      v_new_quantity,v_new_unit_price,v_new_discount_percentage,v_line_discount,v_new_tax_percentage,v_line_tax,
      v_line_subtotal,v_line_total,v_new_fulfilment_method,'fulfilled',0,0,v_new_quantity,0,0,
      false,v_new_line_notes,now(),now()
    ) returning id into v_new_item_id;

    if v_new_fulfilment_method='stock' and v_new_product_id is not null then
      select * into v_stock from public.warehouse_stock
      where warehouse_id=v_new_warehouse_id and product_id=v_new_product_id for update;
      if not found then
        raise exception 'No warehouse stock exists for newly added product "%".',v_new_item_name;
      end if;
      if (v_stock.quantity_on_hand-v_stock.quantity_reserved) < v_new_quantity then
        raise exception 'Insufficient available stock for newly added product "%". Required %, available %.',
          v_new_item_name,v_new_quantity,(v_stock.quantity_on_hand-v_stock.quantity_reserved);
      end if;
      v_current_average_cost := v_stock.average_unit_cost;
      v_issue_line_number := v_issue_line_number + 1;
      insert into public.inventory_transaction_items (
        inventory_transaction_id,warehouse_id,product_id,line_number,quantity_change,
        unit_cost,valuation_unit_cost,source_document_item_id,notes,created_at
      ) values (
        v_issue_transaction_id,v_new_warehouse_id,v_new_product_id,v_issue_line_number,-v_new_quantity,
        round(v_current_average_cost,4),v_current_average_cost,v_new_item_id,
        'Entry correction new line issue for '||v_order.order_number||' line '||v_next_line_number,now()
      );
      update public.warehouse_stock
      set quantity_on_hand=quantity_on_hand-v_new_quantity,last_transaction_at=now(),updated_at=now()
      where id=v_stock.id;
      v_change_value := round(v_new_quantity*v_current_average_cost,8);
      v_issue_total := v_issue_total+v_change_value;
      v_effect_sequence := v_effect_sequence+1;
      insert into public.sales_order_revision_effects (
        revision_id,sales_order_id,effect_type,effect_sequence,sales_order_item_id,product_id,
        warehouse_id,inventory_transaction_id,quantity_change,unit_cost,total_cost,effect_data,created_by
      ) values (
        v_revision_id,v_order.id,'inventory_issue',v_effect_sequence,v_new_item_id,v_new_product_id,
        v_new_warehouse_id,v_issue_transaction_id,-v_new_quantity,v_current_average_cost,v_change_value,
        jsonb_build_object('costBasis','current_weighted_average','newLine',true),v_user_id
      );
    end if;

    v_effect_sequence := v_effect_sequence+1;
    insert into public.sales_order_revision_effects (
      revision_id,sales_order_id,effect_type,effect_sequence,sales_order_item_id,product_id,
      warehouse_id,quantity_change,amount_change,effect_data,created_by
    ) values (
      v_revision_id,v_order.id,'sales_order_item_added',v_effect_sequence,v_new_item_id,v_new_product_id,
      v_new_warehouse_id,v_new_quantity,v_line_total,
      jsonb_build_object('lineNumber',v_next_line_number,'itemName',v_new_item_name),v_user_id
    );
  end loop;

  /* ---------------- Commercial differential GL ---------------- */
  v_old_tax := round(coalesce(v_order.tax_amount,0),2);
  v_old_total := round(coalesce(v_order.grand_total,0),2);
  v_old_revenue := round(v_old_total - v_old_tax,2);
  v_new_revenue := round(v_grand_total - v_tax_total,2);
  v_delta_tax := round(v_tax_total - v_old_tax,2);
  v_delta_total := round(v_grand_total - v_old_total,2);
  v_delta_revenue := round(v_new_revenue - v_old_revenue,2);

  if v_delta_total <> 0 or v_delta_revenue <> 0 or v_delta_tax <> 0 then
    v_ar_account_id := public.get_mapped_gl_account('accounts_receivable');
    v_revenue_account_id := public.get_mapped_gl_account('sales_revenue');
    if v_delta_tax <> 0 then
      v_vat_account_id := public.get_mapped_gl_account('vat_payable');
    end if;

    /* AR: positive delta = debit; negative delta = credit. */
    if v_delta_total <> 0 then
      v_gl_lines := v_gl_lines || jsonb_build_array(jsonb_build_object(
        'glAccountId',v_ar_account_id,
        'debit',case when v_delta_total > 0 then v_delta_total else 0 end,
        'credit',case when v_delta_total < 0 then abs(v_delta_total) else 0 end,
        'baseDebit',case when v_delta_total > 0 then round(v_delta_total * v_order.exchange_rate,2) else 0 end,
        'baseCredit',case when v_delta_total < 0 then round(abs(v_delta_total) * v_order.exchange_rate,2) else 0 end,
        'description','Sales Order revision AR - ' || v_order.order_number,
        'customerId',v_order.customer_id
      ));
    end if;

    /* Revenue: positive delta = credit; negative delta = debit. */
    if v_delta_revenue <> 0 then
      v_gl_lines := v_gl_lines || jsonb_build_array(jsonb_build_object(
        'glAccountId',v_revenue_account_id,
        'debit',case when v_delta_revenue < 0 then abs(v_delta_revenue) else 0 end,
        'credit',case when v_delta_revenue > 0 then v_delta_revenue else 0 end,
        'baseDebit',case when v_delta_revenue < 0 then round(abs(v_delta_revenue) * v_order.exchange_rate,2) else 0 end,
        'baseCredit',case when v_delta_revenue > 0 then round(v_delta_revenue * v_order.exchange_rate,2) else 0 end,
        'description','Sales Order revision revenue - ' || v_order.order_number,
        'customerId',v_order.customer_id
      ));
    end if;

    /* VAT: positive delta = credit; negative delta = debit. */
    if v_delta_tax <> 0 then
      v_gl_lines := v_gl_lines || jsonb_build_array(jsonb_build_object(
        'glAccountId',v_vat_account_id,
        'debit',case when v_delta_tax < 0 then abs(v_delta_tax) else 0 end,
        'credit',case when v_delta_tax > 0 then v_delta_tax else 0 end,
        'baseDebit',case when v_delta_tax < 0 then round(abs(v_delta_tax) * v_order.exchange_rate,2) else 0 end,
        'baseCredit',case when v_delta_tax > 0 then round(v_delta_tax * v_order.exchange_rate,2) else 0 end,
        'description','Sales Order revision VAT - ' || v_order.order_number,
        'customerId',v_order.customer_id
      ));
    end if;

    v_commercial_journal_id := public.post_erp_gl_journal(
      'sales_order_revision_commercial',
      v_revision_id,
      v_order.order_number || '-R' || v_revision_number,
      current_date,
      current_date,
      'Sales Order revision commercial correction - ' || v_order.order_number,
      v_order.currency_code,
      v_order.exchange_rate,
      v_gl_lines
    );

    v_effect_sequence := v_effect_sequence + 1;
    insert into public.sales_order_revision_effects (
      revision_id, sales_order_id, effect_type, effect_sequence,
      journal_entry_id, amount_change, effect_data, created_by
    ) values (
      v_revision_id, v_order.id, 'commercial_gl', v_effect_sequence,
      v_commercial_journal_id, v_delta_total,
      jsonb_build_object('revenueDifference',v_delta_revenue,'taxDifference',v_delta_tax,'receivableDifference',v_delta_total),
      v_user_id
    );
  end if;

  /* ---------------- Inventory / COGS differential GL ---------------- */
  if v_restore_total <> 0 or v_issue_total <> 0 then
    v_inventory_account_id := public.get_mapped_gl_account('inventory');
    v_cogs_account_id := public.get_mapped_gl_account('cogs');

    if v_restore_total > 0 then
      v_inventory_gl_lines := v_inventory_gl_lines || jsonb_build_array(
        jsonb_build_object(
          'glAccountId',v_inventory_account_id,
          'debit',round(v_restore_total,2),'credit',0,
          'baseDebit',round(v_restore_total,2),'baseCredit',0,
          'description','Sales Order revision stock restoration - ' || v_order.order_number
        ),
        jsonb_build_object(
          'glAccountId',v_cogs_account_id,
          'debit',0,'credit',round(v_restore_total,2),
          'baseDebit',0,'baseCredit',round(v_restore_total,2),
          'description','Sales Order revision COGS reversal - ' || v_order.order_number
        )
      );
    end if;

    if v_issue_total > 0 then
      v_inventory_gl_lines := v_inventory_gl_lines || jsonb_build_array(
        jsonb_build_object(
          'glAccountId',v_cogs_account_id,
          'debit',round(v_issue_total,2),'credit',0,
          'baseDebit',round(v_issue_total,2),'baseCredit',0,
          'description','Sales Order revision additional COGS - ' || v_order.order_number
        ),
        jsonb_build_object(
          'glAccountId',v_inventory_account_id,
          'debit',0,'credit',round(v_issue_total,2),
          'baseDebit',0,'baseCredit',round(v_issue_total,2),
          'description','Sales Order revision additional inventory issue - ' || v_order.order_number
        )
      );
    end if;

    v_inventory_journal_id := public.post_erp_gl_journal(
      'sales_order_revision_inventory',
      v_revision_id,
      v_order.order_number || '-R' || v_revision_number,
      current_date,
      current_date,
      'Sales Order revision inventory correction - ' || v_order.order_number,
      'AED',
      1,
      v_inventory_gl_lines
    );

    v_effect_sequence := v_effect_sequence + 1;
    insert into public.sales_order_revision_effects (
      revision_id, sales_order_id, effect_type, effect_sequence,
      journal_entry_id, amount_change, effect_data, created_by
    ) values (
      v_revision_id, v_order.id, 'inventory_gl', v_effect_sequence,
      v_inventory_journal_id, round(v_issue_total - v_restore_total,2),
      jsonb_build_object('restoreCost',round(v_restore_total,8),'issueCost',round(v_issue_total,8)),
      v_user_id
    );
  end if;

  /* ---------------- Apply corrected header ---------------- */
  v_payment_status := case
    when coalesce(v_order.paid_amount,0) <= 0 then 'unpaid'
    when v_balance_due <= 0 then 'paid'
    else 'partially_paid'
  end;

  update public.sales_orders
  set subtotal = v_gross_subtotal,
      discount_amount = v_item_discount_total,
      invoice_discount_amount = v_invoice_discount,
      tax_amount = v_tax_total,
      shipping_amount = v_shipping,
      round_off_amount = v_round_off,
      grand_total = v_grand_total,
      balance_due = v_balance_due,
      payment_status = v_payment_status,
      customer_notes = coalesce(v_header ->> 'customer_notes', customer_notes),
      internal_notes = coalesce(v_header ->> 'internal_notes', internal_notes),
      updated_by = v_user_id,
      updated_at = now()
  where id = v_order.id;

  v_effect_sequence := v_effect_sequence + 1;
  insert into public.sales_order_revision_effects (
    revision_id, sales_order_id, effect_type, effect_sequence,
    amount_change, effect_data, created_by
  ) values (
    v_revision_id, v_order.id, 'sales_order_update', v_effect_sequence,
    v_delta_total,
    jsonb_build_object('oldGrandTotal',v_old_total,'newGrandTotal',v_grand_total,'oldBalanceDue',v_order.balance_due,'newBalanceDue',v_balance_due),
    v_user_id
  );

  if v_additional_due > 0 then
    v_effect_sequence := v_effect_sequence + 1;
    insert into public.sales_order_revision_effects (
      revision_id, sales_order_id, effect_type, effect_sequence,
      amount_change, effect_data, created_by
    ) values (
      v_revision_id, v_order.id, 'additional_receivable', v_effect_sequence,
      v_additional_due,
      jsonb_build_object('existingReceiptsPreserved',true),
      v_user_id
    );
  end if;

  /* ---------------- Finalize immutable revision ---------------- */
  update public.sales_order_revisions
  set status = 'applied',
      commercial_journal_entry_id = v_commercial_journal_id,
      inventory_journal_entry_id = v_inventory_journal_id,
      inventory_transaction_id = coalesce(v_restore_transaction_id,v_issue_transaction_id),
      applied_at = now(),
      applied_by = v_user_id
  where id = v_revision_id;

  /* Clear the transaction-local authorization context. */
  perform set_config('app.sales_order_revision_internal_write','',true);

  v_result := jsonb_build_object(
    'revisionId',v_revision_id,
    'revisionNumber',v_revision_number,
    'status','applied',
    'salesOrderId',v_order.id,
    'orderNumber',v_order.order_number,
    'originalGrandTotal',v_old_total,
    'revisedGrandTotal',v_grand_total,
    'totalDifference',v_delta_total,
    'originalPaidAmount',coalesce(v_order.paid_amount,0),
    'revisedBalanceDue',v_balance_due,
    'customerCreditAmount',v_customer_credit,
    'additionalAmountDue',v_additional_due,
    'commercialJournalId',v_commercial_journal_id,
    'inventoryJournalId',v_inventory_journal_id,
    'restoreInventoryTransactionId',v_restore_transaction_id,
    'issueInventoryTransactionId',v_issue_transaction_id,
    'receiptsPreserved',true,
    'preview',v_preview,
    'idempotentReplay',false
  );

  return v_result;
end;
$$;
