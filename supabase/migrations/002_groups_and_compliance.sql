-- ============================================================
-- LMS — Groups & Compliance (migration 002)
-- Run AFTER 001_initial_schema.sql:
--   Supabase Dashboard → SQL Editor → New query → paste all → Run
-- Safe to run more than once (idempotent).
-- ============================================================

-- Notification type enum (guarded so re-runs don't error)
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('mandatory_assigned', 'reminder', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

-- Groups (e.g. "Sales Team", "Engineering")
CREATE TABLE IF NOT EXISTS groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group membership (a student belongs to a group)
CREATE TABLE IF NOT EXISTS group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, profile_id)
);

-- Mandatory-course settings (additive columns on existing courses)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS due_in_days  INT;  -- days from assignment to deadline

-- Which groups are required to complete a mandatory course
CREATE TABLE IF NOT EXISTS course_required_groups (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  UNIQUE (course_id, group_id)
);

-- In-app notifications (mandatory assignment + reminders)
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type         notification_type NOT NULL DEFAULT 'mandatory_assigned',
  due_at       TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_group_members_group   ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_profile ON group_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_crg_course            ON course_required_groups(course_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY  (is_admin() helper already exists from 001)
-- ------------------------------------------------------------

ALTER TABLE groups                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_required_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;

-- groups: admins manage
DROP POLICY IF EXISTS "admins full access on groups" ON groups;
CREATE POLICY "admins full access on groups" ON groups FOR ALL USING (is_admin());

-- group_members: admins manage
DROP POLICY IF EXISTS "admins full access on group_members" ON group_members;
CREATE POLICY "admins full access on group_members" ON group_members FOR ALL USING (is_admin());

-- course_required_groups: admins manage
DROP POLICY IF EXISTS "admins full access on course_required_groups" ON course_required_groups;
CREATE POLICY "admins full access on course_required_groups" ON course_required_groups FOR ALL USING (is_admin());

-- notifications: admins manage all; students read + dismiss their own
DROP POLICY IF EXISTS "admins full access on notifications" ON notifications;
CREATE POLICY "admins full access on notifications" ON notifications FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "students read own notifications" ON notifications;
CREATE POLICY "students read own notifications" ON notifications FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "students update own notifications" ON notifications;
CREATE POLICY "students update own notifications" ON notifications FOR UPDATE USING (profile_id = auth.uid());
