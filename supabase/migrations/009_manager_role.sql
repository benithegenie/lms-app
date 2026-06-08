-- ============================================================
-- LMS — Manager role (migration 009)
-- Run AFTER 002. A "manager" sees/nudges ONLY their team (the members of the
-- groups they manage), enforced by RLS.
-- NOTE: if Supabase errors on "unsafe use of new enum value", run JUST the
-- first ALTER TYPE line on its own first, then run the rest.
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';

-- Which managers manage which groups
CREATE TABLE IF NOT EXISTS group_managers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_group_managers_profile ON group_managers(profile_id);

ALTER TABLE group_managers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins full access on group_managers" ON group_managers;
CREATE POLICY "admins full access on group_managers" ON group_managers FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "managers read own management" ON group_managers;
CREATE POLICY "managers read own management" ON group_managers FOR SELECT USING (profile_id = auth.uid());

-- Helpers (role::text avoids using the freshly-added enum value at migration time)
CREATE OR REPLACE FUNCTION is_manager() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'manager');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION manages_profile(p_profile_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_managers gm
    JOIN group_members mem ON mem.group_id = gm.group_id
    WHERE gm.profile_id = auth.uid() AND mem.profile_id = p_profile_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Managers may read training content (not sensitive)
DROP POLICY IF EXISTS "managers read courses" ON courses;
CREATE POLICY "managers read courses" ON courses FOR SELECT USING (is_manager());
DROP POLICY IF EXISTS "managers read modules" ON modules;
CREATE POLICY "managers read modules" ON modules FOR SELECT USING (is_manager());
DROP POLICY IF EXISTS "managers read lessons" ON lessons;
CREATE POLICY "managers read lessons" ON lessons FOR SELECT USING (is_manager());

-- Managers may read/act on THEIR TEAM's people and records (scoped)
DROP POLICY IF EXISTS "managers read team profiles" ON profiles;
CREATE POLICY "managers read team profiles" ON profiles FOR SELECT USING (manages_profile(id));
DROP POLICY IF EXISTS "managers read team enrollments" ON enrollments;
CREATE POLICY "managers read team enrollments" ON enrollments FOR SELECT USING (manages_profile(student_id));
DROP POLICY IF EXISTS "managers read team completions" ON lesson_completions;
CREATE POLICY "managers read team completions" ON lesson_completions FOR SELECT USING (manages_profile(student_id));
DROP POLICY IF EXISTS "managers manage team notifications" ON notifications;
CREATE POLICY "managers manage team notifications" ON notifications FOR ALL USING (manages_profile(profile_id));
