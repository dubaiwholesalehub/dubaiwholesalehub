create type public.document_type as enum (

'catalog',

'datasheet',

'manual',

'certificate',

'other'

);

create table public.product_documents (

    id uuid primary key default gen_random_uuid(),

    product_id uuid not null
        references public.products(id)
        on delete cascade,

    title text not null,

    document_type public.document_type default 'other',

    storage_path text not null,

    created_at timestamptz default now()

);

create index idx_product_documents_product
on public.product_documents(product_id);