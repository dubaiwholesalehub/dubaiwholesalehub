create table public.product_suppliers (

    id uuid primary key default gen_random_uuid(),

    product_id uuid not null
        references public.products(id)
        on delete cascade,

    supplier_id uuid not null
        references public.suppliers(id)
        on delete cascade,

    supplier_sku text,

    cost_price numeric(12,2),

    currency_code varchar(3) default 'AED',

    moq integer,

    lead_time text,

    packaging text,

    is_preferred boolean default false,

    is_active boolean default true,

    created_at timestamptz default now(),

    updated_at timestamptz default now(),

    unique(product_id, supplier_id)
);

create index idx_product_suppliers_product
on public.product_suppliers(product_id);

create index idx_product_suppliers_supplier
on public.product_suppliers(supplier_id);

create trigger product_suppliers_updated_at

before update on public.product_suppliers

for each row

execute function public.set_updated_at();