/*
 * Harden profile self-update permissions.
 *
 * Users may update their own basic profile fields,
 * but may not change role or active status.
 */

drop policy if exists
  "Users can update their own basic profile"
on public.profiles;

create policy
  "Users can update their own basic profile"
on public.profiles
for update
to authenticated
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
  and role = (
    select p.role
    from public.profiles p
    where p.id = auth.uid()
  )
  and is_active = (
    select p.is_active
    from public.profiles p
    where p.id = auth.uid()
  )
);