-- ============================================================
-- LMS — Compliance view (migration 003)
-- Run AFTER 002. Powers the daily email-reminder Edge Function.
-- Safe to re-run (CREATE OR REPLACE).
-- ============================================================

-- One row per (student, mandatory course) the student has NOT finished.
-- "Not finished" = the course has at least one lesson with no completion
-- for that student. With pass-gating, a failed quiz lesson has no
-- completion, so it correctly counts as unfinished.
CREATE OR REPLACE VIEW v_pending_compliance AS
SELECT
  e.student_id          AS profile_id,
  p.email               AS email,
  p.full_name           AS full_name,
  c.id                  AS course_id,
  c.title               AS course_title,
  n.due_at              AS due_at
FROM enrollments e
JOIN courses  c ON c.id = e.course_id AND c.is_mandatory AND c.published
JOIN profiles p ON p.id = e.student_id
LEFT JOIN LATERAL (
  SELECT nn.due_at
  FROM notifications nn
  WHERE nn.profile_id = e.student_id
    AND nn.course_id = e.course_id
    AND nn.dismissed_at IS NULL
  ORDER BY nn.created_at DESC
  LIMIT 1
) n ON true
WHERE EXISTS (
  SELECT 1
  FROM modules m
  JOIN lessons l ON l.module_id = m.id
  WHERE m.course_id = c.id
    AND NOT EXISTS (
      SELECT 1 FROM lesson_completions lc
      WHERE lc.student_id = e.student_id AND lc.lesson_id = l.id
    )
);

-- This view exposes emails — keep it off the public API.
-- Only the Edge Function (service-role key) needs it.
REVOKE ALL ON v_pending_compliance FROM anon, authenticated;

-- Defense-in-depth: if the view is ever queried by a normal user, run it with
-- THAT user's RLS (so they'd only see their own rows). The Edge Function uses
-- the service-role key, which bypasses RLS as intended.
ALTER VIEW v_pending_compliance SET (security_invoker = on);
