-- Ignite Lab — Row Level Security policies
-- Build Week 1, Day 3
--
-- Run this in the Supabase SQL editor AFTER 0001_init_schema.sql.
-- These policies unlock the tables so the app can actually read/write.

-- =====================================================================
-- PROFILES
-- =====================================================================

-- Every authenticated user can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Every authenticated user can update their own profile (e.g. full_name)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- The insert is handled by the trigger (handle_new_user), but we allow
-- authenticated users to insert their own row just in case.
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Super admins can view ALL profiles (needed for the approval panel)
CREATE POLICY "Super admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admins can update ANY profile (approve/reject, change roles)
CREATE POLICY "Super admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================================
-- COURSES
-- =====================================================================

-- Everyone (including anonymous) can read published courses
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  USING (true);

-- Admins and super admins can manage courses
CREATE POLICY "Admins can manage courses"
  ON courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================================
-- LEVELS
-- =====================================================================

-- Everyone can read levels
CREATE POLICY "Anyone can view levels"
  ON levels FOR SELECT
  USING (true);

-- Admins and super admins can manage levels
CREATE POLICY "Admins can manage levels"
  ON levels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================================
-- TASKS
-- =====================================================================

-- Everyone can read tasks
CREATE POLICY "Anyone can view tasks"
  ON tasks FOR SELECT
  USING (true);

-- Teachers, admins, and super admins can manage tasks
CREATE POLICY "Teachers can manage tasks"
  ON tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin')
    )
  );

-- =====================================================================
-- SUBMISSIONS
-- =====================================================================

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can insert own submissions"
  ON submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Teachers can view submissions for their students
-- (For now, broad: any teacher can see all submissions. Scoped later.)
CREATE POLICY "Teachers can view all submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin')
    )
  );

-- Teachers can update submissions (grade them)
CREATE POLICY "Teachers can grade submissions"
  ON submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin')
    )
  );

-- =====================================================================
-- POINTS LEDGER
-- =====================================================================

-- Users can view their own points
CREATE POLICY "Users can view own points"
  ON points_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- System inserts points (via function) — allow authenticated inserts
CREATE POLICY "Authenticated users can insert points"
  ON points_ledger FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================================
-- AUDIT LOG
-- =====================================================================

-- Only super admins can read the audit log
CREATE POLICY "Super admins can view audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Admins and super admins can insert audit entries
CREATE POLICY "Admins can insert audit entries"
  ON audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
