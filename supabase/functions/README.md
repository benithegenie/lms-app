# Email reminders — setup guide

The `send-compliance-emails` Edge Function emails employees who still have an
unfinished required course. Everything else in the app works without this — it's
the optional "push" layer. Follow these steps once.

## 1. Run the database view migration

In Supabase Dashboard → SQL Editor, run `supabase/migrations/003_compliance_view.sql`.
Verify it works:

```sql
select * from v_pending_compliance;
```

You should see one row per (employee, unfinished required course).

## 2. Create a Resend account (free)

1. Sign up at https://resend.com (free tier: 3,000 emails/month).
2. Copy your **API key** (starts with `re_`).
3. For real sending, add & verify your domain under **Domains**.
   For *testing*, you can skip that and send from `onboarding@resend.dev` —
   but Resend will only deliver test emails to the address you signed up with.

## 3. Install the Supabase CLI & link your project

```bash
npm install -g supabase
supabase login
supabase link --project-ref mkuhwbxqqedfjmhyzvsk
```

## 4. Set the function's secrets

```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
supabase secrets set COMPLIANCE_FROM_EMAIL="onboarding@resend.dev"   # or alerts@yourdomain.com
supabase secrets set APP_URL="http://localhost:5173"                  # or your deployed URL
supabase secrets set CRON_SECRET="$(openssl rand -hex 16)"           # gate the function from random callers
```

> Save the `CRON_SECRET` value — you'll pass it as the `x-cron-secret` header in
> the schedule (step 7). Without it, anyone holding your public anon key could
> trigger email sends.

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.)

## 5. Deploy

```bash
supabase functions deploy send-compliance-emails
```

## 6. Test it manually

```bash
supabase functions invoke send-compliance-emails
```

You'll get back JSON like `{ "candidates": 2, "sent": 2, "errors": [] }`.
Check the inbox of an employee who has an unfinished required course.

## 7. Schedule it to run daily

In Supabase Dashboard → SQL Editor, enable the scheduler and add a daily job
(replace `<PROJECT_REF>` and `<ANON_OR_SERVICE_KEY>`):

```sql
-- one-time: enable the extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- run every day at 14:00 UTC
select cron.schedule(
  'compliance-emails-daily',
  '0 14 * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-compliance-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_OR_SERVICE_KEY>',
      'x-cron-secret', '<YOUR_CRON_SECRET>'
    )
  );
  $$
);
```

To change the time, edit the cron expression (`min hour day month weekday`, UTC).
To remove it later: `select cron.unschedule('compliance-emails-daily');`

## Tuning later
- **Who gets emailed**: edit the filter in `index.ts` (currently: overdue, due
  within 7 days, or no deadline). The spec's "30 + 7 days prior" can be added here.
- **Don't email daily forever**: add a `last_reminded_at` column to `notifications`
  and skip anyone reminded in the last N days.
