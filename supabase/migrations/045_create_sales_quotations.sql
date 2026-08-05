/*
 * HM ERP — Sales Module
 *
 * Creates:
 *   1. Sales quotation number sequence
 *   2. Sales quotations
 *   3. Sales quotation items
 *   4. Number and updated-at triggers
 *   5. Indexes
 *   6. Row-level security
 */


/* =========================================================
 * Quotation Number Sequence
 * ========================================================= */

create sequence if not exists
  public.sales_quotation_number_seq
  start with 1
  increment by 1;


/* =========================================================
 * Sales Quotations
 * ========================================================= */

create table if not exists
  public.sales_quotations (
    id uuid primary key default gen_random_uuid(),

    quotation_number text not null unique,

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

    quotation_date date
      not null default current_date,

    valid_until date,

    status text
      not null default 'draft',

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

    payment_terms_days integer
      not null default 0,

    delivery_terms text,

    payment_terms text,

    customer_notes text,

    internal_notes text,

    sent_at timestamptz,

    accepted_at timestamptz,

    rejected_at timestamptz,

    expired_at timestamptz,

    cancelled_at timestamptz,

    converted_at timestamptz,

    converted_sales_order_id uuid,

    created_by uuid,

    updated_by uuid,

    created_at timestamptz
      not null default now(),

    updated_at timestamptz
      not null default now(),

    constraint sales_quotations_number_not_empty
      check (
        length(trim(quotation_number)) > 0
      ),

    constraint sales_quotations_status_check
      check (
        status in (
          'draft',
          'sent',
          'accepted',
          'rejected',
          'expired',
          'cancelled',
          'converted'
        )
      ),

    constraint sales_quotations_source_check
      check (
        source in (
          'internal',
          'hmshoponline',
          'dubaiwholesalehub',
          'import'
        )
      ),

    constraint sales_quotations_currency_check
      check (
        length(trim(currency_code)) = 3
      ),

    constraint sales_quotations_exchange_rate_check
      check (
        exchange_rate > 0
      ),

    constraint sales_quotations_subtotal_check
      check (
        subtotal >= 0
      ),

    constraint sales_quotations_discount_check
      check (
        discount_amount >= 0
      ),

    constraint sales_quotations_tax_check
      check (
        tax_amount >= 0
      ),

    constraint sales_quotations_shipping_check
      check (
        shipping_amount >= 0
      ),

    constraint sales_quotations_total_check
      check (
        grand_total >= 0
      ),

    constraint sales_quotations_payment_days_check
      check (
        payment_terms_days >= 0
      ),

    constraint sales_quotations_validity_check
      check (
        valid_until is null
        or valid_until >= quotation_date
      )
  );


/* =========================================================
 * Sales Quotation Items
 * ========================================================= */

create table if not exists
  public.sales_quotation_items (
    id uuid primary key default gen_random_uuid(),

    sales_quotation_id uuid not null
      references public.sales_quotations(id)
      on delete cascade,

    line_number integer not null,

    product_id uuid
      references public.products(id),

    unit_id uuid
      references public.units(id),

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

    requested_delivery_date date,

    line_notes text,

    created_at timestamptz
      not null default now(),

    updated_at timestamptz
      not null default now(),

    constraint sales_quotation_items_line_number_check
      check (
        line_number > 0
      ),

    constraint sales_quotation_items_name_not_empty
      check (
        length(trim(item_name)) > 0
      ),

    constraint sales_quotation_items_quantity_check
      check (
        quantity > 0
      ),

    constraint sales_quotation_items_unit_price_check
      check (
        unit_price >= 0
      ),

    constraint sales_quotation_items_discount_percentage_check
      check (
        discount_percentage >= 0
        and discount_percentage <= 100
      ),

    constraint sales_quotation_items_discount_amount_check
      check (
        discount_amount >= 0
      ),

    constraint sales_quotation_items_tax_percentage_check
      check (
        tax_percentage >= 0
        and tax_percentage <= 100
      ),

    constraint sales_quotation_items_tax_amount_check
      check (
        tax_amount >= 0
      ),

    constraint sales_quotation_items_subtotal_check
      check (
        line_subtotal >= 0
      ),

    constraint sales_quotation_items_total_check
      check (
        line_total >= 0
      ),

    constraint sales_quotation_items_unique_line
      unique (
        sales_quotation_id,
        line_number
      )
  );


/* =========================================================
 * Quotation Number Generator
 * ========================================================= */

create or replace function
  public.generate_sales_quotation_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return
    'SQ-'
    || to_char(current_date, 'YYYY')
    || '-'
    || lpad(
      nextval(
        'public.sales_quotation_number_seq'
      )::text,
      6,
      '0'
    );
end;
$$;


create or replace function
  public.set_sales_quotation_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.quotation_number is null
    or length(trim(new.quotation_number)) = 0
  then
    new.quotation_number :=
      public.generate_sales_quotation_number();
  end if;

  return new;
end;
$$;


