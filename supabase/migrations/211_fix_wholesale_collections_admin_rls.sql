-- 211_fix_wholesale_collections_admin_rls.sql
-- Align wholesale collections security with the ERP admin security model.

-- =========================================================
-- REMOVE THE BROAD POLICIES FROM MIGRATION 210
-- =========================================================

drop policy if exists
  "Authenticated users can create wholesale collections"
on public.wholesale_collections;

drop policy if exists
  "Authenticated users can update wholesale collections"
on public.wholesale_collections;

drop policy if exists
  "Authenticated users can delete wholesale collections"
on public.wholesale_collections;

drop policy if exists
  "Authenticated users can create wholesale collection images"
on public.wholesale_collection_images;

drop policy if exists
  "Authenticated users can update wholesale collection images"
on public.wholesale_collection_images;

drop policy if exists
  "Authenticated users can delete wholesale collection images"
on public.wholesale_collection_images;

drop policy if exists
  "Authenticated users can upload wholesale collection storage"
on storage.objects;

drop policy if exists
  "Authenticated users can update wholesale collection storage"
on storage.objects;

drop policy if exists
  "Authenticated users can delete wholesale collection storage"
on storage.objects;


-- =========================================================
-- COLLECTION ADMIN POLICIES
-- =========================================================

create policy "Admins can view all wholesale collections"
on public.wholesale_collections
for select
to authenticated
using (public.is_admin());

create policy "Admins can create wholesale collections"
on public.wholesale_collections
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update wholesale collections"
on public.wholesale_collections
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete wholesale collections"
on public.wholesale_collections
for delete
to authenticated
using (public.is_admin());


-- =========================================================
-- COLLECTION IMAGE ADMIN POLICIES
-- =========================================================

create policy "Admins can view all wholesale collection images"
on public.wholesale_collection_images
for select
to authenticated
using (public.is_admin());

create policy "Admins can create wholesale collection images"
on public.wholesale_collection_images
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update wholesale collection images"
on public.wholesale_collection_images
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete wholesale collection images"
on public.wholesale_collection_images
for delete
to authenticated
using (public.is_admin());


-- =========================================================
-- STORAGE ADMIN POLICIES
-- =========================================================

create policy "Admins can upload wholesale collection storage"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'wholesale-collections'
  and public.is_admin()
);

create policy "Admins can update wholesale collection storage"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'wholesale-collections'
  and public.is_admin()
)
with check (
  bucket_id = 'wholesale-collections'
  and public.is_admin()
);

create policy "Admins can delete wholesale collection storage"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'wholesale-collections'
  and public.is_admin()
);