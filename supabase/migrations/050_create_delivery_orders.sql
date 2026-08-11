/*
 * HM ERP — Delivery Orders
 *
 * Creates:
 *   1. Delivery order number sequence
 *   2. Delivery orders
 *   3. Delivery order items
 *   4. Number generator and triggers
 *   5. Audit and updated-at triggers
 *   6. Indexes
 *   7. Row-level security policies
 *
 * Inventory posting and dispatch workflow
 * will be added in migration 051.
 */


/* =========================================================
 * Delivery Order Number Sequence
 *
 * Example:
 *   DO-2026-000001
 * ========================================================= */

create sequence if not exists
  public.delivery_order_number_seq
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;


/* =========================================================
 * Delivery Orders
 * ========================================================= */

create table if not exists
  public.delivery_orders (
    id uuid primary key
      default gen_random_uuid(),

    delivery_number text
      not null unique,

    sales_order_id uuid not null
      references public.sales_orders(id)
      on delete restrict,

    customer_id uuid not null
      references public.customers(id)
      on delete restrict,

    shipping_address_id uuid
      references public.customer_addresses(id)
      on delete restrict,

    warehouse_id uuid not null
      references public.warehouses(id)
      on delete restrict,

    delivery_date date
      not null default current_date,

    requested_delivery_date date,

    expected_delivery_date date,

    dispatched_date date,

    delivered_date date,

    status text
      not null default 'draft',

    priority text
      not null default 'normal',

    delivery_method text
      not null default 'company_delivery',

    external_reference text,

    customer_reference text,

    tracking_number text,

    carrier_name text,

    vehicle_number text,

    driver_name text,

    driver_phone text,

    packing_notes text,

    delivery_notes text,

    internal_notes text,

    picked_at timestamptz,

    packed_at timestamptz,

    dispatched_at timestamptz,

    delivered_at timestamptz,

    cancelled_at timestamptz,

    picked_by uuid
      references auth.users(id)
      on delete set null,

    packed_by uuid
      references auth.users(id)
      on delete set null,

    dispatched_by uuid
      references auth.users(id)
      on delete set null,

    delivered_by uuid
      references auth.users(id)
      on delete set null,

    cancelled_by uuid
      references auth.users(id)
      on delete set null,

    created_by uuid
      references auth.users(id)
      on delete set null,

    updated_by uuid
      references auth.users(id)
      on delete set null,

    created_at timestamptz
      not null default now(),

    updated_at timestamptz
      not null default now(),

    constraint delivery_orders_number_not_empty
      check (
        length(trim(delivery_number)) > 0
      ),

    constraint delivery_orders_status_check
      check (
        status in (
          'draft',
          'picking',
          'picked',
          'packing',
          'packed',
          'dispatched',
          'delivered',
          'cancelled'
        )
      ),

    constraint delivery_orders_priority_check
      check (
        priority in (
          'low',
          'normal',
          'high',
          'urgent'
        )
      ),

    constraint delivery_orders_method_check
      check (
        delivery_method in (
          'company_delivery',
          'customer_pickup',
          'courier',
          'freight',
          'export_shipment',
          'dropship',
          'other'
        )
      ),

    constraint delivery_orders_requested_date_check
      check (
        requested_delivery_date is null
        or requested_delivery_date >= delivery_date
      ),

    constraint delivery_orders_expected_date_check
      check (
        expected_delivery_date is null
        or expected_delivery_date >= delivery_date
      ),

    constraint delivery_orders_expected_after_requested_check
      check (
        expected_delivery_date is null
        or requested_delivery_date is null
        or expected_delivery_date >= requested_delivery_date
      ),

    constraint delivery_orders_dispatched_date_check
      check (
        dispatched_date is null
        or dispatched_date >= delivery_date
      ),

    constraint delivery_orders_delivered_date_check
      check (
        delivered_date is null
        or delivered_date >= delivery_date
      ),

    constraint delivery_orders_delivered_after_dispatch_check
      check (
        delivered_date is null
        or dispatched_date is null
        or delivered_date >= dispatched_date
      ),

    constraint delivery_orders_picked_fields_check
      check (
        status not in (
          'picked',
          'packing',
          'packed',
          'dispatched',
          'delivered'
        )
        or picked_at is not null
      ),

    constraint delivery_orders_packed_fields_check
      check (
        status not in (
          'packed',
          'dispatched',
          'delivered'
        )
        or packed_at is not null
      ),

    constraint delivery_orders_dispatched_fields_check
      check (
        status not in (
          'dispatched',
          'delivered'
        )
        or (
          dispatched_at is not null
          and dispatched_date is not null
        )
      ),

    constraint delivery_orders_delivered_fields_check
      check (
        status <> 'delivered'
        or (
          delivered_at is not null
          and delivered_date is not null
        )
      ),

    constraint delivery_orders_cancelled_fields_check
      check (
        status <> 'cancelled'
        or cancelled_at is not null
      )
  );


