-- ============================================================
-- LMS — Initial Schema
-- Run this in Supabase SQL editor: Dashboard → SQL Editor → New query
-- ============================================================

-- Enum types
CREATE TYPE user_role AS ENUM ('admin', 'student');
CREATE TYPE lesson_type AS ENUM ('article', 'quiz');

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (auto-created from auth.users via trigger below)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        user_role NOT NULL DEFAULT 'student',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Courses
CREATE TABLE courses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  thumbnail_url TEXT,
  published    BOOLEAN NOT NULL DEFAULT false,
  created_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Modules (chapters within a course)
CREATE TABLE modules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  position   INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lessons
CREATE TABLE lessons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id  UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  type       lesson_type NOT NULL DEFAULT 'article',
  position   INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Article content (rich text JSON from Tiptap)
CREATE TABLE article_content (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id  UUID NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  content    JSONB
);

-- File attachments
CREATE TABLE attachments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id  UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  file_url   TEXT NOT NULL,
  file_size  BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quizzes
CREATE TABLE quizzes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   UUID NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  pass_score  INT NOT NULL DEFAULT 70  -- percentage (0–100)
);

-- Questions
CREATE TABLE questions (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id  UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  text     TEXT NOT NULL,
  position INT NOT NULL DEFAULT 1
);

-- Answer options per question
CREATE TABLE question_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT false
);

-- Enrollments (admin assigns student → course)
CREATE TABLE enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);

-- Lesson completion tracking
CREATE TABLE lesson_completions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, lesson_id)
);

-- Quiz attempts
CREATE TABLE quiz_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id      UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score        INT NOT NULL DEFAULT 0,
  max_score    INT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student answers per attempt
CREATE TABLE quiz_answers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id         UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id        UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_id UUID NOT NULL REFERENCES question_options(id) ON DELETE CASCADE
);

-- ============================================================
-- TRIGGER: auto-create profile on sign-up
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_content    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options   ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers       ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: check if current user is enrolled in a course
CREATE OR REPLACE FUNCTION is_enrolled(p_course_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM enrollments WHERE student_id = auth.uid() AND course_id = p_course_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- profiles
CREATE POLICY "users read own profile"    ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "admins read all profiles"  ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "users update own profile"  ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "admins update profiles"    ON profiles FOR UPDATE USING (is_admin());

-- courses
CREATE POLICY "admins full access on courses"  ON courses FOR ALL USING (is_admin());
CREATE POLICY "students read published courses" ON courses FOR SELECT
  USING (published = true AND is_enrolled(id));

-- modules
CREATE POLICY "admins full access on modules"   ON modules FOR ALL USING (is_admin());
CREATE POLICY "students read enrolled modules"  ON modules FOR SELECT
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.published AND is_enrolled(c.id)));

-- lessons
CREATE POLICY "admins full access on lessons"   ON lessons FOR ALL USING (is_admin());
CREATE POLICY "students read enrolled lessons"  ON lessons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM modules m JOIN courses c ON c.id = m.course_id
    WHERE m.id = module_id AND c.published AND is_enrolled(c.id)
  ));

-- article_content
CREATE POLICY "admins full access on article_content"  ON article_content FOR ALL USING (is_admin());
CREATE POLICY "students read article_content"          ON article_content FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
    WHERE l.id = lesson_id AND c.published AND is_enrolled(c.id)
  ));

-- attachments
CREATE POLICY "admins full access on attachments"  ON attachments FOR ALL USING (is_admin());
CREATE POLICY "students read attachments"          ON attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
    WHERE l.id = lesson_id AND c.published AND is_enrolled(c.id)
  ));

-- quizzes / questions / question_options
CREATE POLICY "admins full access on quizzes"         ON quizzes          FOR ALL USING (is_admin());
CREATE POLICY "admins full access on questions"       ON questions        FOR ALL USING (is_admin());
CREATE POLICY "admins full access on question_options" ON question_options FOR ALL USING (is_admin());

CREATE POLICY "students read quizzes" ON quizzes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
    WHERE l.id = lesson_id AND c.published AND is_enrolled(c.id)
  ));
CREATE POLICY "students read questions" ON questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_id));
CREATE POLICY "students read options" ON question_options FOR SELECT
  USING (EXISTS (SELECT 1 FROM questions q WHERE q.id = question_id));

-- enrollments
CREATE POLICY "admins full access on enrollments"  ON enrollments FOR ALL USING (is_admin());
CREATE POLICY "students read own enrollments"      ON enrollments FOR SELECT USING (student_id = auth.uid());

-- lesson_completions
CREATE POLICY "admins read all completions"   ON lesson_completions FOR SELECT USING (is_admin());
CREATE POLICY "students manage own completions" ON lesson_completions FOR ALL USING (student_id = auth.uid());

-- quiz_attempts
CREATE POLICY "admins read all attempts"    ON quiz_attempts FOR SELECT USING (is_admin());
CREATE POLICY "students manage own attempts" ON quiz_attempts FOR ALL USING (student_id = auth.uid());

-- quiz_answers
CREATE POLICY "admins read all answers"    ON quiz_answers FOR SELECT USING (is_admin());
CREATE POLICY "students manage own answers" ON quiz_answers FOR ALL USING (
  EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.id = attempt_id AND a.student_id = auth.uid())
);

-- ============================================================
-- STORAGE
-- Run these separately in Supabase Dashboard → Storage
-- (or use the Storage tab to create the bucket manually)
-- ============================================================

-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true);
--
-- CREATE POLICY "admins upload attachments"  ON storage.objects FOR INSERT USING (bucket_id = 'attachments' AND is_admin());
-- CREATE POLICY "anyone download attachments" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');
-- CREATE POLICY "admins delete attachments"  ON storage.objects FOR DELETE USING (bucket_id = 'attachments' AND is_admin());
