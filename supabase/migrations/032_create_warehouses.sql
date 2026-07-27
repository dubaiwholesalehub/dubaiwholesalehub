create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,
  name text not null,

  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  country text,
  postal_code text,

  contact_person text,
  phone text,
  email text,

  is_active boolean not null default true,
  is_default boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouses_code_not_empty
    check (length(trim(code)) > 0),

  constraint warehouses_name_not_empty
    check (length(trim(name)) > 0)
);

create index if not exists warehouses_is_active_idx
  on public.warehouses (is_active);

create index if not exists warehouses_is_default_idx
  on public.warehouses (is_default);