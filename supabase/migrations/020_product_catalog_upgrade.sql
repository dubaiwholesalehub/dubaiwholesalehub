-- =====================================================
-- DubaiWholesaleHub Product Catalog Upgrade
-- =====================================================

-- Additional wholesale and export information.

alter table public.products
add column if not exists model_number text,
add column if not exists hs_code text,
add column if not exists warranty text,
add column if not exists carton_quantity integer,
add column if not exists is_new boolean not null default false,
add column if not exists published_at timestamptz;


-- =====================================================
-- Data-quality constraints
-- =====================================================

alter table public.products
drop constraint if exists products_moq_positive;

alter table public.products
add constraint products_moq_positive
check (moq is null or moq > 0);


alter table public.products
drop constraint if exists products_carton_quantity_positive;

alter table public.products
add constraint products_carton_quantity_positive
check (
  carton_quantity is null
  or carton_quantity > 0
);


alter table public.products
drop constraint if exists products_weight_non_negative;

alter table public.products
add constraint products_weight_non_negative
check (weight is null or weight >= 0);


alter table public.products
drop constraint if exists products_dimensions_non_negative;

alter table public.products
add constraint products_dimensions_non_negative
check (
  (length is null or length >= 0)
  and
  (width is null or width >= 0)
  and
  (height is null or height >= 0)
);


-- =====================================================
-- Search indexes
-- =====================================================

create index if not exists idx_products_name
on public.products using btree (name);


create index if not exists idx_products_sku
on public.products using btree (sku);


create index if not exists idx_products_barcode
on public.products using btree (barcode);


create index if not exists idx_products_country
on public.products(country_id);


create index if not exists idx_products_unit
on public.products(unit_id);


create index if not exists idx_products_created_at
on public.products(created_at desc);


create index if not exists idx_products_published_at
on public.products(published_at desc)
where status = 'published';


create index if not exists idx_products_published_category
on public.products(category_id, created_at desc)
where status = 'published';


create index if not exists idx_products_published_featured
on public.products(featured, created_at desc)
where status = 'published';


-- Full-text search across important product fields.

create index if not exists idx_products_full_text_search
on public.products
using gin (
  to_tsvector(
    'simple',
    coalesce(name, '') || ' ' ||
    coalesce(sku, '') || ' ' ||
    coalesce(barcode, '') || ' ' ||
    coalesce(model_number, '') || ' ' ||
    coalesce(short_description, '') || ' ' ||
    coalesce(description, '')
  )
);


-- =====================================================
-- Automatically manage published_at
-- =====================================================

create or replace function public.set_product_published_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'published'
     and old.status is distinct from 'published'
  then
    new.published_at = coalesce(new.published_at, now());
  end if;

  if new.status <> 'published' then
    new.published_at = null;
  end if;

  return new;
end;
$$;


drop trigger if exists products_set_published_at
on public.products;


create trigger products_set_published_at
before update of status
on public.products
for each row
execute function public.set_product_published_at();


-- =====================================================
-- Products Row Level Security
-- =====================================================

alter table public.products enable row level security;


drop policy if exists "Public can view published products"
on public.products;

drop policy if exists "Admins can view all products"
on public.products;

drop policy if exists "Admins can create products"
on public.products;

drop policy if exists "Admins can update products"
on public.products;


create policy "Public can view published products"
on public.products
for select
to anon, authenticated
using (status = 'published');


create policy "Admins can view all products"
on public.products
for select
to authenticated
using (public.is_admin());


create policy "Admins can create products"
on public.products
for insert
to authenticated
with check (public.is_admin());


create policy "Admins can update products"
on public.products
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());


-- No physical-delete policy.
-- Products use the archived status.


-- =====================================================
-- Product Images Security
-- =====================================================

alter table public.product_images enable row level security;


drop policy if exists "Public can view published product images"
on public.product_images;

drop policy if exists "Admins can manage product images"
on public.product_images;


create policy "Public can view published product images"
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_images.product_id
      and products.status = 'published'
  )
);


create policy "Admins can manage product images"
on public.product_images
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());


-- =====================================================
-- Product Documents Security
-- =====================================================

alter table public.product_documents enable row level security;


drop policy if exists "Public can view published product documents"
on public.product_documents;

drop policy if exists "Admins can manage product documents"
on public.product_documents;


create policy "Public can view published product documents"
on public.product_documents
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_documents.product_id
      and products.status = 'published'
  )
);


create policy "Admins can manage product documents"
on public.product_documents
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());


-- =====================================================
-- Product-Supplier Security
-- Contains private supplier prices and sourcing details.
-- Never expose this table publicly.
-- =====================================================

alter table public.product_suppliers enable row level security;


drop policy if exists "Admins can view product suppliers"
on public.product_suppliers;

drop policy if exists "Admins can create product suppliers"
on public.product_suppliers;

drop policy if exists "Admins can update product suppliers"
on public.product_suppliers;


create policy "Admins can view product suppliers"
on public.product_suppliers
for select
to authenticated
using (public.is_admin());


create policy "Admins can create product suppliers"
on public.product_suppliers
for insert
to authenticated
with check (public.is_admin());


create policy "Admins can update product suppliers"
on public.product_suppliers
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());