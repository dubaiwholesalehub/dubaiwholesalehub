-- 210_wholesale_collections_admin_rls.sql
-- Allow authenticated ERP users to manage wholesale collections.

create policy "Authenticated users can create wholesale collections"
on public.wholesale_collections
for insert
to authenticated
with check (true);

create policy "Authenticated users can update wholesale collections"
on public.wholesale_collections
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete wholesale collections"
on public.wholesale_collections
for delete
to authenticated
using (true);

create policy "Authenticated users can create wholesale collection images"
on public.wholesale_collection_images
for insert
to authenticated
with check (true);

create policy "Authenticated users can update wholesale collection images"
on public.wholesale_collection_images
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete wholesale collection images"
on public.wholesale_collection_images
for delete
to authenticated
using (true);

create policy "Authenticated users can upload wholesale collection storage"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'wholesale-collections');

create policy "Authenticated users can update wholesale collection storage"
on storage.objects
for update
to authenticated
using (bucket_id = 'wholesale-collections')
with check (bucket_id = 'wholesale-collections');

create policy "Authenticated users can delete wholesale collection storage"
on storage.objects
for delete
to authenticated
using (bucket_id = 'wholesale-collections');