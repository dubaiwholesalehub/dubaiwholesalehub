-- ============================================================
-- Automatic Product SKU Generator
-- Format: DWH-000001
-- ============================================================

create sequence if not exists public.product_sku_seq
start with 1
increment by 1;

create or replace function public.generate_product_sku()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sku is null or btrim(new.sku) = '' then
    new.sku :=
      'DWH-' ||
      lpad(
        nextval('public.product_sku_seq')::text,
        6,
        '0'
      );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_generate_product_sku
on public.products;

create trigger trg_generate_product_sku
before insert
on public.products
for each row
execute function public.generate_product_sku();