/*
 * HM ERP — Sales Orders
 *
 * Creates:
 *   1. Sales order number sequence
 *   2. Sales orders
 *   3. Sales order items
 *   4. Audit and updated-at triggers
 *   5. Indexes
 *   6. Row-level security policies
 *
 * Inventory reservation and quotation conversion
 * services will be added after the repository layer.
 */


/* =========================================================
 * Sales Order Number Sequence
 * ========================================================= */

create sequence if not exists
  public.sales_order_number_seq
  start with 1
  increment by 1;


/* =========================================================
 * Sales Orders
 * ========================================================= */

create table if not exists
  public.sales_orders (
    id uuid primary key default gen_random_uuid(),

    order_number text not null unique,

    quotation_id uuid
      references public.sales_quotations(id),

    customer_id uuid not null
      references public.customers(id),

    customer_contact_id uuid
      references public.customer_contacts(id),

    billing_address_id uuid
      references public.customer_addresses(id),

    shipping_address_id uuid
      references public.customer_addresses(id),

    warehouse_id uuid
      references public.warehouses(id),

    order_date date
      not null default current_date,

    requested_delivery_date date,

    expected_delivery_date date,

    status text
      not null default 'draft',

    fulfilment_status text
      not null default 'unplanned',

    payment_status text
      not null default 'unpaid',

    source text
      not null default 'internal',

    external_reference text,

    customer_reference text,

    currency_code text
      not null default 'AED',

    exchange_rate numeric(18, 8)
      not null default 1,

    subtotal numeric(18, 2)
      not null default 0,

    discount_amount numeric(18, 2)
      not null default 0,

    tax_amount numeric(18, 2)
      not null default 0,

    shipping_amount numeric(18, 2)
      not null default 0,

    grand_total numeric(18, 2)
      not null default 0,

    paid_amount numeric(18, 2)
      not null default 0,

    balance_due numeric(18, 2)
      not null default 0,

    payment_terms_days integer
      not null default 0,

    delivery_terms text,

    payment_terms text,

    customer_notes text,

    internal_notes text,

    confirmed_at timestamptz,

    processing_at timestamptz,

    completed_at timestamptz,

    cancelled_at timestamptz,

    closed_at timestamptz,

    created_by uuid,

    updated_by uuid,

    created_at timestamptz
      not null default now(),

    updated_at timestamptz
      not null default now(),

    constraint sales_orders_number_not_empty
      check (
        length(trim(order_number)) > 0
      ),

    constraint sales_orders_status_check
      check (
        status in (
          'draft',
          'confirmed',
          'processing',
          'partially_fulfilled',
          'fulfilled',
          'completed',
          'cancelled',
          'closed'
        )
      ),

    constraint sales_orders_fulfilment_status_check
      check (
        fulfilment_status in (
          'unplanned',
          'awaiting_stock',
          'awaiting_procurement',
          'partially_allocated',
          'allocated',
          'partially_fulfilled',
          'fulfilled',
          'not_required'
        )
      ),

    constraint sales_orders_payment_status_check
      check (
        payment_status in (
          'unpaid',
          'partially_paid',
          'paid',
          'overpaid',
          'refunded'
        )
      ),

    constraint sales_orders_source_check
      check (
        source in (
          'internal',
          'hmshoponline',
          'dubaiwholesalehub',
          'import'
        )
      ),

    constraint sales_orders_currency_check
      check (
        length(trim(currency_code)) = 3
      ),

    constraint sales_orders_exchange_rate_check
      check (
        exchange_rate > 0
      ),

    constraint sales_orders_subtotal_check
      check (
        subtotal >= 0
      ),

    constraint sales_orders_discount_check
      check (
        discount_amount >= 0
      ),

    constraint sales_orders_tax_check
      check (
        tax_amount >= 0
      ),

    constraint sales_orders_shipping_check
      check (
        shipping_amount >= 0
      ),

    constraint sales_orders_total_check
      check (
        grand_total >= 0
      ),

    constraint sales_orders_paid_amount_check
      check (
        paid_amount >= 0
      ),

    constraint sales_orders_balance_due_check
      check (
        balance_due >= 0
      ),

    constraint sales_orders_payment_terms_days_check
      check (
        payment_terms_days >= 0
      ),

    constraint sales_orders_requested_delivery_check
      check (
        requested_delivery_date is null
        or requested_delivery_date >= order_date
      ),

    constraint sales_orders_expected_delivery_check
      check (
        expected_delivery_date is null
        or expected_delivery_date >= order_date
      )
  );


