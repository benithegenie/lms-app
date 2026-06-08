-- ============================================================
-- LMS — Northwind Logistics demo company seed
-- Run AFTER migrations 001–010, in the Supabase SQL Editor.
-- Requires your account to already be an admin (profiles.role = 'admin').
-- Idempotent: uses fixed IDs + ON CONFLICT DO NOTHING, so re-running is safe.
-- Coexists with seed_demo.sql (uses different UUID prefixes).
--
-- What this creates:
--   • 4 groups: All Staff, Warehouse, Drivers, Sales
--   • 4 published mandatory courses (each: 2 article lessons + a quiz)
--       1. Information Security & Data Protection (All Staff, 365-day recert)
--       2. Workplace Health & Safety            (Warehouse + Drivers, 365-day)
--       3. Preventing Harassment & Discrimination (All Staff, 730-day)
--       4. Defensive Driving & Vehicle Safety   (Drivers, 365-day)
--   • 1 learning path: "New Hire Onboarding" (3 courses)
--
-- After running, see the bottom of this file for the 4 steps to bring the
-- compliance dashboard to life (register fake students, add to groups,
-- assign, take a course).
-- ============================================================

-- -----------------------------------------------------------
-- GROUPS
-- -----------------------------------------------------------
INSERT INTO groups (id, name, description) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'All Staff',  'Every Northwind Logistics employee'),
  ('e0000000-0000-0000-0000-000000000002', 'Warehouse',  'Picking, packing, forklift, dock operations'),
  ('e0000000-0000-0000-0000-000000000003', 'Drivers',    'Delivery drivers and fleet operators'),
  ('e0000000-0000-0000-0000-000000000004', 'Sales',      'Inside sales, account managers, customer success')
ON CONFLICT DO NOTHING;


-- ============================================================
-- COURSE 1 — Information Security & Data Protection
-- Required for: All Staff. Due in 14 days. 365-day recert.
-- ============================================================
INSERT INTO courses (id, title, description, published, created_by, is_mandatory, due_in_days, recert_interval_days) VALUES
('d1000000-0000-0000-0000-000000000001',
 'Information Security & Data Protection',
 'How Northwind protects customer and company data — passwords, MFA, phishing, and incident reporting.',
 true,
 (SELECT id FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1),
 true, 14, 365)
ON CONFLICT DO NOTHING;

INSERT INTO modules (id, course_id, title, position) VALUES
  ('d1000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000001', 'Foundations', 1)
ON CONFLICT DO NOTHING;

INSERT INTO lessons (id, module_id, title, type, position) VALUES
  ('d1000000-0000-0000-0000-000000000100', 'd1000000-0000-0000-0000-000000000010', 'Why Information Security Matters', 'article', 1),
  ('d1000000-0000-0000-0000-000000000101', 'd1000000-0000-0000-0000-000000000010', 'Passwords, MFA, and Phishing',     'article', 2),
  ('d1000000-0000-0000-0000-000000000102', 'd1000000-0000-0000-0000-000000000010', 'Knowledge Check',                  'quiz',    3)
ON CONFLICT DO NOTHING;

