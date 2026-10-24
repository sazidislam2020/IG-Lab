-- ============================================================
-- 0022: SWEEP 0004 LEFTOVERS
-- Run this in the Supabase SQL Editor, then deploy the client.
--
-- 0004_fix_rls_policies.sql predates the 0019 helper functions and
-- left two things behind:
--   1. Policy "Super admins can update any profile" — an EXISTS
--      self-select against the very table it protects (it only works
--      accidentally: the nested read rides 0002/0020 SELECT policies
--      instead of a SECURITY DEFINER helper). Replaced below with the
--      0019-style is_super_admin() helper — identical semantics.
--   2. Function get_my_profile() — SECURITY DEFINER without
--      set search_path (search_path hijack surface) and referenced
--      nowhere in the client codebase (verified by grep).
--
-- Semantics are intentionally preserved: super admins may update any
-- profile; role/status changes remain gated by the 0019 trigger
-- protect_profile_privileges (super admin only); users keep the
-- 0002 "Users can update own profile" policy for their own row.
-- ============================================================

-- 1. Replace the RLS-recursive 0004 policy with a definer-helper one.
drop policy if exists "Super admins can update any profile" on profiles;

create policy "Super admins can update profiles"
  on profiles for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- 2. Drop the unused, search-path-unpinned function from 0004.
drop function if exists public.get_my_profile();

-- ------------------------------------------------------------
-- Sanity: expect exactly these UPDATE policies on profiles
--   "Super admins can update profiles"  (new, definer helper)
--   "Users can update own profile"      (0002, self row)
-- and NO function get_my_profile in public.
-- ------------------------------------------------------------
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;

select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'get_my_profile';
-- (second query: 0 rows)
