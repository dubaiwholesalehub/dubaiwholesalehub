-- 209_create_wholesale_collections.sql
-- Lightweight shareable wholesale photo collections.

create table if not exists public.wholesale_collections (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  slug text not null unique,

  is_published boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wholesale_collection_images (
  id uuid primary key default gen_random_uuid(),

  collection_id uuid not null
    references public.wholesale_collections(id)
    on delete cascade,

  reference_number bigint generated always as identity,

  storage_path text not null unique,

  sort_order integer not null default 0,

  is_available boolean not null default true,

  created_at timestamptz not null default now()
);

create index if not exists
  wholesale_collection_images_collection_id_idx
on public.wholesale_collection_images(collection_id);

create index if not exists
  wholesale_collection_images_sort_idx
on public.wholesale_collection_images(
  collection_id,
  sort_order,
  created_at
);

create index if not exists
  wholesale_collections_public_idx
on public.wholesale_collections(
  is_published,
  slug
);

alter table public.wholesale_collections
  enable row level security;

alter table public.wholesale_collection_images
  enable row level security;


-- ---------------------------------------------------------
-- PUBLIC READ
-- Only published collections are visible publicly.
-- ---------------------------------------------------------

create policy
  "Public can view published wholesale collections"
on public.wholesale_collections
for select
to anon, authenticated
using (is_published = true);


create policy
  "Public can view available images from published collections"
on public.wholesale_collection_images
for select
to anon, authenticated
using (
  is_available = true
  and exists (
    select 1
    from public.wholesale_collections wc
    where wc.id = wholesale_collection_images.collection_id
      and wc.is_published = true
  )
);


-- ---------------------------------------------------------
-- STORAGE BUCKET
-- Dedicated bucket so catalogue media remains separate from
-- normal ERP product images.
-- ---------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'wholesale-collections',
  'wholesale-collections',
  true
)
on conflict (id) do update
set public = excluded.public;


-- ---------------------------------------------------------
-- PUBLIC STORAGE READ
-- Public catalogue visitors may display images.
-- Upload/delete will remain server-side through admin code.
-- ---------------------------------------------------------

create policy
  "Public can view wholesale collection storage"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'wholesale-collections'
);