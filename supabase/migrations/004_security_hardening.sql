-- ============================================================
-- LMS — Security hardening (migration 004)
-- Run AFTER 001/002 (003 optional). Closes a privilege-escalation hole.
-- Safe to re-run.
-- ============================================================

-- The "users update own profile" RLS policy (migration 001) lets a user
-- update their own row but does NOT restrict the `role` column — so a normal
-- user could set their own role to 'admin'. This trigger blocks any role
-- change unless the caller is already an admin. (Admins set roles via the
-- Supabase Table Editor / service role, which bypasses this.)
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_admin() THEN
    RAISE EXCEPTION 'Changing role is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_prevent_role_change ON profiles;
CREATE TRIGGER profiles_prevent_role_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_change();