/* =========================================================
 * Delivery Order Items
 * ========================================================= */

create table if not exists
  public.delivery_order_items (
    id uuid primary key
      default gen_random_uuid(),

    delivery_order_id uuid not null
      references public.delivery_orders(id)
      on delete cascade,

    sales_order_item_id uuid not null
      references public.sales_order_items(id)
      on delete restrict,

    line_number integer not null,

    product_id uuid
      references public.products(id)
      on delete restrict,

    unit_id uuid
      references public.units(id)
      on delete restrict,

    warehouse_id uuid not null
      references public.warehouses(id)
      on delete restrict,

    sku text,

    item_name text not null,

    description text,

    ordered_quantity numeric(18, 4)
      not null default 0,

    previously_delivered_quantity numeric(18, 4)
      not null default 0,

    delivery_quantity numeric(18, 4)
      not null default 0,

    picked_quantity numeric(18, 4)
      not null default 0,

    packed_quantity numeric(18, 4)
      not null default 0,

    dispatched_quantity numeric(18, 4)
      not null default 0,

    delivered_quantity numeric(18, 4)
      not null default 0,

    remaining_quantity numeric(18, 4)
      generated always as (
        greatest(
          ordered_quantity
          - previously_delivered_quantity
          - delivered_quantity,
          0
        )
      ) stored,

    unit_cost numeric(18, 4)
      not null default 0,

    batch_number text,

    lot_number text,

    serial_number text,

    manufacturing_date date,

    expiry_date date,

    line_notes text,

    created_at timestamptz
      not null default now(),

    updated_at timestamptz
      not null default now(),

    constraint delivery_order_items_line_positive
      check (
        line_number > 0
      ),

    constraint delivery_order_items_name_not_empty
      check (
        length(trim(item_name)) > 0
      ),

    constraint delivery_order_items_ordered_quantity_check
      check (
        ordered_quantity > 0
      ),

    constraint delivery_order_items_previous_quantity_check
      check (
        previously_delivered_quantity >= 0
      ),

    constraint delivery_order_items_delivery_quantity_check
      check (
        delivery_quantity > 0
      ),

    constraint delivery_order_items_picked_quantity_check
      check (
        picked_quantity >= 0
      ),

    constraint delivery_order_items_packed_quantity_check
      check (
        packed_quantity >= 0
      ),

    constraint delivery_order_items_dispatched_quantity_check
      check (
        dispatched_quantity >= 0
      ),

    constraint delivery_order_items_delivered_quantity_check
      check (
        delivered_quantity >= 0
      ),

    constraint delivery_order_items_unit_cost_check
      check (
        unit_cost >= 0
      ),

    constraint delivery_order_items_previous_limit
      check (
        previously_delivered_quantity
        <= ordered_quantity
      ),

    constraint delivery_order_items_delivery_limit
      check (
        delivery_quantity
        <= ordered_quantity
        - previously_delivered_quantity
      ),

    constraint delivery_order_items_picked_limit
      check (
        picked_quantity
        <= delivery_quantity
      ),

    constraint delivery_order_items_packed_limit
      check (
        packed_quantity
        <= picked_quantity
      ),

    constraint delivery_order_items_dispatched_limit
      check (
        dispatched_quantity
        <= packed_quantity
      ),

    constraint delivery_order_items_delivered_limit
      check (
        delivered_quantity
        <= dispatched_quantity
      ),

    constraint delivery_order_items_total_limit
      check (
        previously_delivered_quantity
        + delivered_quantity
        <= ordered_quantity
      ),

    constraint delivery_order_items_date_valid
      check (
        manufacturing_date is null
        or expiry_date is null
        or expiry_date >= manufacturing_date
      ),

    constraint delivery_order_items_unique_sales_line
      unique (
        delivery_order_id,
        sales_order_item_id
      ),

    constraint delivery_order_items_unique_line
      unique (
        delivery_order_id,
        line_number
      )
  );