/* =========================================================
 * One Sales Order per Quotation
 * ========================================================= */

create unique index if not exists
  sales_orders_quotation_id_unique_idx
on public.sales_orders (
  quotation_id
)
where quotation_id is not null;


/* =========================================================
 * Sales Order Items
 * ========================================================= */

create table if not exists
  public.sales_order_items (
    id uuid primary key default gen_random_uuid(),

    sales_order_id uuid not null
      references public.sales_orders(id)
      on delete cascade,

    quotation_item_id uuid
      references public.sales_quotation_items(id),

    line_number integer not null,

    product_id uuid
      references public.products(id),

    unit_id uuid
      references public.units(id),

    warehouse_id uuid
      references public.warehouses(id),

    sku text,

    item_name text not null,

    description text,

    quantity numeric(18, 4)
      not null default 1,

    unit_price numeric(18, 4)
      not null default 0,

    discount_percentage numeric(9, 4)
      not null default 0,

    discount_amount numeric(18, 2)
      not null default 0,

    tax_percentage numeric(9, 4)
      not null default 0,

    tax_amount numeric(18, 2)
      not null default 0,

    line_subtotal numeric(18, 2)
      not null default 0,

    line_total numeric(18, 2)
      not null default 0,

    fulfilment_method text
      not null default 'stock',

    procurement_lead_time_days integer
      not null default 0,

    allow_backorder boolean
      not null default false,

    procurement_notes text,

    fulfilment_status text
      not null default 'unplanned',

    quantity_reserved numeric(18, 4)
      not null default 0,

    quantity_allocated numeric(18, 4)
      not null default 0,

    quantity_fulfilled numeric(18, 4)
      not null default 0,

    quantity_cancelled numeric(18, 4)
      not null default 0,

    shortage_quantity numeric(18, 4)
      not null default 0,

    procurement_required boolean
      not null default false,

    requested_delivery_date date,

    expected_delivery_date date,

    line_notes text,

    created_at timestamptz
      not null default now(),

    updated_at timestamptz
      not null default now(),

    constraint sales_order_items_line_number_check
      check (
        line_number > 0
      ),

    constraint sales_order_items_name_not_empty
      check (
        length(trim(item_name)) > 0
      ),

    constraint sales_order_items_quantity_check
      check (
        quantity > 0
      ),

    constraint sales_order_items_unit_price_check
      check (
        unit_price >= 0
      ),

    constraint sales_order_items_discount_percentage_check
      check (
        discount_percentage >= 0
        and discount_percentage <= 100
      ),

    constraint sales_order_items_discount_amount_check
      check (
        discount_amount >= 0
      ),

    constraint sales_order_items_tax_percentage_check
      check (
        tax_percentage >= 0
        and tax_percentage <= 100
      ),

    constraint sales_order_items_tax_amount_check
      check (
        tax_amount >= 0
      ),

    constraint sales_order_items_subtotal_check
      check (
        line_subtotal >= 0
      ),

    constraint sales_order_items_total_check
      check (
        line_total >= 0
      ),

    constraint sales_order_items_fulfilment_method_check
      check (
        fulfilment_method in (
          'stock',
          'local_purchase',
          'import_on_demand',
          'dropship',
          'service'
        )
      ),

    constraint sales_order_items_procurement_lead_time_check
      check (
        procurement_lead_time_days >= 0
      ),

    constraint sales_order_items_fulfilment_status_check
      check (
        fulfilment_status in (
          'unplanned',
          'awaiting_stock',
          'awaiting_procurement',
          'partially_allocated',
          'allocated',
          'partially_fulfilled',
          'fulfilled',
          'not_required',
          'cancelled'
        )
      ),

    constraint sales_order_items_reserved_check
      check (
        quantity_reserved >= 0
      ),

    constraint sales_order_items_allocated_check
      check (
        quantity_allocated >= 0
      ),

    constraint sales_order_items_fulfilled_check
      check (
        quantity_fulfilled >= 0
      ),

    constraint sales_order_items_cancelled_check
      check (
        quantity_cancelled >= 0
      ),

    constraint sales_order_items_shortage_check
      check (
        shortage_quantity >= 0
      ),

    constraint sales_order_items_quantity_balance_check
      check (
        quantity_reserved <= quantity
        and quantity_allocated <= quantity
        and quantity_fulfilled <= quantity
        and quantity_cancelled <= quantity
      ),

    constraint sales_order_items_unique_line
      unique (
        sales_order_id,
        line_number
      )
  );


