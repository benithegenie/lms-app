-- ============================================================
-- LMS — Audit log + read-acknowledgements (migration 008)
-- Run AFTER 001/002. Safe to re-run.
-- ============================================================

-- Explicit "I have read and understood" attestations (per article lesson).
CREATE TABLE IF NOT EXISTS acknowledgements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, lesson_id)
);

ALTER TABLE acknowledgements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students manage own acknowledgements" ON acknowledgements;
CREATE POLICY "students manage own acknowledgements" ON acknowledgements
  FOR ALL USING (student_id = auth.uid());
DROP POLICY IF EXISTS "admins read acknowledgements" ON acknowledgements;
CREATE POLICY "admins read acknowledgements" ON acknowledgements
  FOR SELECT USING (is_admin());

-- ------------------------------------------------------------
-- Append-only audit log. Written ONLY by SECURITY DEFINER triggers
-- (clients can't insert/update/delete) → tamper-resistant.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID,                 -- the subject of the event
  actor_id   UUID,                 -- who caused it
  event      TEXT NOT NULL,        -- lesson_completed | quiz_submitted | acknowledged | enrolled
  course_id  UUID,
  lesson_id  UUID,
  detail     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_profile ON audit_log(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_course  ON audit_log(course_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- Only admins can read; nobody can write from the client (triggers bypass RLS).
DROP POLICY IF EXISTS "admins read audit_log" ON audit_log;
CREATE POLICY "admins read audit_log" ON audit_log FOR SELECT USING (is_admin());

-- Helper: course id for a lesson
CREATE OR REPLACE FUNCTION course_of_lesson(p_lesson_id UUID)
RETURNS UUID AS $$
  SELECT m.course_id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = p_lesson_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- lesson_completions → audit
CREATE OR REPLACE FUNCTION audit_lesson_completion() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (profile_id, actor_id, event, course_id, lesson_id, detail)
  VALUES (NEW.student_id, auth.uid(), 'lesson_completed', course_of_lesson(NEW.lesson_id), NEW.lesson_id,
          jsonb_build_object('completed_at', NEW.completed_at));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_audit_lesson_completion ON lesson_completions;
CREATE TRIGGER trg_audit_lesson_completion
  AFTER INSERT OR UPDATE ON lesson_completions
  FOR EACH ROW EXECUTE FUNCTION audit_lesson_completion();

-- quiz_attempts → audit
CREATE OR REPLACE FUNCTION audit_quiz_attempt() RETURNS TRIGGER AS $$
DECLARE lid UUID; pscore INT; passed BOOLEAN;
BEGIN
  SELECT lesson_id, pass_score INTO lid, pscore FROM quizzes WHERE id = NEW.quiz_id;
  passed := (NEW.max_score > 0 AND (NEW.score::numeric / NEW.max_score * 100) >= pscore);
  INSERT INTO audit_log (profile_id, actor_id, event, course_id, lesson_id, detail)
  VALUES (NEW.student_id, auth.uid(), 'quiz_submitted', course_of_lesson(lid), lid,
          jsonb_build_object('score', NEW.score, 'max_score', NEW.max_score, 'passed', passed));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_audit_quiz_attempt ON quiz_attempts;
CREATE TRIGGER trg_audit_quiz_attempt
  AFTER INSERT ON quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION audit_quiz_attempt();

-- acknowledgements → audit
CREATE OR REPLACE FUNCTION audit_acknowledgement() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (profile_id, actor_id, event, course_id, lesson_id)
  VALUES (NEW.student_id, auth.uid(), 'acknowledged', course_of_lesson(NEW.lesson_id), NEW.lesson_id);
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_audit_acknowledgement ON acknowledgements;
CREATE TRIGGER trg_audit_acknowledgement
  AFTER INSERT ON acknowledgements
  FOR EACH ROW EXECUTE FUNCTION audit_acknowledgement();

-- enrollments → audit
CREATE OR REPLACE FUNCTION audit_enrollment() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (profile_id, actor_id, event, course_id)
  VALUES (NEW.student_id, auth.uid(), 'enrolled', NEW.course_id);
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_audit_enrollment ON enrollments;
CREATE TRIGGER trg_audit_enrollment
  AFTER INSERT ON enrollments
  FOR EACH ROW EXECUTE FUNCTION audit_enrollment();
