-- =====================================================
-- Admin authorization and categories security
-- =====================================================

-- Remove the unsafe broad self-update policy.
drop policy if exists "Users can update their own basic profile"
on public.profiles;

revoke update on public.profiles from authenticated;


-- Secure helper used by RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
      and role in (
        'super_admin',
        'admin',
        'manager'
      )
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;


-- Admins can view all profiles.
create policy "Admins can view profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

-- Only administrators may update profiles for now.
create policy "Admins can update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());


-- =====================================================
-- Categories RLS
-- =====================================================

alter table public.categories enable row level security;

create policy "Public can view active categories"
on public.categories
for select
to anon, authenticated
using (is_active = true);

create policy "Admins can view all categories"
on public.categories
for select
to authenticated
using (public.is_admin());

create policy "Admins can create categories"
on public.categories
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update categories"
on public.categories
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Do not add physical-delete access.
-- Categories will be archived using is_active.