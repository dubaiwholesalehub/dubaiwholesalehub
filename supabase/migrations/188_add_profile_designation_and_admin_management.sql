-- ============================================================
-- 188_add_profile_designation_and_admin_management.sql
--
-- Purpose:
--   Add employee designation to ERP profiles and provide
--   controlled management functions for admins.
--
-- Security:
--   - No direct authenticated UPDATE grant is restored.
--   - Profile mutations happen through SECURITY DEFINER functions.
--   - Only management roles can manage profiles.
--   - Only super_admin can assign/remove super_admin.
--   - A super_admin cannot deactivate/demote themselves.
-- ============================================================

alter table public.profiles
add column if not exists designation text;

comment on column public.profiles.designation is
'Human-readable employee/job designation. Separate from ERP authorization role.';


-- ------------------------------------------------------------
-- Helper: determine whether current user may manage profiles.
-- ------------------------------------------------------------

create or replace function public.can_manage_profiles()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin', 'admin', 'manager')
  );
$$;


-- ------------------------------------------------------------
-- Update employee/user profile.
--
-- Rules:
--   * caller must be active management user
--   * admin/manager cannot create or modify super_admin role
--   * only super_admin can assign super_admin
--   * super_admin cannot demote or deactivate themselves
-- ------------------------------------------------------------

create or replace function public.manage_profile(
  p_profile_id uuid,
  p_full_name text,
  p_designation text,
  p_role public.app_role,
  p_is_active boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_target public.profiles;
  v_updated public.profiles;
begin
  select *
  into v_actor
  from public.profiles
  where id = auth.uid();

  if v_actor.id is null
     or v_actor.is_active is distinct from true
     or v_actor.role not in ('super_admin', 'admin', 'manager') then
    raise exception 'You do not have permission to manage users.';
  end if;

  select *
  into v_target
  from public.profiles
  where id = p_profile_id
  for update;

  if v_target.id is null then
    raise exception 'User profile not found.';
  end if;

  if nullif(trim(coalesce(p_full_name, '')), '') is null then
    raise exception 'Full name is required.';
  end if;

  if p_role is null then
    raise exception 'ERP role is required.';
  end if;

  if p_is_active is null then
    raise exception 'Active status is required.';
  end if;

  -- Only super_admin may assign or modify a super_admin account.
  if (
    p_role = 'super_admin'
    or v_target.role = 'super_admin'
  ) and v_actor.role <> 'super_admin' then
    raise exception 'Only a super administrator can manage super administrator access.';
  end if;

  -- Prevent a super_admin from locking themselves out.
  if v_actor.id = v_target.id
     and v_target.role = 'super_admin'
     and (
       p_role <> 'super_admin'
       or p_is_active = false
     ) then
    raise exception 'A super administrator cannot demote or deactivate their own account.';
  end if;

  update public.profiles
  set
    full_name = trim(p_full_name),
    designation = nullif(trim(coalesce(p_designation, '')), ''),
    role = p_role,
    is_active = p_is_active,
    updated_at = now()
  where id = p_profile_id
  returning *
  into v_updated;

  return v_updated;
end;
$$;


-- ------------------------------------------------------------
-- Harden execution permissions.
-- ------------------------------------------------------------

revoke all
on function public.can_manage_profiles()
from public;

revoke all
on function public.manage_profile(
  uuid,
  text,
  text,
  public.app_role,
  boolean
)
from public;

grant execute
on function public.can_manage_profiles()
to authenticated;

grant execute
on function public.manage_profile(
  uuid,
  text,
  text,
  public.app_role,
  boolean
)
to authenticated;