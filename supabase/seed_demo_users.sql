-- ============================================================
-- LMS — Demo users seed
-- Creates 3 fake students (Alice, Bob, Carol) with pre-confirmed
-- emails so they can log in immediately — bypasses Supabase's
-- email-confirmation rate limit.
--
-- Password for all three: demo1234
--
-- ⚠️  CAVEAT: this writes directly to Supabase's `auth` schema, which
-- is managed by Supabase and can change between versions. If this
-- script ever errors on a future project, the safe fallback is to
-- delete any partially-created users from Authentication → Users,
-- then create them via the dashboard's "Add user" button instead.
--
-- Idempotent on user IDs (re-running won't duplicate).
-- ============================================================

DO $$
DECLARE
  alice_id uuid := 'aa000000-0000-0000-0000-000000000001';
  bob_id   uuid := 'bb000000-0000-0000-0000-000000000002';
  carol_id uuid := 'cc000000-0000-0000-0000-000000000003';
  hashed_pw text := crypt('demo1234', gen_salt('bf'));
BEGIN
  -- 1) auth.users — the actual login records.
  --    email_confirmed_at = NOW() means "already confirmed" — no email sent.
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES
    (alice_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'alice@northwind.demo', hashed_pw, NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Alice Anderson"}'::jsonb,
     NOW(), NOW()),
    (bob_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'bob@northwind.demo',   hashed_pw, NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Bob Brown"}'::jsonb,
     NOW(), NOW()),
    (carol_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'carol@northwind.demo', hashed_pw, NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Carol Chen"}'::jsonb,
     NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- 2) auth.identities — required for password login to work.
  --    (Supabase looks up identities by (provider, provider_id) on sign-in.)
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    created_at, updated_at, last_sign_in_at
  ) VALUES
    (gen_random_uuid(), alice_id, alice_id::text,
     jsonb_build_object('sub', alice_id::text, 'email', 'alice@northwind.demo', 'email_verified', true),
     'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), bob_id, bob_id::text,
     jsonb_build_object('sub', bob_id::text, 'email', 'bob@northwind.demo', 'email_verified', true),
     'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), carol_id, carol_id::text,
     jsonb_build_object('sub', carol_id::text, 'email', 'carol@northwind.demo', 'email_verified', true),
     'email', NOW(), NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- 3) The handle_new_user() trigger on auth.users INSERT should have
  --    already created matching rows in public.profiles. Just in case the
  --    trigger didn't fire (or full_name didn't propagate), upsert the
  --    profile rows explicitly:
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES
    (alice_id, 'alice@northwind.demo', 'Alice Anderson', 'student'),
    (bob_id,   'bob@northwind.demo',   'Bob Brown',      'student'),
    (carol_id, 'carol@northwind.demo', 'Carol Chen',     'student')
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email     = EXCLUDED.email;
END $$;

-- ============================================================
-- Verify it worked
-- ============================================================
SELECT email, full_name, role, created_at
FROM public.profiles
WHERE email IN ('alice@northwind.demo', 'bob@northwind.demo', 'carol@northwind.demo')
ORDER BY email;
-- You should see 3 rows. If you see 0, something went wrong — check the
-- error from the DO block above.
