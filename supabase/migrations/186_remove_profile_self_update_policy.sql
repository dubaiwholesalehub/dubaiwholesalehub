/*
 * =========================================================
 * 186 — Remove Profile Self-Update Access
 * =========================================================
 *
 * Production security hardening.
 *
 * The application currently reads profile information but
 * does not provide a user self-service profile editor.
 *
 * Ordinary authenticated users therefore do not require
 * direct UPDATE access to public.profiles.
 *
 * Administrative profile management remains governed by
 * the existing admin RLS policy.
 * =========================================================
 */

drop policy if exists
  "Users can update their own basic profile"
on public.profiles;

/*
 * Remove any table-level UPDATE privilege previously granted
 * to authenticated users.
 *
 * Admin application workflows can be implemented through
 * controlled server/database functions when required.
 */
revoke update
on table public.profiles
from authenticated;