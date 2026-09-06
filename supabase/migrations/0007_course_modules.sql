-- Course Modules System — Rebuild
-- Each course now has ordered modules of different types:
--   'live'      → Live class session (Jitsi video call)
--   'classwork' → Coding exercises/tasks (linked to tasks table)
--   'homework'  → Take-home assignments (linked to tasks table)
--   'boss'      → Boss exam level (linked to tasks table)
--
-- Standalone live classes (webinars) have course_id = NULL

-- ---------------------------------------------------------------------
-- 1. Create course_modules table
-- ---------------------------------------------------------------------
create table course_modules (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references courses(id) on delete cascade,
  module_type   text not null check (module_type in ('live', 'classwork', 'homework', 'boss')),
  title         text not null,
  description   text default '',
  module_order  int not null default 0,
  points_value  int not null default 0,
  created_at    timestamptz not null default now(),
  unique (course_id, module_order)
);

alter table course_modules enable row level security;

-- RLS: anyone authenticated can read modules
CREATE POLICY "Authenticated users can view modules" ON course_modules
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS: admins/teachers can manage modules
CREATE POLICY "Admins can manage modules" ON course_modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'teacher'))
  );

create index course_modules_course_id_idx on course_modules(course_id);

-- ---------------------------------------------------------------------
-- 2. Create module_tasks junction table
-- (A module of type 'classwork', 'homework', or 'boss' can have many tasks)
-- ---------------------------------------------------------------------
create table module_tasks (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references course_modules(id) on delete cascade,
  task_id     uuid not null references tasks(id) on delete cascade,
  task_order  int not null default 0,
  unique (module_id, task_id)
);

alter table module_tasks enable row level security;

CREATE POLICY "Authenticated users can view module_tasks" ON module_tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage module_tasks" ON module_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'teacher'))
  );

create index module_tasks_module_id_idx on module_tasks(module_id);

-- ---------------------------------------------------------------------
-- 3. Update live_classes to support being part of a course
-- ---------------------------------------------------------------------
alter table live_classes add column module_id uuid references course_modules(id) on delete set null;

-- Also add a 'description' column if not exists (it already has one from 0006)
-- Add subject if not exists
DO $$ BEGIN
  ALTER TABLE live_classes ADD COLUMN subject text default '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- ---------------------------------------------------------------------
-- 4. Migrate existing levels into course_modules
-- ---------------------------------------------------------------------
-- Convert existing levels to course_modules
INSERT INTO course_modules (id, course_id, module_type, title, description, module_order, points_value)
SELECT
  gen_random_uuid(),
  l.course_id,
  CASE WHEN l.is_boss THEN 'boss' ELSE 'classwork' END,
  l.title,
  l.title,
  l.level_number,
  l.points_value
FROM levels l;

-- Link existing tasks to the new modules
INSERT INTO module_tasks (module_id, task_id, task_order)
SELECT
  cm.id,
  t.id,
  ROW_NUMBER() OVER (PARTITION BY cm.id ORDER BY t.created_at) - 1
FROM course_modules cm
JOIN levels l ON l.course_id = cm.course_id
  AND l.level_number = cm.module_order
JOIN tasks t ON t.level_id = l.id;

-- ---------------------------------------------------------------------
-- 5. RLS policies for existing tables (ensure they work with new structure)
-- ---------------------------------------------------------------------

-- Ensure courses are readable by all authenticated users
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view courses" ON courses;
EXCEPTION WHEN undefined_object THEN null;
END $$;
CREATE POLICY "Authenticated users can view courses" ON courses
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Ensure courses can be managed by admins
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
EXCEPTION WHEN undefined_object THEN null;
END $$;
CREATE POLICY "Admins can manage courses" ON courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Ensure levels are readable
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view levels" ON levels;
EXCEPTION WHEN undefined_object THEN null;
END $$;
CREATE POLICY "Authenticated users can view levels" ON levels
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Ensure tasks are readable
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view tasks" ON tasks;
EXCEPTION WHEN undefined_object THEN null;
END $$;
CREATE POLICY "Authenticated users can view tasks" ON tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Ensure submissions work
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own submissions" ON submissions;
EXCEPTION WHEN undefined_object THEN null;
END $$;
CREATE POLICY "Users can view own submissions" ON submissions
  FOR SELECT USING (auth.uid() = user_id);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create submissions" ON submissions;
EXCEPTION WHEN undefined_object THEN null;
END $$;
CREATE POLICY "Users can create submissions" ON submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Teachers can view all submissions
DO $$ BEGIN
  DROP POLICY IF EXISTS "Teachers can view all submissions" ON submissions;
EXCEPTION WHEN undefined_object THEN null;
END $$;
CREATE POLICY "Teachers can view all submissions" ON submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin'))
  );

-- Ensure points_ledger works
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own points" ON points_ledger;
EXCEPTION WHEN undefined_object THEN null;
END $$;
CREATE POLICY "Users can view own points" ON points_ledger
  FOR SELECT USING (auth.uid() = user_id);

DO $$ BEGIN
  DROP POLICY IF EXISTS "System can insert points" ON points_ledger;
EXCEPTION WHEN undefined_object THEN null;
END $$;
CREATE POLICY "System can insert points" ON points_ledger
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
