-- Backfill course_modules / module_tasks from legacy levels / tasks
--
-- Why: migration 0007 converted levels -> course_modules, but at that time the
-- seed data (levels/tasks) had not been inserted yet, so course_modules stayed
-- empty. The app reads course content from course_modules, so students saw
-- courses with zero modules (no classwork, no live sessions, no boss exams).
--
-- This migration is idempotent: it only inserts modules/task-links that are
-- missing. Running it multiple times is safe.

-- ---------------------------------------------------------------------
-- 1. Insert missing modules from levels (one per level)
-- ---------------------------------------------------------------------
INSERT INTO course_modules (id, course_id, module_type, title, description, module_order, points_value)
SELECT
  gen_random_uuid(),
  l.course_id,
  CASE WHEN l.is_boss THEN 'boss' ELSE 'classwork' END,
  l.title,
  l.title,
  l.level_number,
  l.points_value
FROM levels l
WHERE NOT EXISTS (
  SELECT 1 FROM course_modules cm
  WHERE cm.course_id = l.course_id AND cm.module_order = l.level_number
);

-- ---------------------------------------------------------------------
-- 2. Link existing tasks to the backfilled modules
-- ---------------------------------------------------------------------
INSERT INTO module_tasks (module_id, task_id, task_order)
SELECT
  cm.id,
  t.id,
  ROW_NUMBER() OVER (PARTITION BY cm.id ORDER BY t.created_at) - 1
FROM course_modules cm
JOIN levels l ON l.course_id = cm.course_id AND l.level_number = cm.module_order
JOIN tasks t ON t.level_id = l.id
WHERE NOT EXISTS (
  SELECT 1 FROM module_tasks mt WHERE mt.module_id = cm.id AND mt.task_id = t.id
);

-- ---------------------------------------------------------------------
-- 3. Set is_free sensibly for the backfilled modules
--    - Modules in a course marked entirely free  -> free
--    - The first module of any course            -> free (try-before-you-buy)
--    - Everything else                           -> stays paid (admin can toggle)
-- ---------------------------------------------------------------------
UPDATE course_modules cm SET is_free = TRUE
WHERE cm.is_free = FALSE
  AND (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = cm.course_id AND c.is_free = TRUE)
    OR cm.module_order = (SELECT MIN(module_order) FROM course_modules WHERE course_id = cm.course_id)
  );