alter table public.suppliers enable row level security;

drop policy if exists "Admins can view suppliers"
on public.suppliers;

drop policy if exists "Admins can create suppliers"
on public.suppliers;

drop policy if exists "Admins can update suppliers"
on public.suppliers;

create policy "Admins can view suppliers"
on public.suppliers
for select
to authenticated
using (public.is_admin());

create policy "Admins can create suppliers"
on public.suppliers
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update suppliers"
on public.suppliers
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());