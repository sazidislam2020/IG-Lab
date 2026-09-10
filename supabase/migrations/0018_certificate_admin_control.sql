-- =====================================================
-- 0018: Admin-controlled certificates
-- 1. courses.certificate_enabled — admin decides per course
-- 2. certificate_blocks — admin can block a specific student
--    from a course's certificate, with a message
-- 3. Updated completion trigger respects both
-- =====================================================

-- 1. Per-course certificate switch (default ON to preserve existing behavior)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN DEFAULT TRUE;

-- 2. Certificate blocks: prevents a specific student from receiving
--    the certificate of a specific course, with an admin message
CREATE TABLE IF NOT EXISTS certificate_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL DEFAULT 'You are not eligible for this certificate.',
  blocked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE certificate_blocks ENABLE ROW LEVEL SECURITY;

-- Students may view a block on themselves (needed to show the admin message)
CREATE POLICY "Users can view own certificate blocks" ON certificate_blocks
  FOR SELECT USING (auth.uid() = user_id);

-- Admins full control
CREATE POLICY "Admins manage certificate blocks" ON certificate_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_cert_blocks_user ON certificate_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_cert_blocks_course ON certificate_blocks(course_id);

-- 3. Updated completion trigger — respects course switch and blocks
CREATE OR REPLACE FUNCTION check_course_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_course_id UUID;
  v_user_id UUID;
  v_total_tasks INTEGER;
  v_completed_tasks INTEGER;
  v_total_points INTEGER;
  v_student_name TEXT;
  v_course_name TEXT;
  v_cert_enabled BOOLEAN;
  v_is_blocked BOOLEAN;
  v_cert_id TEXT;
BEGIN
  -- Only process passed submissions
  IF NEW.passed = false THEN
    RETURN NEW;
  END IF;

  v_user_id := NEW.user_id;

  -- Find which course this task belongs to
  SELECT t.levels.course_id INTO v_course_id
  FROM tasks t
  WHERE t.id = NEW.task_id;

  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if certificate already exists
  IF EXISTS (
    SELECT 1 FROM certificates
    WHERE user_id = v_user_id AND course_id = v_course_id
  ) THEN
    RETURN NEW;
  END IF;

  -- NEW: admin must have enabled certificates for this course
  SELECT COALESCE(certificate_enabled, TRUE) INTO v_cert_enabled
  FROM courses WHERE id = v_course_id;

  IF v_cert_enabled = FALSE THEN
    RETURN NEW;
  END IF;

  -- NEW: admin may have blocked this specific student from this certificate
  SELECT EXISTS (
    SELECT 1 FROM certificate_blocks
    WHERE user_id = v_user_id AND course_id = v_course_id
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN NEW;
  END IF;

  -- Count total tasks in course
  SELECT COUNT(*) INTO v_total_tasks
  FROM module_tasks mt
  JOIN course_modules cm ON mt.module_id = cm.id
  WHERE cm.course_id = v_course_id;

  -- Count completed tasks by this user in this course
  SELECT COUNT(DISTINCT s.task_id) INTO v_completed_tasks
  FROM submissions s
  JOIN tasks t ON s.task_id = t.id
  JOIN levels l ON t.level_id = l.id
  WHERE s.user_id = v_user_id
    AND s.passed = true
    AND l.course_id = v_course_id;

  -- Check if all tasks completed
  IF v_completed_tasks < v_total_tasks OR v_total_tasks = 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate total points
  SELECT COALESCE(SUM(s.points_awarded), 0) INTO v_total_points
  FROM submissions s
  JOIN tasks t ON s.task_id = t.id
  JOIN levels l ON t.level_id = l.id
  WHERE s.user_id = v_user_id
    AND s.passed = true
    AND l.course_id = v_course_id;

  -- Get student name
  SELECT COALESCE(full_name, email) INTO v_student_name
  FROM profiles WHERE id = v_user_id;

  -- Get course name
  SELECT title INTO v_course_name
  FROM courses WHERE id = v_course_id;

  -- Generate certificate ID
  v_cert_id := 'IL-' || UPPER(SUBSTR(v_user_id::text, -4)) || '-' ||
               UPPER(SUBSTR(v_course_id::text, -4)) || '-' ||
               UPPER(TO_CHAR(NOW(), 'YYMMDDHH24MISS'));

  -- Create certificate
  INSERT INTO certificates (
    user_id, course_id, certificate_id,
    student_name, course_name, total_points
  ) VALUES (
    v_user_id, v_course_id, v_cert_id,
    v_student_name, v_course_name, v_total_points
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to be safe
DROP TRIGGER IF EXISTS on_submission_completed ON submissions;
CREATE TRIGGER on_submission_completed
  AFTER INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION check_course_completion();
