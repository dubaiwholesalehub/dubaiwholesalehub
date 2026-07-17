-- =====================================================
-- DubaiWholesaleHub Supplier Intelligence
-- =====================================================

alter table public.product_suppliers
add column if not exists lead_time_days integer,
add column if not exists payment_terms text,
add column if not exists incoterm text,
add column if not exists loading_port text,
add column if not exists priority integer not null default 0,
add column if not exists last_purchase_price numeric(12, 2),
add column if not exists notes text,
add column if not exists last_price_update timestamptz;


-- =====================================================
-- Data-quality constraints
-- =====================================================

alter table public.product_suppliers
drop constraint if exists product_suppliers_cost_non_negative;

alter table public.product_suppliers
add constraint product_suppliers_cost_non_negative
check (
  cost_price is null
  or cost_price >= 0
);


alter table public.product_suppliers
drop constraint if exists product_suppliers_last_purchase_non_negative;

alter table public.product_suppliers
add constraint product_suppliers_last_purchase_non_negative
check (
  last_purchase_price is null
  or last_purchase_price >= 0
);


alter table public.product_suppliers
drop constraint if exists product_suppliers_moq_positive;

alter table public.product_suppliers
add constraint product_suppliers_moq_positive
check (
  moq is null
  or moq > 0
);


alter table public.product_suppliers
drop constraint if exists product_suppliers_lead_time_days_non_negative;

alter table public.product_suppliers
add constraint product_suppliers_lead_time_days_non_negative
check (
  lead_time_days is null
  or lead_time_days >= 0
);


alter table public.product_suppliers
drop constraint if exists product_suppliers_priority_non_negative;

alter table public.product_suppliers
add constraint product_suppliers_priority_non_negative
check (priority >= 0);


alter table public.product_suppliers
drop constraint if exists product_suppliers_currency_format;

alter table public.product_suppliers
add constraint product_suppliers_currency_format
check (
  currency_code is null
  or currency_code ~ '^[A-Z]{3}$'
);


alter table public.product_suppliers
drop constraint if exists product_suppliers_incoterm_format;

alter table public.product_suppliers
add constraint product_suppliers_incoterm_format
check (
  incoterm is null
  or incoterm in (
    'EXW',
    'FCA',
    'FOB',
    'CFR',
    'CIF',
    'CPT',
    'CIP',
    'DAP',
    'DPU',
    'DDP'
  )
);


-- =====================================================
-- Only one active preferred supplier per product
-- =====================================================

create unique index if not exists
idx_product_suppliers_one_preferred
on public.product_suppliers(product_id)
where is_preferred = true
  and is_active = true;


-- =====================================================
-- Performance indexes
-- =====================================================

create index if not exists
idx_product_suppliers_product_active
on public.product_suppliers(product_id, is_active);


create index if not exists
idx_product_suppliers_supplier_active
on public.product_suppliers(supplier_id, is_active);


create index if not exists
idx_product_suppliers_product_priority
on public.product_suppliers(
  product_id,
  priority,
  cost_price
)
where is_active = true;


create index if not exists
idx_product_suppliers_last_price_update
on public.product_suppliers(last_price_update desc);


-- =====================================================
-- Automatically record price-update time
-- =====================================================

create or replace function public.set_supplier_price_update_time()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if
    new.cost_price is distinct from old.cost_price
    or new.currency_code is distinct from old.currency_code
    or new.last_purchase_price is distinct from old.last_purchase_price
  then
    new.last_price_update = now();
  end if;

  return new;
end;
$$;


drop trigger if exists product_suppliers_price_update_time
on public.product_suppliers;


create trigger product_suppliers_price_update_time
before update of
  cost_price,
  currency_code,
  last_purchase_price
on public.product_suppliers
for each row
execute function public.set_supplier_price_update_time();


-- =====================================================
-- Set last_price_update for new records containing cost
-- =====================================================

create or replace function public.set_new_supplier_price_time()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.cost_price is not null
     or new.last_purchase_price is not null
  then
    new.last_price_update =
      coalesce(new.last_price_update, now());
  end if;

  return new;
end;
$$;


drop trigger if exists product_suppliers_new_price_time
on public.product_suppliers;


create trigger product_suppliers_new_price_time
before insert
on public.product_suppliers
for each row
execute function public.set_new_supplier_price_time();