drop trigger if exists
  set_sales_quotation_number
on public.sales_quotations;

create trigger set_sales_quotation_number
before insert
on public.sales_quotations
for each row
execute function
  public.set_sales_quotation_number();


/* =========================================================
 * User Audit Fields
 * ========================================================= */

create or replace function
  public.set_sales_quotation_user_fields()
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
  set_sales_quotation_user_fields
on public.sales_quotations;

create trigger set_sales_quotation_user_fields
before insert or update
on public.sales_quotations
for each row
execute function
  public.set_sales_quotation_user_fields();


/* =========================================================
 * Updated At
 * ========================================================= */

create or replace function
  public.set_sales_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();

  return new;
end;
$$;


drop trigger if exists
  set_sales_quotations_updated_at
on public.sales_quotations;

create trigger set_sales_quotations_updated_at
before update
on public.sales_quotations
for each row
execute function
  public.set_sales_updated_at();


drop trigger if exists
  set_sales_quotation_items_updated_at
on public.sales_quotation_items;

create trigger set_sales_quotation_items_updated_at
before update
on public.sales_quotation_items
for each row
execute function
  public.set_sales_updated_at();


/* =========================================================
 * Indexes
 * ========================================================= */

create index if not exists
  sales_quotations_customer_id_idx
on public.sales_quotations (
  customer_id
);

create index if not exists
  sales_quotations_status_idx
on public.sales_quotations (
  status
);

create index if not exists
  sales_quotations_source_idx
on public.sales_quotations (
  source
);

create index if not exists
  sales_quotations_quotation_date_idx
on public.sales_quotations (
  quotation_date desc
);

create index if not exists
  sales_quotations_valid_until_idx
on public.sales_quotations (
  valid_until
);

create index if not exists
  sales_quotations_warehouse_id_idx
on public.sales_quotations (
  warehouse_id
);

create index if not exists
  sales_quotation_items_quotation_id_idx
on public.sales_quotation_items (
  sales_quotation_id
);

create index if not exists
  sales_quotation_items_product_id_idx
on public.sales_quotation_items (
  product_id
);


/* =========================================================
 * Row-Level Security
 * ========================================================= */

alter table public.sales_quotations
  enable row level security;

alter table public.sales_quotation_items
  enable row level security;


/* =========================================================
 * Sales Quotation Policies
 * ========================================================= */

drop policy if exists
  "Authenticated users can view sales quotations"
on public.sales_quotations;

create policy
  "Authenticated users can view sales quotations"
on public.sales_quotations
for select
to authenticated
using (true);


drop policy if exists
  "Authenticated users can create sales quotations"
on public.sales_quotations;

create policy
  "Authenticated users can create sales quotations"
on public.sales_quotations
for insert
to authenticated
with check (true);


drop policy if exists
  "Authenticated users can update sales quotations"
on public.sales_quotations;

create policy
  "Authenticated users can update sales quotations"
on public.sales_quotations
for update
to authenticated
using (true)
with check (true);


drop policy if exists
  "Authenticated users can delete draft sales quotations"
on public.sales_quotations;

create policy
  "Authenticated users can delete draft sales quotations"
on public.sales_quotations
for delete
to authenticated
using (
  status = 'draft'
);


/* =========================================================
 * Sales Quotation Item Policies
 * ========================================================= */

drop policy if exists
  "Authenticated users can view sales quotation items"
on public.sales_quotation_items;

create policy
  "Authenticated users can view sales quotation items"
on public.sales_quotation_items
for select
to authenticated
using (true);


drop policy if exists
  "Authenticated users can create sales quotation items"
on public.sales_quotation_items;

create policy
  "Authenticated users can create sales quotation items"
on public.sales_quotation_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sales_quotations quotation
    where quotation.id =
      sales_quotation_items.sales_quotation_id
      and quotation.status = 'draft'
  )
);


drop policy if exists
  "Authenticated users can update sales quotation items"
on public.sales_quotation_items;

create policy
  "Authenticated users can update sales quotation items"
on public.sales_quotation_items
for update
to authenticated
using (
  exists (
    select 1
    from public.sales_quotations quotation
    where quotation.id =
      sales_quotation_items.sales_quotation_id
      and quotation.status = 'draft'
  )
)
with check (
  exists (
    select 1
    from public.sales_quotations quotation
    where quotation.id =
      sales_quotation_items.sales_quotation_id
      and quotation.status = 'draft'
  )
);


drop policy if exists
  "Authenticated users can delete sales quotation items"
on public.sales_quotation_items;

create policy
  "Authenticated users can delete sales quotation items"
on public.sales_quotation_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.sales_quotations quotation
    where quotation.id =
      sales_quotation_items.sales_quotation_id
      and quotation.status = 'draft'
  )
);


/* =========================================================
 * Function Permissions
 * ========================================================= */

revoke all
on function
  public.generate_sales_quotation_number()
from public;

grant execute
on function
  public.generate_sales_quotation_number()
to authenticated;