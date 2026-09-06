-- Add is_free toggle to course_modules
-- Super admin can control which modules are free vs paid
-- This allows marketing campaigns: unlock all modules for free, or lock specific ones

-- Add the column (default: level 0 is free, everything else is paid)
ALTER TABLE course_modules ADD COLUMN is_free boolean NOT NULL DEFAULT false;

-- Set level 0 modules as free by default
UPDATE course_modules SET is_free = true WHERE module_order = 0;

-- Add a helpful comment
COMMENT ON COLUMN course_modules.is_free IS 'Super admin toggle: true = free for all students, false = requires paid subscription';
