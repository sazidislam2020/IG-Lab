-- =====================================================
-- 0023: Designable certificates & congratulation posters,
--       paid certificates, and course completion tracking.
--
-- 1. design_templates — Canva-style designs (JSONB canvas + elements)
--      type: 'certificate' | 'poster'
--      scope: 'global' (default for all courses) | 'course' (override)
-- 2. courses.certificate_price — >0 means the certificate must be paid for
-- 3. certificates.locked — certificate earned but awaiting payment
-- 4. course_completions — records completion independent of certificates
--      (a poster can be awarded even when certificates are off)
-- 5. certificate_purchases — demo unlock record for a paid certificate
-- 6. check_course_completion() — records completion + sets locked flag
-- 7. unlock_certificate() RPC — demo purchase/activation of a cert
-- =====================================================

-- 1) ── Design templates ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS design_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('certificate', 'poster')),
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'course')),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled design',
  canvas JSONB NOT NULL DEFAULT '{}'::jsonb,
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- a course-scoped design must reference a course
  CONSTRAINT course_scope_needs_course CHECK (
    scope = 'global' OR course_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_design_templates_lookup
  ON design_templates(type, scope, course_id, is_active);
CREATE INDEX IF NOT EXISTS idx_design_templates_active
  ON design_templates(type, scope, course_id) WHERE is_active;

ALTER TABLE design_templates ENABLE ROW LEVEL SECURITY;

-- Everyone (incl. anonymous) can read designs — they render public artifacts.
CREATE POLICY "Public read design templates" ON design_templates
  FOR SELECT USING (TRUE);

-- Only admins write
CREATE POLICY "Admins manage design templates" ON design_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- 2) ── Paid certificates ──────────────────────────────────────
ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificate_price NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 3) ── Certificates: locked until paid ────────────────────────
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ;

-- Students may see their own locked/unlocked certs (RLS already scopes by user_id).
-- No extra SELECT policy needed.

-- 4) ── Course completions (poster trigger, independent of cert) ──
CREATE TABLE IF NOT EXISTS course_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  total_points INTEGER DEFAULT 0,
  UNIQUE(user_id, course_id)
);

ALTER TABLE course_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own completions" ON course_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins read all completions" ON course_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_completions_user ON course_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_course ON course_completions(course_id);

-- 5) ── Certificate purchases (demo unlock) ────────────────────
CREATE TABLE IF NOT EXISTS certificate_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  certificate_id UUID REFERENCES certificates(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'demo',
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE certificate_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own cert purchases" ON certificate_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins read all cert purchases" ON certificate_purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Direct client writes blocked: unlock goes through unlock_certificate() RPC.

-- 6) ── Updated completion trigger ─────────────────────────────
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
  v_cert_price NUMERIC(10,2);
  v_locked BOOLEAN;
  v_cert_id TEXT;
  v_cert_uuid UUID;
