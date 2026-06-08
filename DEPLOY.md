# Deploying to Vercel

Puts the app on a real URL (free). ~15 minutes. The Supabase backend you already
have stays as-is; Vercel just hosts the frontend.

## Before you start
- All migrations run in Supabase (`001`–`007`).
- Your account is an admin (`profiles.role = 'admin'`).
- Code pushed to a GitHub repo.

## 1. Push to GitHub
```bash
cd ~/Projects/lms-app
git init                # if not already a repo
git add -A
git commit -m "Deploy"
# create a repo on github.com, then:
git remote add origin https://github.com/<you>/lms-app.git
git push -u origin main
```
> `.env.local` is gitignored — your keys are NOT pushed (correct). You'll add them in Vercel instead.

## 2. Import into Vercel
1. Go to https://vercel.com → **Add New → Project** → import your GitHub repo.
2. Vercel auto-detects **Vite**. Leave the defaults:
   - Build command: `npm run build`
   - Output directory: `dist`
3. `vercel.json` (already in the repo) handles SPA routing, so deep links like
   `/dashboard/search` won't 404 on refresh.

## 3. Add environment variables
In the Vercel project → **Settings → Environment Variables**, add the two from your
`.env.local` (Production + Preview):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://mkuhwbxqqedfjmhyzvsk.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (your anon key) |

Then **Deploy**. You'll get a URL like `https://lms-app-xxxx.vercel.app`.

## 4. Point Supabase auth at the new URL
Supabase Dashboard → **Authentication → URL Configuration**:
- **Site URL**: your Vercel URL
- **Redirect URLs**: add your Vercel URL (and `http://localhost:5173` for local dev)

This makes sign-up confirmation / password-reset links point to the deployed app
(and is required if you later add "Sign in with Microsoft").

## 5. Done — test it
Open the Vercel URL, log in as admin, and walk the flow. Re-deploys happen
automatically on every `git push`.

## Notes
- **Email reminders** deploy separately (Supabase Edge Function, not Vercel) —
  see `supabase/functions/README.md`. Set its `APP_URL` secret to your Vercel URL
  so reminder emails link to the live app.
- The build prints a "chunk larger than 500 kB" warning — harmless. If you want to
  shrink it later, lazy-load routes with `React.lazy`.
- Custom domain: Vercel → Settings → Domains (then update the Supabase URLs to match).
