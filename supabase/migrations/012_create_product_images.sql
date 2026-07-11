create table public.product_images (

    id uuid primary key default gen_random_uuid(),

    product_id uuid not null
        references public.products(id)
        on delete cascade,

    storage_path text not null,

    alt_text text,

    sort_order integer default 0,

    is_primary boolean default false,

    created_at timestamptz default now()

);

create index idx_product_images_product
on public.product_images(product_id);

create index idx_product_images_primary
on public.product_images(is_primary);