-- ============================================================
-- LMS — Learning paths (migration 010)
-- Run AFTER 001. Safe to re-run.
-- A path is an ordered sequence of courses (e.g. a Day 1–30 onboarding track).
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_paths (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_path_courses (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id   UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position  INT NOT NULL DEFAULT 1,
  UNIQUE (path_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_lpc_path ON learning_path_courses(path_id, position);

ALTER TABLE learning_paths        ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_courses ENABLE ROW LEVEL SECURITY;

-- Curriculum structure isn't sensitive: admins manage, any signed-in user reads.
DROP POLICY IF EXISTS "admins full access on learning_paths" ON learning_paths;
CREATE POLICY "admins full access on learning_paths" ON learning_paths FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "read learning_paths" ON learning_paths;
CREATE POLICY "read learning_paths" ON learning_paths FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admins full access on learning_path_courses" ON learning_path_courses;
CREATE POLICY "admins full access on learning_path_courses" ON learning_path_courses FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "read learning_path_courses" ON learning_path_courses;
CREATE POLICY "read learning_path_courses" ON learning_path_courses FOR SELECT USING (auth.uid() IS NOT NULL);
