-- ============================================================
-- LMS — Article version history (migration 005)
-- Run AFTER 001/002. Safe to re-run.
-- ============================================================

-- One snapshot per saved edit of an article lesson.
CREATE TABLE IF NOT EXISTS article_content_versions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id  UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content    JSONB,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acv_lesson ON article_content_versions(lesson_id, created_at DESC);

ALTER TABLE article_content_versions ENABLE ROW LEVEL SECURITY;

-- Admins manage all versions
DROP POLICY IF EXISTS "admins full access on article_content_versions" ON article_content_versions;
CREATE POLICY "admins full access on article_content_versions" ON article_content_versions
  FOR ALL USING (is_admin());

-- Students can read versions for lessons in their enrolled, published courses
-- (same rule as article_content)
DROP POLICY IF EXISTS "students read article_content_versions" ON article_content_versions;
CREATE POLICY "students read article_content_versions" ON article_content_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE l.id = lesson_id AND c.published AND is_enrolled(c.id)
    )
  );
