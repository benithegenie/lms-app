# LMS App — Project Reference

## What this is
A Learning Management System **and lightweight compliance engine** with separate admin and
student interfaces. Beyond courses, admins can mark courses **required**, assign them to
**groups**, and the system forces employees to read + **pass a quiz** to clear an
un-dismissable banner — with an admin **compliance dashboard** and optional **email reminders**.
Built from scratch with React + Supabase.

## Tech stack
| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS v3 + custom shadcn/ui components |
| Routing | React Router v7 (used as v6-style) |
| Server state | TanStack Query (React Query v5) |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Rich text editor | Tiptap v2 — StarterKit, Underline, Link, **Table, Image, custom Callout, slash commands** |
| Email | Resend (via a Supabase Edge Function) |

## Running the project
```bash
cd ~/Projects/lms-app
npm run dev        # dev server at http://localhost:5173 (use `localhost`, not 127.0.0.1)
npm run build      # type-check + production build (must stay GREEN)
npm run test       # vitest unit tests (pure logic: recert math, due-date labels, tiptap text)
```
> Note: `npm`/`node` are under nvm and may not be on PATH. If `npm` isn't found, prefix:
> `export PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"`

## Demo data & deploying
- `supabase/seed_demo.sql` — run in the Supabase SQL Editor (after migrations) to create a demo
  mandatory course (articles + quiz + 365-day recert) and a "Sales Team" group for testing/demos.
- `DEPLOY.md` — step-by-step Vercel deployment; `vercel.json` handles SPA routing.

## Environment variables
File: `.env.local` (never commit this)
```
VITE_SUPABASE_URL=https://mkuhwbxqqedfjmhyzvsk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
Vite requires a full restart to pick up `.env.local` changes.

## Project structure
```
src/
  components/
    ErrorBoundary.tsx        # catches render errors
    MandatoryBanner.tsx      # student banner: unfinished required courses (clears on completion)
    editor/                  # shared Tiptap setup
      extensions.ts          # editorExtensions() — SINGLE source of editor extensions
      Callout.ts             # custom info/warn/success callout node
      SlashCommand.tsx       # "/" command extension (uses @tiptap/suggestion + tippy.js)
      SlashCommandList.tsx   # the slash menu popup (keyboard nav)
    layout/
      AdminLayout.tsx        # sidebar + outlet for /admin (Dashboard, Courses, Students, Groups, Compliance)
      StudentLayout.tsx      # sidebar + outlet for /dashboard; mounts <MandatoryBanner/>
    ui/                      # shadcn-style components
  hooks/
    useAuth.tsx              # AuthProvider + useAuth (user, profile, isAdmin, signIn/Out/Up)
  lib/
    supabase.ts             # typed Supabase client
    utils.ts                # cn(), formatDate(), formatBytes()
    api/
      courses.ts            # courses/modules/lessons CRUD, article content, fetchEnrolledCourses
      quizzes.ts            # quiz CRUD, submitQuizAttempt, fetchStudentQuizAttempt (latest attempt)
      students.ts           # students, enroll/unenroll, completions, attempts
      attachments.ts        # file upload/delete (Supabase Storage)
      groups.ts             # groups + membership CRUD
      compliance.ts         # mandatory config, assign, pending-for-student, dashboard rollup, nudge
  pages/
    auth/                   # LoginPage, RegisterPage
    admin/
      AdminDashboard.tsx
      CoursesPage.tsx       # course list; publish toggle; Required badge; <MandatoryDialog/>
      CourseEditorPage.tsx  # module/lesson tree + LessonEditor
      LessonEditor.tsx      # rich editor (slash + toolbar: headings, lists, table, image upload) + QuizBuilder
      QuizBuilder.tsx
      StudentsPage.tsx
      GroupsPage.tsx        # create groups, add/remove members
      MandatoryDialog.tsx   # per-course: mark required, due days, required groups, "Assign now"
      CompliancePage.tsx    # per-course compliance table, non-compliant filter, nudge, CSV export
    student/
      MyCoursesPage.tsx
      CourseViewPage.tsx
      LessonViewPage.tsx    # article HTML (nodeToHtml) or QuizPlayer; quiz completes only on PASS
      QuizPlayer.tsx        # quiz UI; failed attempt → Retake (answers hidden); passed → locked review
      GradesPage.tsx
  types/
    database.ts             # table-row TYPES (must be `type`, not `interface`) + Database generic
  router.tsx                # routes + RequireAuth/RequireAdmin; /editor-test is a no-login editor demo
  main.tsx
