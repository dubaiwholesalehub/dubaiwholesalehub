create table public.categories (

    id uuid primary key default gen_random_uuid(),

    name text not null,

    slug text not null unique,

    description text,

    image_url text,

    icon text,

    sort_order integer default 0,

    is_featured boolean default false,

    is_active boolean default true,

    seo_title text,

    seo_description text,

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);

create index idx_categories_slug
on public.categories(slug);

create index idx_categories_active
on public.categories(is_active);

create trigger categories_updated_at

before update on public.categories

for each row

execute function public.set_updated_at();