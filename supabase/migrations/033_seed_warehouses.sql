insert into public.warehouses (
  code,
  name,
  city,
  country,
  is_active,
  is_default
)
values (
  'MAIN',
  'Main Warehouse',
  'Dubai',
  'United Arab Emirates',
  true,
  true
)
on conflict (code) do nothing;