supabase/
  migrations/               # 001 base, 002 groups+compliance, 003 compliance view
  functions/
    send-compliance-emails/ # Deno Edge Function: daily email reminders (see its README.md)
```

## Database schema (Supabase / PostgreSQL)
Migrations in `supabase/migrations/` — run in order in the Supabase SQL Editor.

```
-- 001_initial_schema.sql
profiles, courses, modules, lessons, article_content, attachments,
quizzes, questions, question_options, enrollments,
lesson_completions, quiz_attempts (MULTIPLE allowed → retakes), quiz_answers

-- 002_groups_and_compliance.sql
groups                 — e.g. "Sales Team"
group_members          — group_id + profile_id (unique)
courses.is_mandatory   — bool; courses.due_in_days — int (added columns)
course_required_groups — which groups must take a mandatory course
notifications          — profile_id, course_id, type, due_at, dismissed_at

-- 003_compliance_view.sql
v_pending_compliance   — view: non-compliant (employee, required course) rows for emails

-- 004_security_hardening.sql
prevent_role_change    — trigger blocking non-admins from changing their own role

-- 005_article_versions.sql
article_content_versions — one snapshot per article edit (author + timestamp); powers the diff view

-- 006_recertification.sql
courses.recert_interval_days — TTL; lapsed completions re-prompt; recert-aware v_pending_compliance

-- 007_search.sql
article_content.search_text — trigger-maintained plain text of Tiptap content + trigram index

-- 008_audit_and_acknowledgements.sql
acknowledgements — "read & understood" attestations
audit_log         — append-only compliance event log, written ONLY by DB triggers (tamper-resistant)

-- 009_manager_role.sql
group_managers + 'manager' enum + manages_profile() → team-scoped manager access via RLS