INSERT INTO article_content (id, lesson_id, content) VALUES
('d1000000-0000-0000-0000-000000001000', 'd1000000-0000-0000-0000-000000000100', $json$
{"type":"doc","content":[
  {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Why Information Security Matters"}]},
  {"type":"paragraph","content":[{"type":"text","text":"Every Northwind employee handles information that matters to a customer — a delivery address, a contact phone number, a shipment manifest. Treating that data carelessly puts our customers and our reputation at risk."}]},
  {"type":"callout","attrs":{"variant":"info"},"content":[{"type":"paragraph","content":[{"type":"text","text":"A single compromised account can leak the addresses of every customer that account can see. Information security is a daily habit, not a one-time event."}]}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Your responsibilities"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Keep your account credentials private. Never share them with a coworker or a vendor."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Lock your screen any time you step away — even for a minute."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Report anything that looks suspicious (a strange email, a stranger in a restricted area) to IT or your manager."}]}]}
  ]},
  {"type":"paragraph","content":[{"type":"text","text":"The next lesson covers the specific rules for passwords, multi-factor authentication, and recognising phishing."}]}
]}
$json$::jsonb),
('d1000000-0000-0000-0000-000000001001', 'd1000000-0000-0000-0000-000000000101', $json$
{"type":"doc","content":[
  {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Passwords, MFA, and Phishing"}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Password rules"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"At least 12 characters."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Unique per system — never reuse passwords across services."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Use the company password manager. Don't write passwords on sticky notes."}]}]}
  ]},
  {"type":"callout","attrs":{"variant":"warn"},"content":[{"type":"paragraph","content":[{"type":"text","text":"IT will NEVER ask for your password — not in an email, not over the phone, not in a chat. If someone asks, hang up and report it."}]}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Multi-factor authentication (MFA)"}]},
  {"type":"paragraph","content":[{"type":"text","text":"Enable MFA on every system that offers it. Even if someone steals your password, MFA is what stops them from logging in."}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Spotting phishing"}]},
  {"type":"paragraph","content":[{"type":"text","text":"Phishing emails try to trick you into clicking a malicious link or handing over credentials. Look for:"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Unexpected urgency (\"your account will be closed in 24 hours\")."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"A sender address that almost-but-not-quite matches a real one."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Generic greetings (\"Dear customer\") on what should be a personal message."}]}]}
  ]},
  {"type":"callout","attrs":{"variant":"success"},"content":[{"type":"paragraph","content":[{"type":"text","text":"When in doubt — don't click. Forward the email to it@northwind.example and we'll check it for you."}]}]}
]}
$json$::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO quizzes (id, lesson_id, pass_score) VALUES
  ('d1000000-0000-0000-0000-000000010000', 'd1000000-0000-0000-0000-000000000102', 70)
ON CONFLICT DO NOTHING;

INSERT INTO questions (id, quiz_id, text, position) VALUES
  ('d1000000-0000-0000-0000-000000010001', 'd1000000-0000-0000-0000-000000010000', 'What is the minimum password length at Northwind?', 1),
  ('d1000000-0000-0000-0000-000000010002', 'd1000000-0000-0000-0000-000000010000', 'IT calls and asks for your password to "fix an issue". What do you do?', 2),
  ('d1000000-0000-0000-0000-000000010003', 'd1000000-0000-0000-0000-000000010000', 'You receive an email that says your account will be closed in 24 hours unless you click a link. The sender is "support@northwind-secure.com". What is the best action?', 3)
ON CONFLICT DO NOTHING;

INSERT INTO question_options (id, question_id, text, is_correct) VALUES
  ('d1000000-0000-0000-0000-000000020001', 'd1000000-0000-0000-0000-000000010001', '6 characters',  false),
  ('d1000000-0000-0000-0000-000000020002', 'd1000000-0000-0000-0000-000000010001', '8 characters',  false),
  ('d1000000-0000-0000-0000-000000020003', 'd1000000-0000-0000-0000-000000010001', '12 characters', true),
  ('d1000000-0000-0000-0000-000000020004', 'd1000000-0000-0000-0000-000000010002', 'Share it — IT needs it to help you',            false),
  ('d1000000-0000-0000-0000-000000020005', 'd1000000-0000-0000-0000-000000010002', 'Hang up and report the call to IT',             true),
  ('d1000000-0000-0000-0000-000000020006', 'd1000000-0000-0000-0000-000000010002', 'Ask them to email you so you can verify later', false),
  ('d1000000-0000-0000-0000-000000020007', 'd1000000-0000-0000-0000-000000010003', 'Click the link to investigate',                 false),
  ('d1000000-0000-0000-0000-000000020008', 'd1000000-0000-0000-0000-000000010003', 'Forward it to IT and do not click',             true),
  ('d1000000-0000-0000-0000-000000020009', 'd1000000-0000-0000-0000-000000010003', 'Reply to confirm your account is still active', false)
ON CONFLICT DO NOTHING;

