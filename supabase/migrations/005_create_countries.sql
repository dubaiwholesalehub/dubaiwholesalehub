create table public.countries (

    id uuid primary key default gen_random_uuid(),

    name text not null,

    iso2 varchar(2),

    iso3 varchar(3),

    phone_code text,

    currency_code varchar(3),

    flag text,

    is_active boolean default true,

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);


create unique index idx_countries_iso2
on public.countries(iso2);


create index idx_countries_active
on public.countries(is_active);


create trigger countries_updated_at

before update on public.countries

for each row

execute function public.set_updated_at();