-- 010_learning_paths.sql
learning_paths + learning_path_courses (ordered) → onboarding tracks
```

## Key design decisions

### TypeScript table types MUST be `type`, not `interface`
`supabase-js` v2.107 requires each table's `Row` to satisfy `Record<string, unknown>`.
TS `interface`s do NOT satisfy that (no implicit index signature); `type` aliases do.
If a table Row is declared as `interface`, every query collapses to `never`. All
table-row types in `database.ts` are `type` aliases for this reason.

### Block editor (Notion-lite)
- `editorExtensions()` in `src/components/editor/extensions.ts` is the **single source of truth**
  for editor extensions — both `LessonEditor` and the `/editor-test` demo use it (so they can't drift).
- Slash menu: type `/` at the start of an empty line. Blocks: headings, lists, quote, code,
  divider, table, info/warn/success callouts.
- Images upload via the existing `attachments` pipeline (toolbar image button).
- Student render: `nodeToHtml` in `LessonViewPage` handles all node types incl. table/image/callout.

### Quiz flow (pass-gating + retakes)
- Submit → score computed client-side → `quiz_attempts` + `quiz_answers` inserted.
- A quiz lesson is marked complete **only when passed** (`score ≥ pass_score`).
- A **failed** attempt can be **retaken** (answers are hidden until passed). `quiz_attempts`
  has no uniqueness constraint, so retakes just insert another row; `fetchStudentQuizAttempt`
  returns the **latest** attempt.

### Compliance engine
- Admin marks a course required (`MandatoryDialog`) and picks required groups, then "Assign now":
  every group member is **enrolled** + gets a `notifications` row (with `due_at`).
- `<MandatoryBanner>` (in `StudentLayout`) live-derives unfinished required courses from
  enrollment + completion — so it **clears automatically** when the course is passed. Not dismissible.
- `CompliancePage` shows per-course status (Complete / In progress / Overdue), filters to
  non-compliant, allows one-click **Nudge**, and CSV export.
- **Email reminders**: `send-compliance-emails` Edge Function reads `v_pending_compliance` and
  sends via Resend. Optional; see `supabase/functions/README.md` to deploy + schedule.
- **Recertification (TTL)**: a course can set `recert_interval_days`. A completion stays valid that
  long; once lapsed the student is non-compliant again and the banner shows "Recertify". They re-pass
  the quiz (allowed even after a prior pass once within 30 days of expiry) which refreshes
  `lesson_completions.completed_at` (see `markLessonComplete`) and renews the cert. `fetchPendingMandatory`
  / `fetchCourseCompliance` factor expiry; the dashboard shows "certified until".
- **Audit & proof**: completions, quiz attempts, acknowledgements, and enrollments are written to an
  append-only `audit_log` by SECURITY DEFINER triggers (can't be bypassed from the client). Students
  click "I have read and understood" (`acknowledgements`); admins read the **Audit log** page.
  100%-complete courses expose a print-to-PDF certificate at `/dashboard/certificate/:courseId`.

### Roles
- Three roles (`profiles.role`): `student`, `manager`, `admin`. New signups are `student`; admins
  set manually in Supabase. `useAuth` exposes `isAdmin` / `isManager`.
- A **manager** manages specific groups (`group_managers`) and — enforced by RLS (`manages_profile()`,
  migration 009) — sees/nudges only their team. They get a scoped `/manager` area that reuses
  `CompliancePage` (RLS filters the data). Admins assign managers in the Groups page (auto-promotes
  a student's role to `manager`).

### Learning paths (onboarding)
`learning_paths` + `learning_path_courses` (ordered) let admins sequence courses into a track
(`LearningPathsPage`). Assigning a path to groups enrolls members in every course. Students see
their paths as an ordered checklist (`PathsPage` at `/dashboard/paths`). Admins can bulk-add
employees to a group by pasting emails (`bulkAddMembersByEmail`).

### Progress calculation
Client-side: fetch course lesson IDs (modules → lessons) vs the student's `lesson_completions`.

### Version history
Every article save snapshots into `article_content_versions` (skipped if unchanged) inside
`upsertArticleContent`. Admins get a timeline + word-diff (History button in `LessonEditor` →
`VersionHistory`); students see "last updated by X" + a "what changed" diff on `LessonViewPage`.
Diffs use `diff` (jsdiff) over plain text from `tiptapToPlainText` (`src/lib/tiptap.ts`),
rendered by `ArticleDiff`.

### Wiki search
`article_content.search_text` holds the plain text of the Tiptap content, kept current by a DB
trigger (migration 007) that extracts all text nodes — so existing content is searchable too.
`searchLessons` (`src/lib/api/search.ts`) does an ILIKE over it; RLS limits results to the student's
accessible lessons. Student `SearchPage` lives at `/dashboard/search`.

### File storage
Supabase bucket `attachments` (public). Path `{lessonId}/{timestamp}.{ext}`; public URL in `attachments.file_url`.

## Known bugs fixed
- Supabase `never` cascade: table-row types were `interface` → must be `type` (see above). Also
  needed `src/vite-env.d.ts` (`/// <reference types="vite/client" />`) for `import.meta.env`.
- Nested-select casts (`fetchCourseWithModules`, `fetchQuizWithQuestions`) use `as unknown as` because
  `Relationships: []` makes postgrest type embeds as `SelectQueryError`.
- `@radix-ui/react-badge` doesn't exist — Badge is a pure CSS (cva) component.
- `handle_new_user()` trigger needs `SET search_path = public` + `public.profiles`.
- `fetchQuizWithQuestions` must alias `question_options` as `options`.

## RLS policies summary
- `profiles`: users read/update own; admins all. A trigger (migration 004) blocks non-admins from changing their own `role` (prevents self-promotion to admin).
- `courses`: admins full; students read published + enrolled.
- `modules / lessons / article_content / attachments`: follow course enrollment.
- `enrollments`: admins full; students read own.
- `lesson_completions / quiz_attempts / quiz_answers`: students own; admins read all.
- `groups / group_members / course_required_groups`: admins full.
- `notifications`: admins full; students read + dismiss own.
- `acknowledgements`: students own; admins read. `audit_log`: admins read only; written solely by SECURITY DEFINER triggers (append-only).
- `group_managers`: admins full; managers read own. Managers get scoped reads on courses/modules/lessons and on their team's profiles/enrollments/completions, plus write on their team's notifications — all via `manages_profile()`.
- `v_pending_compliance` view: revoked from anon/authenticated (Edge Function uses service role).

## What's not built yet
- Microsoft Teams / Entra SSO (deferred — email + in-app banner used instead)
- Video lessons; certificate generation
- Course thumbnail image upload
- LLM "delta" quizzes
```