-- Required for All Staff
INSERT INTO course_required_groups (id, course_id, group_id) VALUES
  ('f0000000-0000-0000-0000-000000001001', 'd1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;


-- ============================================================
-- COURSE 2 — Workplace Health & Safety
-- Required for: Warehouse + Drivers. Due in 7 days. 365-day recert.
-- ============================================================
INSERT INTO courses (id, title, description, published, created_by, is_mandatory, due_in_days, recert_interval_days) VALUES
('d2000000-0000-0000-0000-000000000001',
 'Workplace Health & Safety',
 'PPE, safe lifting, equipment operation, and emergency procedures for warehouse and drivers.',
 true,
 (SELECT id FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1),
 true, 7, 365)
ON CONFLICT DO NOTHING;

INSERT INTO modules (id, course_id, title, position) VALUES
  ('d2000000-0000-0000-0000-000000000010', 'd2000000-0000-0000-0000-000000000001', 'Working Safely', 1)
ON CONFLICT DO NOTHING;

INSERT INTO lessons (id, module_id, title, type, position) VALUES
  ('d2000000-0000-0000-0000-000000000100', 'd2000000-0000-0000-0000-000000000010', 'PPE & Equipment Safety',  'article', 1),
  ('d2000000-0000-0000-0000-000000000101', 'd2000000-0000-0000-0000-000000000010', 'Emergency Procedures',     'article', 2),
  ('d2000000-0000-0000-0000-000000000102', 'd2000000-0000-0000-0000-000000000010', 'Safety Knowledge Check',   'quiz',    3)
ON CONFLICT DO NOTHING;

INSERT INTO article_content (id, lesson_id, content) VALUES
('d2000000-0000-0000-0000-000000001000', 'd2000000-0000-0000-0000-000000000100', $json$
{"type":"doc","content":[
  {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"PPE & Equipment Safety"}]},
  {"type":"paragraph","content":[{"type":"text","text":"Personal protective equipment (PPE) keeps you safe when working in or around the warehouse. Wear all required PPE before entering an operational area — no exceptions."}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Required PPE by area"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Floor & dock: high-vis vest, steel-toe boots."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Forklift operation: hard hat in addition to the above; seatbelt at all times."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Hazmat zone: gloves and eye protection."}]}]}
  ]},
  {"type":"callout","attrs":{"variant":"warn"},"content":[{"type":"paragraph","content":[{"type":"text","text":"If your PPE is damaged, ask your supervisor for a replacement before starting work. Working without functional PPE is a stop-work condition."}]}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Safe lifting"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Lift with your legs, not your back. Keep the load close to your body."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Anything over 22 kg (50 lb): use a hand truck, pallet jack, or ask for help."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Plan the path before you lift. Never twist while carrying."}]}]}
  ]}
]}
$json$::jsonb),
('d2000000-0000-0000-0000-000000001001', 'd2000000-0000-0000-0000-000000000101', $json$
{"type":"doc","content":[
  {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Emergency Procedures"}]},
  {"type":"callout","attrs":{"variant":"warn"},"content":[{"type":"paragraph","content":[{"type":"text","text":"In any life-threatening emergency, call your local emergency number first, then notify your supervisor."}]}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Fire"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Pull the nearest alarm."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Evacuate via the nearest marked exit — do not use lifts."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Gather at the primary muster point in the north parking lot. Wait for the all-clear."}]}]}
  ]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Injury or medical event"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Do not move a seriously injured person unless they are in immediate danger."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Call for a trained first aider. First aid kits are at every dock and the main office."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Report every incident in the incident log — even near-misses. Patterns help us fix root causes."}]}]}
  ]},
  {"type":"callout","attrs":{"variant":"info"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Your shift supervisor's mobile number is posted at every dock. Save it in your phone."}]}]}
]}
$json$::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO quizzes (id, lesson_id, pass_score) VALUES
  ('d2000000-0000-0000-0000-000000010000', 'd2000000-0000-0000-0000-000000000102', 70)
ON CONFLICT DO NOTHING;

INSERT INTO questions (id, quiz_id, text, position) VALUES
  ('d2000000-0000-0000-0000-000000010001', 'd2000000-0000-0000-0000-000000010000', 'You need to move a box that weighs 30 kg. What should you do?', 1),
  ('d2000000-0000-0000-0000-000000010002', 'd2000000-0000-0000-0000-000000010000', 'The fire alarm goes off. What is the correct first action?', 2),
  ('d2000000-0000-0000-0000-000000010003', 'd2000000-0000-0000-0000-000000010000', 'Your high-vis vest is torn. You can:', 3)