/* =========================================================
 * Sales Order Number Generator
 * ========================================================= */

create or replace function
  public.generate_sales_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return
    'SO-'
    || to_char(current_date, 'YYYY')
    || '-'
    || lpad(
      nextval(
        'public.sales_order_number_seq'
      )::text,
      6,
      '0'
    );
end;
$$;


create or replace function
  public.set_sales_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_number is null
    or length(trim(new.order_number)) = 0
  then
    new.order_number :=
      public.generate_sales_order_number();
  end if;

  return new;
end;
$$;


drop trigger if exists
  set_sales_order_number
on public.sales_orders;

create trigger set_sales_order_number
before insert
on public.sales_orders
for each row
execute function
  public.set_sales_order_number();


/* =========================================================
 * Sales Order Audit Fields
 * ========================================================= */

create or replace function
  public.set_sales_order_user_fields()
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
    new.updated_by := auth.uid();
  end if;

  return new;
end;
$$;


drop trigger if exists
  set_sales_order_user_fields
on public.sales_orders;

create trigger set_sales_order_user_fields
before insert or update
on public.sales_orders
for each row
execute function
  public.set_sales_order_user_fields();


/* =========================================================
 * Updated At
 * ========================================================= */

drop trigger if exists
  set_sales_orders_updated_at
on public.sales_orders;

create trigger set_sales_orders_updated_at
before update
on public.sales_orders
for each row
execute function
  public.set_sales_updated_at();


drop trigger if exists
  set_sales_order_items_updated_at
on public.sales_order_items;

create trigger set_sales_order_items_updated_at
before update
on public.sales_order_items
for each row
execute function
  public.set_sales_updated_at();


/* =========================================================
 * Automatic Balance Due
 * ========================================================= */

create or replace function
  public.calculate_sales_order_balance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.balance_due :=
    greatest(
      new.grand_total -
      new.paid_amount,
      0
    );

  if new.paid_amount = 0 then
    new.payment_status := 'unpaid';

  elsif new.paid_amount < new.grand_total then
    new.payment_status := 'partially_paid';

  elsif new.paid_amount = new.grand_total then
    new.payment_status := 'paid';

  elsif new.paid_amount > new.grand_total then
    new.payment_status := 'overpaid';
  end if;

  return new;
end;
$$;


drop trigger if exists
  calculate_sales_order_balance
on public.sales_orders;

create trigger calculate_sales_order_balance
before insert or update of
  grand_total,
  paid_amount
on public.sales_orders
for each row
execute function
  public.calculate_sales_order_balance();


/* =========================================================
 * Indexes
 * ========================================================= */

create index if not exists
  sales_orders_customer_id_idx
on public.sales_orders (
  customer_id
);

create index if not exists
  sales_orders_status_idx
on public.sales_orders (
  status
);

