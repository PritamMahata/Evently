# Deployment (Vercel + Supabase)

> **MANUAL ACTION REQUIRED** — these steps need your own accounts. Nothing here has been run on your behalf.

## 1. Supabase (database)
1. Create a project at supabase.com. Save the database password.
2. *Project Settings → Database → Connection string*. Copy:
   - **Transaction pooler** (port 6543) → `DATABASE_URL` (used by the app on Vercel)
   - **Direct** (port 5432, or *Session pooler* if your network is IPv4-only) → `DIRECT_URL` (migrations/seed)

## 2. Create tables and demo data (from your machine)
```bash
cp .env.example .env     # fill DATABASE_URL, DIRECT_URL, DATABASE_SSL=true, AUTH_SECRET, APP_TIMEZONE
npm install
npm run db:migrate
npm run db:seed          # optional but recommended so the app isn't empty
```

## 3. Vercel (app)
1. Push the repo to GitHub; *Add New → Project* in Vercel and import it (framework: Next.js, defaults are fine).
2. *Settings → Environment Variables* (Production):
   `DATABASE_URL` (pooled), `DATABASE_SSL=true`, `AUTH_SECRET` (`openssl rand -base64 32`), `APP_TIMEZONE`, `APP_URL` (your Vercel URL).
   Don't prefix anything with `NEXT_PUBLIC_`.
3. Deploy. Then set `APP_URL` to the final URL and redeploy if it changed.

## 4. Verify production
- [ ] Homepage loads and shows seeded events
- [ ] Sign up (new attendee) → lands on dashboard; log out; log in
- [ ] Browse `/events`, open one, register, see it in *My registrations*
- [ ] Log in as demo organizer: dashboard, create event, attendee list, cancel
- [ ] Direct URL `/organizer/events/new` as attendee → 403
- [ ] Refresh after registering: seat count persists (database persistence)
- [ ] Supabase *Table editor* shows the new rows

If you seed a public database, change the demo passwords (edit `scripts/seed.ts`) or delete the demo users afterwards.