ON CONFLICT DO NOTHING;

INSERT INTO question_options (id, question_id, text, is_correct) VALUES
  ('d2000000-0000-0000-0000-000000020001', 'd2000000-0000-0000-0000-000000010001', 'Lift it by yourself, with your back', false),
  ('d2000000-0000-0000-0000-000000020002', 'd2000000-0000-0000-0000-000000010001', 'Use a pallet jack or ask for help',   true),
  ('d2000000-0000-0000-0000-000000020003', 'd2000000-0000-0000-0000-000000010001', 'Slide it across the floor',           false),
  ('d2000000-0000-0000-0000-000000020004', 'd2000000-0000-0000-0000-000000010002', 'Take the lift down',                   false),
  ('d2000000-0000-0000-0000-000000020005', 'd2000000-0000-0000-0000-000000010002', 'Evacuate via the nearest marked exit', true),
  ('d2000000-0000-0000-0000-000000020006', 'd2000000-0000-0000-0000-000000010002', 'Finish your task first',               false),
  ('d2000000-0000-0000-0000-000000020007', 'd2000000-0000-0000-0000-000000010003', 'Keep working — it still covers you',   false),
  ('d2000000-0000-0000-0000-000000020008', 'd2000000-0000-0000-0000-000000010003', 'Ask your supervisor for a replacement before starting work', true),
  ('d2000000-0000-0000-0000-000000020009', 'd2000000-0000-0000-0000-000000010003', 'Tape it up and continue',              false)
ON CONFLICT DO NOTHING;

-- Required for Warehouse AND Drivers
INSERT INTO course_required_groups (id, course_id, group_id) VALUES
  ('f0000000-0000-0000-0000-000000002002', 'd2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002'),
  ('f0000000-0000-0000-0000-000000002003', 'd2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;


-- ============================================================
-- COURSE 3 — Preventing Harassment & Discrimination
-- Required for: All Staff. Due in 14 days. 730-day (2 year) recert.
-- ============================================================
INSERT INTO courses (id, title, description, published, created_by, is_mandatory, due_in_days, recert_interval_days) VALUES
('d3000000-0000-0000-0000-000000000001',
 'Preventing Harassment & Discrimination',
 'Northwind''s standards of respect at work, what counts as harassment, and how to report concerns safely.',
 true,
 (SELECT id FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1),
 true, 14, 730)
ON CONFLICT DO NOTHING;

INSERT INTO modules (id, course_id, title, position) VALUES
  ('d3000000-0000-0000-0000-000000000010', 'd3000000-0000-0000-0000-000000000001', 'Respect at Work', 1)
ON CONFLICT DO NOTHING;

INSERT INTO lessons (id, module_id, title, type, position) VALUES
  ('d3000000-0000-0000-0000-000000000100', 'd3000000-0000-0000-0000-000000000010', 'Our Standards',         'article', 1),
  ('d3000000-0000-0000-0000-000000000101', 'd3000000-0000-0000-0000-000000000010', 'How to Report Safely',  'article', 2),
  ('d3000000-0000-0000-0000-000000000102', 'd3000000-0000-0000-0000-000000000010', 'Knowledge Check',       'quiz',    3)
ON CONFLICT DO NOTHING;

INSERT INTO article_content (id, lesson_id, content) VALUES
('d3000000-0000-0000-0000-000000001000', 'd3000000-0000-0000-0000-000000000100', $json$
{"type":"doc","content":[
  {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Our Standards"}]},
  {"type":"paragraph","content":[{"type":"text","text":"Every Northwind employee has the right to a workplace free of harassment and discrimination. That includes the dock, the cab of a truck, the break room, work chat, and any company event."}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"What harassment looks like"}]},
  {"type":"paragraph","content":[{"type":"text","text":"Harassment is unwelcome conduct based on a protected characteristic — race, gender, age, religion, disability, sexual orientation, and others. It can be verbal, physical, written, or visual."}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Slurs, jokes, or stereotypes about a group."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Unwanted touching, sexual comments, or repeatedly asking someone out after they have said no."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Excluding a coworker from meetings or social events because of who they are."}]}]}
  ]},
  {"type":"callout","attrs":{"variant":"info"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Intent is not a defense. What matters is the impact on the person on the receiving end."}]}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"What we expect"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Treat every coworker the way they want to be treated — ask if you are not sure."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"If someone tells you to stop, stop. Apologise and move on."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"If you witness something that doesn''t look right, say something — at minimum, to HR."}]}]}
  ]}
]}
$json$::jsonb),
('d3000000-0000-0000-0000-000000001001', 'd3000000-0000-0000-0000-000000000101', $json$
{"type":"doc","content":[
  {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"How to Report Safely"}]},
  {"type":"paragraph","content":[{"type":"text","text":"You have multiple options for reporting harassment or discrimination at Northwind. Pick whichever feels right — there is no wrong door."}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Your options"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Talk to your direct manager."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Talk to HR — hr@northwind.example, or stop by the main office."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Use the anonymous reporting hotline: 1-800-XXX-XXXX. Available 24/7, no caller ID."}]}]}
  ]},
  {"type":"callout","attrs":{"variant":"success"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Northwind has a zero-retaliation policy. Reporting in good faith — even if the report is not substantiated — is always protected."}]}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"What happens next"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"HR will acknowledge your report within 2 business days."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"They will explain the investigation process and ask what outcome would feel resolved to you."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Investigation results are shared with the parties involved. Discipline, if any, is confidential."}]}]}
  ]}
]}
$json$::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO quizzes (id, lesson_id, pass_score) VALUES
  ('d3000000-0000-0000-0000-000000010000', 'd3000000-0000-0000-0000-000000000102', 70)
