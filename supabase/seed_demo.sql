-- ============================================================
-- LMS — Demo seed data
-- Run AFTER migrations 001–007, in the Supabase SQL Editor.
-- Requires your account to already be an admin (profiles.role = 'admin').
-- Idempotent: uses fixed IDs + ON CONFLICT DO NOTHING, so re-running is safe.
--
-- Creates: a published, mandatory "Information Security Policy" course
-- (2 article lessons + a verification quiz, 365-day recert) assigned to a
-- "Sales Team" group. After running: register a student, add them to
-- Sales Team (admin → Groups), then Courses → shield → Assign now.
-- ============================================================

-- Course (created_by = first admin)
INSERT INTO courses (id, title, description, published, created_by, is_mandatory, due_in_days, recert_interval_days)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Information Security Policy',
  'Company-wide security rules every employee must read and acknowledge.',
  true,
  (SELECT id FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1),
  true, 14, 365
)
ON CONFLICT DO NOTHING;

-- Module
INSERT INTO modules (id, course_id, title, position)
VALUES ('a0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Core Policy', 1)
ON CONFLICT DO NOTHING;

-- Lessons (2 articles + 1 quiz)
INSERT INTO lessons (id, module_id, title, type, position) VALUES
  ('a0000000-0000-0000-0000-000000000100', 'a0000000-0000-0000-0000-000000000010', 'Password & Account Security', 'article', 1),
  ('a0000000-0000-0000-0000-000000000101', 'a0000000-0000-0000-0000-000000000010', 'Handling Sensitive Data', 'article', 2),
  ('a0000000-0000-0000-0000-000000000102', 'a0000000-0000-0000-0000-000000000010', 'Verification Quiz', 'quiz', 3)
ON CONFLICT DO NOTHING;

-- Article content (Tiptap JSON; the 007 trigger fills search_text)
INSERT INTO article_content (id, lesson_id, content) VALUES
('a0000000-0000-0000-0000-000000001000', 'a0000000-0000-0000-0000-000000000100', $json$
{"type":"doc","content":[
  {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Password & Account Security"}]},
  {"type":"paragraph","content":[{"type":"text","text":"All employees must use strong, unique passwords and enable multi-factor authentication (MFA) on every company system."}]},
  {"type":"callout","attrs":{"variant":"warn"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Never share your password or reuse it across services. IT will never ask for your password."}]}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Use at least 12 characters."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Enable MFA everywhere it is offered."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Lock your screen when you step away."}]}]}
  ]}
]}
$json$::jsonb),
('a0000000-0000-0000-0000-000000001001', 'a0000000-0000-0000-0000-000000000101', $json$
{"type":"doc","content":[
  {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Handling Sensitive Data"}]},
  {"type":"paragraph","content":[{"type":"text","text":"Customer and company data must only be stored in approved systems and shared on a need-to-know basis."}]},
  {"type":"callout","attrs":{"variant":"info"},"content":[{"type":"paragraph","content":[{"type":"text","text":"When in doubt, treat data as confidential and ask your manager before sharing."}]}]},
  {"type":"paragraph","content":[{"type":"text","text":"Report any suspected data breach or phishing attempt to IT immediately."}]}
]}
$json$::jsonb)
ON CONFLICT DO NOTHING;

-- Quiz + questions + options
INSERT INTO quizzes (id, lesson_id, pass_score)
VALUES ('a0000000-0000-0000-0000-000000010000', 'a0000000-0000-0000-0000-000000000102', 70)
ON CONFLICT DO NOTHING;

INSERT INTO questions (id, quiz_id, text, position) VALUES
  ('a0000000-0000-0000-0000-000000010001', 'a0000000-0000-0000-0000-000000010000', 'What is the minimum recommended password length?', 1),
  ('a0000000-0000-0000-0000-000000010002', 'a0000000-0000-0000-0000-000000010000', 'What must be enabled on every company system?', 2),
  ('a0000000-0000-0000-0000-000000010003', 'a0000000-0000-0000-0000-000000010000', 'What should you do with a suspicious email?', 3)
ON CONFLICT DO NOTHING;

INSERT INTO question_options (id, question_id, text, is_correct) VALUES
  ('a0000000-0000-0000-0000-000000020001', 'a0000000-0000-0000-0000-000000010001', '8 characters', false),
  ('a0000000-0000-0000-0000-000000020002', 'a0000000-0000-0000-0000-000000010001', '12 characters', true),
  ('a0000000-0000-0000-0000-000000020003', 'a0000000-0000-0000-0000-000000010001', '4 characters', false),
  ('a0000000-0000-0000-0000-000000020004', 'a0000000-0000-0000-0000-000000010002', 'Auto-login', false),
  ('a0000000-0000-0000-0000-000000020005', 'a0000000-0000-0000-0000-000000010002', 'Multi-factor authentication (MFA)', true),
  ('a0000000-0000-0000-0000-000000020006', 'a0000000-0000-0000-0000-000000010002', 'Password sharing', false),
  ('a0000000-0000-0000-0000-000000020007', 'a0000000-0000-0000-0000-000000010003', 'Click the link to investigate', false),
  ('a0000000-0000-0000-0000-000000020008', 'a0000000-0000-0000-0000-000000010003', 'Report it to IT', true),
  ('a0000000-0000-0000-0000-000000020009', 'a0000000-0000-0000-0000-000000010003', 'Forward it to colleagues', false)
ON CONFLICT DO NOTHING;

-- Group + required link
INSERT INTO groups (id, name, description)
VALUES ('b0000000-0000-0000-0000-000000000001', 'Sales Team', 'Demo group')
ON CONFLICT DO NOTHING;

INSERT INTO course_required_groups (id, course_id, group_id)
VALUES ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
