-- ============================================================
-- LMS — Annual recertification / TTL (migration 006)
-- Run AFTER 002 (003 optional). Safe to re-run.
-- ============================================================

-- How long a completion stays valid before it must be redone.
-- NULL = never expires. (Distinct from due_in_days = deadline to FIRST complete.)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS recert_interval_days INT;

-- Recert-aware version of the email/reminder view (supersedes 003's definition).
-- A row appears when the student has an unfinished required course OR a finished
-- one whose recertification window has lapsed.
CREATE OR REPLACE VIEW v_pending_compliance AS
SELECT
  e.student_id  AS profile_id,
  p.email,
  p.full_name,
  c.id          AS course_id,
  c.title       AS course_title,
  n.due_at,
  CASE
    WHEN c.recert_interval_days IS NOT NULL AND comp.all_done
      THEN comp.last_completed + make_interval(days => c.recert_interval_days)
    ELSE NULL
  END AS expires_at
FROM enrollments e
JOIN courses  c ON c.id = e.course_id AND c.is_mandatory AND c.published
JOIN profiles p ON p.id = e.student_id
LEFT JOIN LATERAL (
  SELECT nn.due_at FROM notifications nn
  WHERE nn.profile_id = e.student_id AND nn.course_id = e.course_id AND nn.dismissed_at IS NULL
  ORDER BY nn.created_at DESC LIMIT 1
) n ON true
LEFT JOIN LATERAL (
  SELECT
    (count(*) FILTER (WHERE lc.id IS NULL)) = 0 AS all_done,
    max(lc.completed_at) AS last_completed
  FROM modules m
  JOIN lessons l ON l.module_id = m.id
  LEFT JOIN lesson_completions lc ON lc.lesson_id = l.id AND lc.student_id = e.student_id
  WHERE m.course_id = c.id
) comp ON true
WHERE
  (NOT comp.all_done)
  OR (
    c.recert_interval_days IS NOT NULL
    AND comp.all_done
    AND comp.last_completed + make_interval(days => c.recert_interval_days) < now()
  );

REVOKE ALL ON v_pending_compliance FROM anon, authenticated;
ALTER VIEW v_pending_compliance SET (security_invoker = on);
