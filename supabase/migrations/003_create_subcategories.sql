create table public.subcategories (

    id uuid primary key default gen_random_uuid(),

    category_id uuid not null
        references public.categories(id)
        on delete cascade,

    name text not null,

    slug text not null unique,

    description text,

    image_url text,

    sort_order integer default 0,

    is_active boolean default true,

    seo_title text,

    seo_description text,

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);


create index idx_subcategories_category
on public.subcategories(category_id);


create index idx_subcategories_slug
on public.subcategories(slug);


create index idx_subcategories_active
on public.subcategories(is_active);



create trigger subcategories_updated_at

before update on public.subcategories

for each row

execute function public.set_updated_at();