-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  certificate_id TEXT UNIQUE NOT NULL,
  student_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id) -- One certificate per user per course
);

-- Enable RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
CREATE POLICY "Users can view own certificates" ON certificates
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert certificates (via function)
CREATE POLICY "System can insert certificates" ON certificates
  FOR INSERT WITH CHECK (true);

-- Admins can view all certificates
CREATE POLICY "Admins can view all certificates" ON certificates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Function to check if student completed a course and award certificate
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

-- Trigger to check course completion after each submission
CREATE TRIGGER on_submission_completed
  AFTER INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION check_course_completion();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON certificates(course_id);
