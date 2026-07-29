create sequence if not exists public.goods_receipt_number_seq
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;


create or replace function public.create_draft_goods_receipt(
  target_purchase_order_id uuid,
  target_warehouse_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  purchase_order_record public.purchase_orders%rowtype;
  warehouse_record public.warehouses%rowtype;

  new_goods_receipt_id uuid;
  new_receipt_number text;

  remaining_line_count integer;
  existing_open_receipt_number text;
begin
  if target_purchase_order_id is null then
    raise exception 'Purchase Order ID is required.';
  end if;

  if target_warehouse_id is null then
    raise exception 'Warehouse ID is required.';
  end if;

  /*
   * Lock the Purchase Order so two Goods Receipts cannot
   * be created against the same remaining quantities at
   * exactly the same time.
   */
  select *
  into purchase_order_record
  from public.purchase_orders
  where id = target_purchase_order_id
  for update;

  if not found then
    raise exception 'Purchase Order could not be found.';
  end if;

  if purchase_order_record.status::text not in (
    'sent',
    'partially_received'
  ) then
    raise exception
      'Purchase Order % cannot be received because its current status is "%".',
      purchase_order_record.po_number,
      purchase_order_record.status;
  end if;

  select *
  into warehouse_record
  from public.warehouses
  where id = target_warehouse_id;

  if not found then
    raise exception 'Warehouse could not be found.';
  end if;

  if warehouse_record.is_active is not true then
    raise exception
      'Warehouse % is inactive and cannot receive goods.',
      warehouse_record.name;
  end if;

  /*
   * Prevent multiple open drafts from reserving the same
   * Purchase Order quantities.
   */
  select receipt_number
  into existing_open_receipt_number
  from public.goods_receipts
  where purchase_order_id = target_purchase_order_id
    and status in ('draft', 'receiving')
  order by created_at desc
  limit 1;

  if existing_open_receipt_number is not null then
    raise exception
      'An open Goods Receipt (%) already exists for Purchase Order %.',
      existing_open_receipt_number,
      purchase_order_record.po_number;
  end if;

  select count(*)
  into remaining_line_count
  from public.purchase_order_items
  where purchase_order_id = target_purchase_order_id
    and product_id is not null
    and greatest(
      ordered_quantity - received_quantity,
      0
    ) > 0;

  if remaining_line_count = 0 then
    raise exception
      'Purchase Order % has no remaining quantities to receive.',
      purchase_order_record.po_number;
  end if;

  /*
   * Example:
   * GRN-2026-000001
   */
  new_receipt_number :=
    'GRN-' ||
    extract(year from current_date)::integer::text ||
    '-' ||
    lpad(
      nextval(
        'public.goods_receipt_number_seq'
      )::text,
      6,
      '0'
    );

  insert into public.goods_receipts (
    receipt_number,
    purchase_order_id,
    supplier_id,
    warehouse_id,
    status,
    created_by
  )
  values (
    new_receipt_number,
    purchase_order_record.id,
    purchase_order_record.supplier_id,
    warehouse_record.id,
    'draft',
    auth.uid()
  )
  returning id
  into new_goods_receipt_id;

  insert into public.goods_receipt_items (
    goods_receipt_id,
    purchase_order_item_id,
    product_id,
    line_number,

    ordered_quantity,
    previously_received_quantity,
    receiving_quantity,

    accepted_quantity,
    rejected_quantity,
    damaged_quantity,

    unit_cost,
    inspection_status
  )
  select
    new_goods_receipt_id,
    item.id,
    item.product_id,
    item.line_number,

    item.ordered_quantity,
    item.received_quantity,
    greatest(
      item.ordered_quantity -
      item.received_quantity,
      0
    ),

    0,
    0,
    0,

    item.unit_price,
    'pending'
  from public.purchase_order_items as item
  where item.purchase_order_id =
      target_purchase_order_id
    and item.product_id is not null
    and greatest(
      item.ordered_quantity -
      item.received_quantity,
      0
    ) > 0
  order by item.line_number;

  if not found then
    raise exception
      'No Goods Receipt items were created.';
  end if;

  return new_goods_receipt_id;
end;
$$;