ON CONFLICT DO NOTHING;

INSERT INTO questions (id, quiz_id, text, position) VALUES
  ('d3000000-0000-0000-0000-000000010001', 'd3000000-0000-0000-0000-000000010000', 'A coworker repeatedly tells jokes about a colleague''s accent. The colleague has asked them to stop. Is this harassment?', 1),
  ('d3000000-0000-0000-0000-000000010002', 'd3000000-0000-0000-0000-000000010000', 'You witness harassment but the affected person tells you not to report it. What should you do?', 2),
  ('d3000000-0000-0000-0000-000000010003', 'd3000000-0000-0000-0000-000000010000', 'What protections does Northwind offer for someone who reports a concern in good faith?', 3)
ON CONFLICT DO NOTHING;

INSERT INTO question_options (id, question_id, text, is_correct) VALUES
  ('d3000000-0000-0000-0000-000000020001', 'd3000000-0000-0000-0000-000000010001', 'No — they''re just jokes',          false),
  ('d3000000-0000-0000-0000-000000020002', 'd3000000-0000-0000-0000-000000010001', 'Yes — repeated, unwelcome conduct based on a protected characteristic', true),
  ('d3000000-0000-0000-0000-000000020003', 'd3000000-0000-0000-0000-000000010001', 'Only if the joker meant to harm',   false),
  ('d3000000-0000-0000-0000-000000020004', 'd3000000-0000-0000-0000-000000010002', 'Ignore it — it is not your concern', false),
  ('d3000000-0000-0000-0000-000000020005', 'd3000000-0000-0000-0000-000000010002', 'Listen, support them, and at minimum let HR know that something is going on so they can offer support', true),
  ('d3000000-0000-0000-0000-000000020006', 'd3000000-0000-0000-0000-000000010002', 'Confront the harasser yourself',     false),
  ('d3000000-0000-0000-0000-000000020007', 'd3000000-0000-0000-0000-000000010003', 'None — reporters are on their own',  false),
  ('d3000000-0000-0000-0000-000000020008', 'd3000000-0000-0000-0000-000000010003', 'A zero-retaliation policy that protects the reporter even if the report is not substantiated', true),
  ('d3000000-0000-0000-0000-000000020009', 'd3000000-0000-0000-0000-000000010003', 'Only if the report leads to discipline', false)
ON CONFLICT DO NOTHING;