/* =========================================================
 * Delivery Number Generator
 * ========================================================= */

create or replace function
  public.generate_delivery_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return
    'DO-'
    || to_char(
      current_date,
      'YYYY'
    )
    || '-'
    || lpad(
      nextval(
        'public.delivery_order_number_seq'
      )::text,
      6,
      '0'
    );
end;
$$;


/* =========================================================
 * Automatically Assign Delivery Number
 * ========================================================= */

create or replace function
  public.set_delivery_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.delivery_number is null
    or length(
      trim(new.delivery_number)
    ) = 0
  then
    new.delivery_number :=
      public.generate_delivery_order_number();
  end if;

  return new;
end;
$$;


drop trigger if exists
  set_delivery_order_number
on public.delivery_orders;


create trigger
  set_delivery_order_number
before insert
on public.delivery_orders
for each row
execute function
  public.set_delivery_order_number();


/* =========================================================
 * Delivery Order Audit Fields
 * ========================================================= */

create or replace function
  public.set_delivery_order_user_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by :=
      coalesce(
        new.created_by,
        auth.uid()
      );

    new.updated_by :=
      coalesce(
        new.updated_by,
        auth.uid()
      );
  else
    new.updated_by :=
      auth.uid();
  end if;

  return new;
end;
$$;


drop trigger if exists
  set_delivery_order_user_fields
on public.delivery_orders;


create trigger
  set_delivery_order_user_fields
before insert or update
on public.delivery_orders
for each row
execute function
  public.set_delivery_order_user_fields();


/* =========================================================
 * Updated At Triggers
 * ========================================================= */

drop trigger if exists
  set_delivery_orders_updated_at
on public.delivery_orders;


create trigger
  set_delivery_orders_updated_at
before update
on public.delivery_orders
for each row
execute function
  public.set_sales_updated_at();


drop trigger if exists
  set_delivery_order_items_updated_at
on public.delivery_order_items;


create trigger
  set_delivery_order_items_updated_at
before update
on public.delivery_order_items
for each row
execute function
  public.set_sales_updated_at();


/* =========================================================
 * Indexes — Delivery Orders
 * ========================================================= */

create index if not exists
  delivery_orders_sales_order_id_idx
on public.delivery_orders (
  sales_order_id
);


create index if not exists
  delivery_orders_customer_id_idx
on public.delivery_orders (
  customer_id
);


create index if not exists
  delivery_orders_warehouse_id_idx
on public.delivery_orders (
  warehouse_id
);


create index if not exists
  delivery_orders_status_idx
on public.delivery_orders (
  status
);


create index if not exists
  delivery_orders_delivery_date_idx
on public.delivery_orders (
  delivery_date desc
);


create index if not exists
  delivery_orders_expected_delivery_date_idx
on public.delivery_orders (
  expected_delivery_date
);


create index if not exists
  delivery_orders_tracking_number_idx
on public.delivery_orders (
  tracking_number
)
where tracking_number is not null;


create index if not exists
  delivery_orders_created_at_idx
on public.delivery_orders (
  created_at desc
);


/* =========================================================
 * Indexes — Delivery Order Items
 * ========================================================= */

create index if not exists
  delivery_order_items_delivery_order_id_idx
on public.delivery_order_items (
  delivery_order_id
);


create index if not exists
  delivery_order_items_sales_order_item_id_idx
on public.delivery_order_items (
  sales_order_item_id
);


create index if not exists
  delivery_order_items_product_id_idx
on public.delivery_order_items (
  product_id
);


create index if not exists
  delivery_order_items_warehouse_id_idx
on public.delivery_order_items (
  warehouse_id
);


