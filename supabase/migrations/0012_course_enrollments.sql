-- Course enrollments + course-level free/paid toggle
--
-- 1. courses.is_free — Super Admin can mark an ENTIRE course as free.
--    When true, all modules in the course are unlocked for everyone.
--    When false, the module-level is_free toggle (migration 0011) applies.
-- 2. course_enrollments — students enroll/unenroll in courses.

-- ---------------------------------------------------------------------
-- 1. Course-level free/paid flag
-- ---------------------------------------------------------------------
ALTER TABLE courses ADD COLUMN is_free boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN courses.is_free IS 'Super admin toggle: true = whole course free, false = module-level is_free applies';

-- ---------------------------------------------------------------------
-- 2. course_enrollments
-- ---------------------------------------------------------------------
create table course_enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  course_id   uuid not null references courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table course_enrollments enable row level security;

-- Users can see their own enrollments
CREATE POLICY "Users can view own enrollments" ON course_enrollments
  FOR SELECT USING (auth.uid() = user_id);

-- Admins/teachers can see all enrollments (for stats)
CREATE POLICY "Staff can view all enrollments" ON course_enrollments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'teacher'))
  );

-- Users can enroll themselves
CREATE POLICY "Users can enroll" ON course_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can unenroll themselves
CREATE POLICY "Users can unenroll" ON course_enrollments
  FOR DELETE USING (auth.uid() = user_id);

create index course_enrollments_user_id_idx on course_enrollments(user_id);
create index course_enrollments_course_id_idx on course_enrollments(course_id);