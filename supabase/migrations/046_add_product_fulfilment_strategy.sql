/*
 * HM ERP
 * Product Fulfilment Strategy
 *
 * Supports:
 * - Stock items
 * - Local purchase after customer confirmation
 * - Import on demand
 * - Drop shipping
 * - Services / non-inventory lines
 */


/* =========================================================
 * Product Fulfilment Fields
 * ========================================================= */

alter table public.products
add column if not exists
  fulfilment_method text
  not null default 'stock';

alter table public.products
add column if not exists
  procurement_lead_time_days integer
  not null default 0;

alter table public.products
add column if not exists
  allow_backorder boolean
  not null default false;

alter table public.products
add column if not exists
  procurement_notes text;


/* =========================================================
 * Constraints
 * ========================================================= */

alter table public.products
drop constraint if exists
  products_fulfilment_method_check;

alter table public.products
add constraint
  products_fulfilment_method_check
check (
  fulfilment_method in (
    'stock',
    'local_purchase',
    'import_on_demand',
    'dropship',
    'service'
  )
);


alter table public.products
drop constraint if exists
  products_procurement_lead_time_days_check;

alter table public.products
add constraint
  products_procurement_lead_time_days_check
check (
  procurement_lead_time_days >= 0
);


/* =========================================================
 * Indexes
 * ========================================================= */

create index if not exists
  products_fulfilment_method_idx
on public.products (
  fulfilment_method
);

create index if not exists
  products_allow_backorder_idx
on public.products (
  allow_backorder
);


/* =========================================================
 * Existing Product Defaults
 * ========================================================= */

update public.products
set
  fulfilment_method = 'stock',
  procurement_lead_time_days = 0,
  allow_backorder = false
where fulfilment_method is null;