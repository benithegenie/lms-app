// Supabase Edge Function (Deno runtime).
// Emails employees who still have an unfinished required course.
// Schedule it to run once a day (see supabase/functions/README.md).
//
// Required secrets (set with `supabase secrets set ...`):
//   RESEND_API_KEY         - from https://resend.com
//   COMPLIANCE_FROM_EMAIL  - verified sender, e.g. "alerts@yourcompany.com"
//                            (use "onboarding@resend.dev" for testing)
//   APP_URL                - your app's URL, e.g. "https://lms.yourco.com"
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type PendingRow = {
  profile_id: string
  email: string
  full_name: string | null
  course_id: string
  course_title: string
  due_at: string | null
}

const DAY = 86_400_000

Deno.serve(async (req) => {
  // The public anon key can invoke any Edge Function, so gate this one behind a
  // shared secret. Set CRON_SECRET and send it as the `x-cron-secret` header.
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('COMPLIANCE_FROM_EMAIL') ?? 'onboarding@resend.dev'
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

  if (!resendKey) {
    return json({ error: 'RESEND_API_KEY is not set' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data, error } = await supabase.from('v_pending_compliance').select('*')
  if (error) return json({ error: error.message }, 500)

  const now = Date.now()
  // Remind people who are overdue, due within 7 days, or have no deadline set.
  const toRemind = (data as PendingRow[]).filter((r) => {
    if (!r.due_at) return true
    return new Date(r.due_at).getTime() <= now + 7 * DAY
  })

  let sent = 0
  const errors: string[] = []

  for (const r of toRemind) {
    const overdue = r.due_at != null && new Date(r.due_at).getTime() < now
    const subject = overdue
      ? `Overdue: please complete "${r.course_title}"`
      : `Reminder: required course "${r.course_title}"`

    const due = r.due_at ? new Date(r.due_at).toLocaleDateString() : null
    const deadlineLine = overdue
      ? `<p style="color:#b91c1c"><strong>This was due on ${due} and is now overdue.</strong></p>`
      : due
        ? `<p>Please complete it by <strong>${due}</strong>.</p>`
        : ''

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:480px">
        <h2>Action required</h2>
        <p>Hi ${escapeHtml(r.full_name ?? 'there')},</p>
        <p>You have a required course to finish: <strong>${escapeHtml(r.course_title)}</strong>.</p>
        ${deadlineLine}
        <p style="margin:24px 0">
          <a href="${appUrl}/dashboard"
             style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">
            Complete it now
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">You're receiving this because the course is mandatory for your team.</p>
      </div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Compliance <${fromEmail}>`,
        to: r.email,
        subject,
        html,
      }),
    })

    if (res.ok) sent++
    else errors.push(`${r.email}: ${res.status} ${await res.text()}`)
  }

  return json({ candidates: toRemind.length, sent, errors })
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  )
}