create index if not exists
  delivery_order_items_batch_number_idx
on public.delivery_order_items (
  batch_number
)
where batch_number is not null;


create index if not exists
  delivery_order_items_expiry_date_idx
on public.delivery_order_items (
  expiry_date
)
where expiry_date is not null;


/* =========================================================
 * Row-Level Security
 * ========================================================= */

alter table public.delivery_orders
  enable row level security;


alter table public.delivery_order_items
  enable row level security;


/* =========================================================
 * Delivery Order Policies
 * ========================================================= */

drop policy if exists
  "Authenticated users can view delivery orders"
on public.delivery_orders;


create policy
  "Authenticated users can view delivery orders"
on public.delivery_orders
for select
to authenticated
using (true);


drop policy if exists
  "Authenticated users can create delivery orders"
on public.delivery_orders;


create policy
  "Authenticated users can create delivery orders"
on public.delivery_orders
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sales_orders sales_order
    where sales_order.id =
      delivery_orders.sales_order_id
      and sales_order.status in (
        'confirmed',
        'processing',
        'partially_fulfilled'
      )
  )
);


drop policy if exists
  "Authenticated users can update active delivery orders"
on public.delivery_orders;


create policy
  "Authenticated users can update active delivery orders"
on public.delivery_orders
for update
to authenticated
using (
  status not in (
    'delivered',
    'cancelled'
  )
)
with check (
  status in (
    'draft',
    'picking',
    'picked',
    'packing',
    'packed',
    'dispatched'
  )
);


drop policy if exists
  "Authenticated users can delete draft delivery orders"
on public.delivery_orders;


create policy
  "Authenticated users can delete draft delivery orders"
on public.delivery_orders
for delete
to authenticated
using (
  status = 'draft'
);


/* =========================================================
 * Delivery Order Item Policies
 * ========================================================= */

drop policy if exists
  "Authenticated users can view delivery order items"
on public.delivery_order_items;


create policy
  "Authenticated users can view delivery order items"
on public.delivery_order_items
for select
to authenticated
using (true);


drop policy if exists
  "Authenticated users can create delivery order items"
on public.delivery_order_items;


create policy
  "Authenticated users can create delivery order items"
on public.delivery_order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.delivery_orders delivery_order
    where delivery_order.id =
      delivery_order_items.delivery_order_id
      and delivery_order.status = 'draft'
  )
);


drop policy if exists
  "Authenticated users can update delivery order items"
on public.delivery_order_items;


create policy
  "Authenticated users can update delivery order items"
on public.delivery_order_items
for update
to authenticated
using (
  exists (
    select 1
    from public.delivery_orders delivery_order
    where delivery_order.id =
      delivery_order_items.delivery_order_id
      and delivery_order.status in (
        'draft',
        'picking',
        'picked',
        'packing',
        'packed'
      )
  )
)
with check (
  exists (
    select 1
    from public.delivery_orders delivery_order
    where delivery_order.id =
      delivery_order_items.delivery_order_id
      and delivery_order.status in (
        'draft',
        'picking',
        'picked',
        'packing',
        'packed'
      )
  )
);


drop policy if exists
  "Authenticated users can delete draft delivery order items"
on public.delivery_order_items;


create policy
  "Authenticated users can delete draft delivery order items"
on public.delivery_order_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.delivery_orders delivery_order
    where delivery_order.id =
      delivery_order_items.delivery_order_id
      and delivery_order.status = 'draft'
  )
);


/* =========================================================
 * Documentation
 * ========================================================= */

comment on table
  public.delivery_orders
is
  'Operational delivery documents created from confirmed sales orders. Supports partial and multiple deliveries.';


comment on table
  public.delivery_order_items
is
  'Delivery lines linked to sales order items. Tracks picking, packing, dispatch and delivered quantities.';


comment on column
  public.delivery_order_items.previously_delivered_quantity
is
  'Quantity already delivered for the linked sales order line before this delivery was created.';


comment on column
  public.delivery_order_items.delivery_quantity
is
  'Quantity planned for this specific delivery order.';


comment on column
  public.delivery_order_items.remaining_quantity
is
  'Automatically calculated undelivered quantity after this delivery.';