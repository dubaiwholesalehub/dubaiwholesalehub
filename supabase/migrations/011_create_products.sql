create type public.product_status as enum (
    'draft',
    'pending_review',
    'published',
    'archived'
);


create table public.products (

    id uuid primary key default gen_random_uuid(),

    -- Basic Information

    sku text unique,

    barcode text,

    slug text not null unique,

    name text not null,

    short_description text,

    description text,


    -- Classification

    category_id uuid not null
        references public.categories(id)
        on delete restrict,


    subcategory_id uuid
        references public.subcategories(id)
        on delete set null,


    brand_id uuid
        references public.brands(id)
        on delete set null,


    country_id uuid
        references public.countries(id)
        on delete set null,


    unit_id uuid
        references public.units(id)
        on delete set null,


    -- Wholesale Information

    moq integer default 1,

    lead_time text,

    packaging text,


    -- Physical Information

    weight numeric,

    length numeric,

    width numeric,

    height numeric,


    -- Product Management

    status public.product_status default 'draft',

    featured boolean default false,


    -- SEO

    meta_title text,

    meta_description text,


    -- Timestamps

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);



create index idx_products_slug
on public.products(slug);



create index idx_products_category
on public.products(category_id);



create index idx_products_subcategory
on public.products(subcategory_id);



create index idx_products_brand
on public.products(brand_id);



create index idx_products_status
on public.products(status);



create index idx_products_featured
on public.products(featured);



create trigger products_updated_at

before update on public.products

for each row

execute function public.set_updated_at();