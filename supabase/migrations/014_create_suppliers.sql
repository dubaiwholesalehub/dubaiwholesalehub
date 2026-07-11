create table public.suppliers (

    id uuid primary key default gen_random_uuid(),

    company_name text not null,

    contact_name text,

    email text,

    phone text,

    whatsapp text,

    website text,

    address text,

    city text,

    country_id uuid
        references public.countries(id)
        on delete set null,

    notes text,

    is_active boolean default true,

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);

create index idx_suppliers_country
on public.suppliers(country_id);

create index idx_suppliers_active
on public.suppliers(is_active);

create trigger suppliers_updated_at

before update on public.suppliers

for each row

execute function public.set_updated_at();