create index if not exists
  sales_orders_fulfilment_status_idx
on public.sales_orders (
  fulfilment_status
);

create index if not exists
  sales_orders_payment_status_idx
on public.sales_orders (
  payment_status
);

create index if not exists
  sales_orders_order_date_idx
on public.sales_orders (
  order_date desc
);

create index if not exists
  sales_orders_warehouse_id_idx
on public.sales_orders (
  warehouse_id
);

create index if not exists
  sales_orders_requested_delivery_date_idx
on public.sales_orders (
  requested_delivery_date
);

create index if not exists
  sales_order_items_sales_order_id_idx
on public.sales_order_items (
  sales_order_id
);

create index if not exists
  sales_order_items_product_id_idx
on public.sales_order_items (
  product_id
);

create index if not exists
  sales_order_items_warehouse_id_idx
on public.sales_order_items (
  warehouse_id
);

create index if not exists
  sales_order_items_fulfilment_method_idx
on public.sales_order_items (
  fulfilment_method
);

create index if not exists
  sales_order_items_fulfilment_status_idx
on public.sales_order_items (
  fulfilment_status
);

create index if not exists
  sales_order_items_procurement_required_idx
on public.sales_order_items (
  procurement_required
)
where procurement_required = true;


/* =========================================================
 * Row-Level Security
 * ========================================================= */

alter table public.sales_orders
  enable row level security;

alter table public.sales_order_items
  enable row level security;


/* =========================================================
 * Sales Order Policies
 * ========================================================= */

drop policy if exists
  "Authenticated users can view sales orders"
on public.sales_orders;

create policy
  "Authenticated users can view sales orders"
on public.sales_orders
for select
to authenticated
using (true);


drop policy if exists
  "Authenticated users can create sales orders"
on public.sales_orders;

create policy
  "Authenticated users can create sales orders"
on public.sales_orders
for insert
to authenticated
with check (true);


drop policy if exists
  "Authenticated users can update sales orders"
on public.sales_orders;

create policy
  "Authenticated users can update sales orders"
on public.sales_orders
for update
to authenticated
using (true)
with check (true);


drop policy if exists
  "Authenticated users can delete draft sales orders"
on public.sales_orders;

create policy
  "Authenticated users can delete draft sales orders"
on public.sales_orders
for delete
to authenticated
using (
  status = 'draft'
);


/* =========================================================
 * Sales Order Item Policies
 * ========================================================= */

drop policy if exists
  "Authenticated users can view sales order items"
on public.sales_order_items;

create policy
  "Authenticated users can view sales order items"
on public.sales_order_items
for select
to authenticated
using (true);


drop policy if exists
  "Authenticated users can create sales order items"
on public.sales_order_items;

create policy
  "Authenticated users can create sales order items"
on public.sales_order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sales_orders sales_order
    where sales_order.id =
      sales_order_items.sales_order_id
      and sales_order.status = 'draft'
  )
);


drop policy if exists
  "Authenticated users can update sales order items"
on public.sales_order_items;

create policy
  "Authenticated users can update sales order items"
on public.sales_order_items
for update
to authenticated
using (
  exists (
    select 1
    from public.sales_orders sales_order
    where sales_order.id =
      sales_order_items.sales_order_id
      and sales_order.status = 'draft'
  )
)
with check (
  exists (
    select 1
    from public.sales_orders sales_order
    where sales_order.id =
      sales_order_items.sales_order_id
      and sales_order.status = 'draft'
  )
);


drop policy if exists
  "Authenticated users can delete sales order items"
on public.sales_order_items;

create policy
  "Authenticated users can delete sales order items"
on public.sales_order_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.sales_orders sales_order
    where sales_order.id =
      sales_order_items.sales_order_id
      and sales_order.status = 'draft'
  )
);


/* =========================================================
 * Function Permissions
 * ========================================================= */

revoke all
on function
  public.generate_sales_order_number()
from public;

grant execute
on function
  public.generate_sales_order_number()
to authenticated;