-- Required for All Staff
INSERT INTO course_required_groups (id, course_id, group_id) VALUES
  ('f0000000-0000-0000-0000-000000003001', 'd3000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;


-- ============================================================
-- COURSE 4 — Defensive Driving & Vehicle Safety
-- Required for: Drivers only. Due in 7 days. 365-day recert.
-- ============================================================
INSERT INTO courses (id, title, description, published, created_by, is_mandatory, due_in_days, recert_interval_days) VALUES
('d4000000-0000-0000-0000-000000000001',
 'Defensive Driving & Vehicle Safety',
 'Pre-trip inspections, defensive driving habits, and what to do at the scene of an incident.',
 true,
 (SELECT id FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1),
 true, 7, 365)
ON CONFLICT DO NOTHING;

INSERT INTO modules (id, course_id, title, position) VALUES
  ('d4000000-0000-0000-0000-000000000010', 'd4000000-0000-0000-0000-000000000001', 'On the Road', 1)
ON CONFLICT DO NOTHING;

INSERT INTO lessons (id, module_id, title, type, position) VALUES
  ('d4000000-0000-0000-0000-000000000100', 'd4000000-0000-0000-0000-000000000010', 'Pre-trip Inspections',  'article', 1),
  ('d4000000-0000-0000-0000-000000000101', 'd4000000-0000-0000-0000-000000000010', 'Defensive Driving',     'article', 2),
  ('d4000000-0000-0000-0000-000000000102', 'd4000000-0000-0000-0000-000000000010', 'Driver Knowledge Check','quiz',    3)
ON CONFLICT DO NOTHING;

INSERT INTO article_content (id, lesson_id, content) VALUES
('d4000000-0000-0000-0000-000000001000', 'd4000000-0000-0000-0000-000000000100', $json$
{"type":"doc","content":[
  {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Pre-trip Inspections"}]},
  {"type":"paragraph","content":[{"type":"text","text":"A 5-minute pre-trip inspection prevents most on-route breakdowns. Do it every shift, before you leave the yard."}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"The walk-around"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Tires: check pressure and look for cuts, bulges, or uneven wear."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Lights: headlights, brake lights, turn signals, hazards — all working."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Fluids: oil, coolant, washer fluid — topped up."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Load: properly secured, no visible damage to straps or packaging."}]}]}
  ]},
  {"type":"callout","attrs":{"variant":"warn"},"content":[{"type":"paragraph","content":[{"type":"text","text":"If anything fails inspection, do not roll. Park, tag the vehicle, and notify dispatch. We would rather lose an hour than risk a crash."}]}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Cab check"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Seatbelt working and worn."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Mirrors adjusted to your seated position."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Phone mounted, not held. Voice commands only while moving."}]}]}
  ]}
]}
$json$::jsonb),
('d4000000-0000-0000-0000-000000001001', 'd4000000-0000-0000-0000-000000000101', $json$
{"type":"doc","content":[
  {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Defensive Driving"}]},
  {"type":"paragraph","content":[{"type":"text","text":"Defensive driving means assuming other drivers will make mistakes, and giving yourself the time and space to react safely."}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"The big four"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Following distance: at least 4 seconds in dry weather, 6 in rain. Pick a fixed object and count."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Speed: posted limit is the maximum, not the target. Reduce in residential and weather conditions."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Eyes up: scan 12–15 seconds ahead, not just the car in front."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"No distractions: no phone in hand, no eating, no fiddling with the GPS while moving."}]}]}
  ]},
  {"type":"callout","attrs":{"variant":"info"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Fatigue is a leading cause of fleet incidents. If you''re tired, pull over. Dispatch would always rather have a late delivery than an incident."}]}]},
  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"If you''re in an incident"}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Stop. Check for injuries — yours and others."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Call emergency services if anyone is hurt."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Notify dispatch. Take photos of the scene before vehicles are moved (if safe)."}]}]},
    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Do not admit fault. Exchange insurance information factually."}]}]}
  ]}
]}
$json$::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO quizzes (id, lesson_id, pass_score) VALUES
  ('d4000000-0000-0000-0000-000000010000', 'd4000000-0000-0000-0000-000000000102', 70)
ON CONFLICT DO NOTHING;

INSERT INTO questions (id, quiz_id, text, position) VALUES
  ('d4000000-0000-0000-0000-000000010001', 'd4000000-0000-0000-0000-000000010000', 'During a pre-trip inspection you find a worn tire. What do you do?', 1),
  ('d4000000-0000-0000-0000-000000010002', 'd4000000-0000-0000-0000-000000010000', 'In dry weather, the minimum following distance is:', 2),
  ('d4000000-0000-0000-0000-000000010003', 'd4000000-0000-0000-0000-000000010000', 'You feel drowsy 30 minutes from your last drop. What is the right call?', 3)
ON CONFLICT DO NOTHING;

INSERT INTO question_options (id, question_id, text, is_correct) VALUES
  ('d4000000-0000-0000-0000-000000020001', 'd4000000-0000-0000-0000-000000010001', 'Drive carefully — it will be fine',          false),
  ('d4000000-0000-0000-0000-000000020002', 'd4000000-0000-0000-0000-000000010001', 'Park, tag the vehicle, and notify dispatch', true),
  ('d4000000-0000-0000-0000-000000020003', 'd4000000-0000-0000-0000-000000010001', 'Swap the tire yourself with a spare',         false),
  ('d4000000-0000-0000-0000-000000020004', 'd4000000-0000-0000-0000-000000010002', '1 second',  false),
  ('d4000000-0000-0000-0000-000000020005', 'd4000000-0000-0000-0000-000000010002', '4 seconds', true),
  ('d4000000-0000-0000-0000-000000020006', 'd4000000-0000-0000-0000-000000010002', '10 seconds — much safer', false),
  ('d4000000-0000-0000-0000-000000020007', 'd4000000-0000-0000-0000-000000010003', 'Push through — only 30 minutes left',  false),
  ('d4000000-0000-0000-0000-000000020008', 'd4000000-0000-0000-0000-000000010003', 'Pull over safely and let dispatch know', true),
  ('d4000000-0000-0000-0000-000000020009', 'd4000000-0000-0000-0000-000000010003', 'Open the window and turn up the radio', false)
ON CONFLICT DO NOTHING;

-- Required for Drivers only
INSERT INTO course_required_groups (id, course_id, group_id) VALUES
  ('f0000000-0000-0000-0000-000000004003', 'd4000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;


-- ============================================================
-- LEARNING PATH — "New Hire Onboarding"
-- Day 1 essentials for every new Northwind employee.
-- Ordered: Security → Harassment Prevention → Health & Safety
-- ============================================================
INSERT INTO learning_paths (id, title, description) VALUES
  ('0a000000-0000-0000-0000-000000000001',
   'New Hire Onboarding',
   'Day-1 essentials for every Northwind employee — complete in your first two weeks.')
ON CONFLICT DO NOTHING;

INSERT INTO learning_path_courses (id, path_id, course_id, position) VALUES
  ('0a000000-0000-0000-0000-000000000101', '0a000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 1),
  ('0a000000-0000-0000-0000-000000000102', '0a000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 2),
  ('0a000000-0000-0000-0000-000000000103', '0a000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 3)
ON CONFLICT DO NOTHING;


-- ============================================================
-- AFTER RUNNING — 4 steps to bring the compliance dashboard alive
-- ============================================================
-- 1. Register 2–3 fake students at https://lms-app-six-mu.vercel.app/register
--    e.g. alice@northwind.demo, bob@northwind.demo, carol@northwind.demo
--    (Supabase emails confirmation links — set Site URL to your Vercel URL
--    first, in Supabase → Authentication → URL Configuration.)
--
-- 2. Log in as admin → Groups → add students to groups:
--      alice → All Staff + Sales
--      bob   → All Staff + Warehouse
--      carol → All Staff + Drivers
--
-- 3. Admin → Courses → for EACH course, click the shield icon → "Assign now".
--    This creates enrollments + notifications for every member of the
--    required groups. They will immediately see the banner when they log in.
--
-- 4. Log in as one of the fake students. Take a course (or fail a quiz on
--    purpose, then retake). Log back in as admin → Compliance to see real
--    progress: a mix of Complete / In progress / Overdue across employees.
-- ============================================================