BEGIN
  IF NEW.passed = false THEN
    RETURN NEW;
  END IF;

  v_user_id := NEW.user_id;

  -- Resolve the course a task belongs to. Tasks reach a course either
  -- directly through levels, or through a course module (module_tasks).
  SELECT COALESCE(
    (SELECT l.course_id FROM tasks t
       JOIN levels l ON t.level_id = l.id
      WHERE t.id = NEW.task_id),
    (SELECT cm.course_id FROM tasks t
       JOIN module_tasks mt ON mt.task_id = t.id
       JOIN course_modules cm ON cm.id = mt.module_id
      WHERE t.id = NEW.task_id)
  ) INTO v_course_id;

  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- All tasks that belong to this course (levels path UNION module path)
  -- Count total tasks in course
  SELECT COUNT(*) INTO v_total_tasks
  FROM (
    SELECT t.id FROM tasks t
      JOIN levels l ON t.level_id = l.id
     WHERE l.course_id = v_course_id
    UNION
    SELECT t.id FROM tasks t
      JOIN module_tasks mt ON mt.task_id = t.id
      JOIN course_modules cm ON cm.id = mt.module_id
     WHERE cm.course_id = v_course_id
  ) course_tasks;

  -- Count completed tasks by this user in this course
  SELECT COUNT(DISTINCT s.task_id) INTO v_completed_tasks
  FROM submissions s
  WHERE s.user_id = v_user_id
    AND s.passed = true
    AND s.task_id IN (
      SELECT t.id FROM tasks t
        JOIN levels l ON t.level_id = l.id
       WHERE l.course_id = v_course_id
      UNION
      SELECT t.id FROM tasks t
        JOIN module_tasks mt ON mt.task_id = t.id
        JOIN course_modules cm ON cm.id = mt.module_id
       WHERE cm.course_id = v_course_id
    );

  IF v_completed_tasks < v_total_tasks OR v_total_tasks = 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate total points
  SELECT COALESCE(SUM(s.points_awarded), 0) INTO v_total_points
  FROM submissions s
  WHERE s.user_id = v_user_id
    AND s.passed = true
    AND s.task_id IN (
      SELECT t.id FROM tasks t
        JOIN levels l ON t.level_id = l.id
       WHERE l.course_id = v_course_id
      UNION
      SELECT t.id FROM tasks t
        JOIN module_tasks mt ON mt.task_id = t.id
        JOIN course_modules cm ON cm.id = mt.module_id
       WHERE cm.course_id = v_course_id
    );

  -- Record completion (drives the congratulation poster, always)
  INSERT INTO course_completions (user_id, course_id, total_points)
  VALUES (v_user_id, v_course_id, v_total_points)
  ON CONFLICT (user_id, course_id)
  DO UPDATE SET total_points = EXCLUDED.total_points,
                completed_at = course_completions.completed_at;

  -- Certificate rules
  SELECT COALESCE(certificate_enabled, TRUE) INTO v_cert_enabled
  FROM courses WHERE id = v_course_id;
  IF v_cert_enabled = FALSE THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM certificate_blocks
    WHERE user_id = v_user_id AND course_id = v_course_id
  ) INTO v_is_blocked;
  IF v_is_blocked THEN
    RETURN NEW;
  END IF;

  -- Already have a certificate for this course?
  IF EXISTS (
    SELECT 1 FROM certificates
    WHERE user_id = v_user_id AND course_id = v_course_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Paid certificate?
  SELECT COALESCE(certificate_price, 0) INTO v_cert_price
  FROM courses WHERE id = v_course_id;
  v_locked := (v_cert_price > 0);

  SELECT COALESCE(full_name, split_part(email, '@', 1)) INTO v_student_name
  FROM profiles WHERE id = v_user_id;

  SELECT title INTO v_course_name FROM courses WHERE id = v_course_id;

  v_cert_id := 'IL-' || UPPER(SUBSTR(v_user_id::text, -4)) || '-' ||
               UPPER(SUBSTR(v_course_id::text, -4)) || '-' ||
               UPPER(TO_CHAR(NOW(), 'YYMMDDHH24MISS'));

  INSERT INTO certificates (
    user_id, course_id, certificate_id,
    student_name, course_name, total_points,
    locked, unlocked_at
  ) VALUES (
    v_user_id, v_course_id, v_cert_id,
    v_student_name, v_course_name, v_total_points,
    v_locked, CASE WHEN v_locked THEN NULL ELSE NOW() END
  )
  RETURNING id INTO v_cert_uuid;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_submission_completed ON submissions;
CREATE TRIGGER on_submission_completed
  AFTER INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION check_course_completion();

-- 7) ── Demo unlock RPC for a paid certificate ──────────────────
CREATE OR REPLACE FUNCTION unlock_certificate(p_course_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_cert certificates%ROWTYPE;
  v_price NUMERIC(10,2);
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'Not signed in');
  END IF;

  -- The caller's certificate for this course
  SELECT * INTO v_cert
  FROM certificates
  WHERE user_id = v_user_id AND course_id = p_course_id;

  IF v_cert.id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'No certificate found');
  END IF;

  IF v_cert.locked = FALSE THEN
    RETURN jsonb_build_object('ok', TRUE, 'already', TRUE);
  END IF;

  SELECT COALESCE(certificate_price, 0) INTO v_price
  FROM courses WHERE id = p_course_id;

  -- Record the (demo) purchase
  INSERT INTO certificate_purchases (user_id, course_id, certificate_id, amount, payment_method)
  VALUES (v_user_id, p_course_id, v_cert.id, v_price, 'demo');

  UPDATE certificates
  SET locked = FALSE, unlocked_at = NOW()
  WHERE id = v_cert.id;

  RETURN jsonb_build_object('ok', TRUE, 'amount', v_price);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION unlock_certificate(UUID) TO authenticated;