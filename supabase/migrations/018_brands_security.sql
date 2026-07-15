-- =====================================================
-- Brands Row Level Security
-- =====================================================

alter table public.brands enable row level security;

drop policy if exists "Public can view active brands"
on public.brands;

drop policy if exists "Admins can view all brands"
on public.brands;

drop policy if exists "Admins can create brands"
on public.brands;

drop policy if exists "Admins can update brands"
on public.brands;


create policy "Public can view active brands"
on public.brands
for select
to anon, authenticated
using (is_active = true);


create policy "Admins can view all brands"
on public.brands
for select
to authenticated
using (public.is_admin());


create policy "Admins can create brands"
on public.brands
for insert
to authenticated
with check (public.is_admin());


create policy "Admins can update brands"
on public.brands
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());


-- No physical-delete policy.
-- Brands are archived using is_active.