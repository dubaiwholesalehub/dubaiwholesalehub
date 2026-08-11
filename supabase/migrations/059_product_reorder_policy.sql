/*
 * HM ERP
 * Product Reorder Policy
 *
 * Adds product-level fallback replenishment settings for
 * products without enough sales history.
 */

alter table public.products
add column if not exists minimum_stock_quantity numeric(14, 3) not null default 0;

alter table public.products
add column if not exists reorder_quantity numeric(14, 3) not null default 0;

alter table public.products
add column if not exists safety_stock_days integer not null default 7;

alter table public.products
add constraint products_minimum_stock_quantity_valid
check (
  minimum_stock_quantity >= 0
);

alter table public.products
add constraint products_reorder_quantity_valid
check (
  reorder_quantity >= 0
);

alter table public.products
add constraint products_safety_stock_days_valid
check (
  safety_stock_days >= 0
);

comment on column public.products.minimum_stock_quantity is
  'Minimum available stock threshold used as a fallback reorder trigger when sales velocity is unavailable.';

comment on column public.products.reorder_quantity is
  'Fallback quantity HM ERP should recommend when available stock falls to or below minimum stock and demand history is insufficient.';

comment on column public.products.safety_stock_days is
  'Product-specific number of safety-stock days used by demand-based reorder intelligence.';