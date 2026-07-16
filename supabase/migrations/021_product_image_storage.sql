-- =====================================================
-- Product Image Storage
-- =====================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'products-images',
  'products-images',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- Remove older policies if this migration is rerun.

drop policy if exists "Admins can view product image objects"
on storage.objects;

drop policy if exists "Admins can upload product image objects"
on storage.objects;

drop policy if exists "Admins can update product image objects"
on storage.objects;

drop policy if exists "Admins can delete product image objects"
on storage.objects;


create policy "Admins can view product image objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'products-images'
  and public.is_admin()
);


create policy "Admins can upload product image objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'products-images'
  and public.is_admin()
);


create policy "Admins can update product image objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'products-images'
  and public.is_admin()
)
with check (
  bucket_id = 'products-images'
  and public.is_admin()
);


create policy "Admins can delete product image objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'products-images'
  and public.is_admin()
);