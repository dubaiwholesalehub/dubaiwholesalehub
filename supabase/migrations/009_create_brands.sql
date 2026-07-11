create table public.brands (

    id uuid primary key default gen_random_uuid(),

    name text not null,

    slug text not null unique,

    logo_url text,

    website text,

    country_id uuid
        references public.countries(id)
        on delete set null,

    description text,

    is_featured boolean default false,

    is_active boolean default true,

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);


create index idx_brands_slug
on public.brands(slug);


create index idx_brands_country
on public.brands(country_id);


create index idx_brands_active
on public.brands(is_active);



create trigger brands_updated_at

before update on public.brands

for each row

execute function public.set_updated_at();