-- One-attempt submission policy + manual grading
--
-- Rules:
--   1. Each student can submit ONLY ONCE per task (unique task_id + user_id).
--   2. Wrong answers are recorded as failed submissions (no points, no retry).
--   3. Auto-grading (Judge0 output comparison) marks submissions immediately.
--   4. Teachers/admins can manually override: grade a submission passed or
--      failed, which awards or revokes points.

-- ---------------------------------------------------------------------
-- 1. Grading columns
-- ---------------------------------------------------------------------
ALTER TABLE submissions ADD COLUMN graded_by text DEFAULT NULL;      -- 'auto' | 'manual'
ALTER TABLE submissions ADD COLUMN reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN reviewed_at timestamptz;
ALTER TABLE submissions ADD COLUMN reviewer_note text;

-- ---------------------------------------------------------------------
-- 2. Dedupe existing duplicates — keep only the latest submission
--    per (task_id, user_id) so the unique constraint can be added.
-- ---------------------------------------------------------------------
DELETE FROM submissions a USING submissions b
WHERE a.task_id = b.task_id
  AND a.user_id = b.user_id
  AND (a.created_at < b.created_at OR (a.created_at = b.created_at AND a.id < b.id));

-- ---------------------------------------------------------------------
-- 3. Unique constraint: one submission per task per student (DB-enforced)
-- ---------------------------------------------------------------------
ALTER TABLE submissions ADD CONSTRAINT submissions_user_task_unique UNIQUE (task_id, user_id);

-- ---------------------------------------------------------------------
-- 4. Staff can update submissions (manual grading / override)
-- ---------------------------------------------------------------------
CREATE POLICY "Staff can grade submissions" ON submissions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin'))
  );

-- ---------------------------------------------------------------------
-- 5. Staff can manage the points ledger (award on manual pass, revoke on fail)
-- ---------------------------------------------------------------------
CREATE POLICY "Staff can manage points ledger" ON points_ledger
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin'))
  );