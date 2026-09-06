-- Ignite Lab — Fix RLS policies (remove circular dependency)
-- Run this in Supabase SQL Editor

-- Drop the problematic policies that cause circular reads
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON profiles;

-- Simpler approach: users can read their own profile
-- Admins/super_admins can read all profiles via a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS SETOF profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM profiles WHERE id = auth.uid();
$$;

-- Allow users to read their own profile (keep existing)
-- Allow authenticated users to read all profiles (simpler, admin panel needs it)
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only super admins can update profiles (approve/reject/role changes)
CREATE POLICY "Super admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

