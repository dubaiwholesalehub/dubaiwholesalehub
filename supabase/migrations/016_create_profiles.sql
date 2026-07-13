-- ==========================================
-- Admin users and roles
-- ==========================================

create type public.app_role as enum (
  'super_admin',
  'admin',
  'manager',
  'sales',
  'viewer'
);

create table public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  email text not null,

  full_name text,

  avatar_url text,

  role public.app_role not null default 'viewer',

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index idx_profiles_email
on public.profiles(email);

create index idx_profiles_role
on public.profiles(role);

create index idx_profiles_active
on public.profiles(is_active);

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


-- Automatically create a profile when an Auth user is created.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name
  )
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- ==========================================
-- Row Level Security
-- ==========================================

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update their own basic profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);