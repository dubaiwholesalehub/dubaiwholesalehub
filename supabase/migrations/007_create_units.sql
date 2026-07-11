create table public.units (

    id uuid primary key default gen_random_uuid(),

    name text not null,

    short_name text not null unique,

    is_active boolean default true,

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);



create trigger units_updated_at

before update on public.units

for each row

execute function public.set_updated_at();