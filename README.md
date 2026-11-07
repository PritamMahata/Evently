# Evently

**Simple Event Booking & RSVP Platform** — organizers publish events with a seat limit; attendees browse and reserve a seat. Seat limits, duplicate prevention and ownership are enforced on the server and in the database, never just in the UI.

## Overview

Two roles, chosen at signup:

- **Organizer** — create, edit and cancel their own events; see attendee lists and seat counts; export attendees as CSV.
- **Attendee** — browse upcoming events, view details, register, see their registrations; export a registration to calendar (.ics).

## Features

- Email/password auth with bcrypt hashing and DB-backed, HTTP-only session cookies
- Role-based access control and per-event ownership checks (real HTTP 403 / 307 responses)
- Event CRUD (create, edit, cancel with confirmation dialog; cancelled events keep their history)
- Registration with seat limits, duplicate prevention, past/cancelled blocking
- Overbooking-proof under concurrency (row lock + database trigger)
- Responsive UI (mobile Sheet navigation, table → card layouts), dark mode, skeleton loading states, empty states, toasts, accessible dialogs
- **Bonus:** search + date/availability filters, organizer analytics, CSV export, `.ics` export

## Tech Stack

Next.js 15 (App Router, Route Handlers, Server Components) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui-style components on Radix · Lucide · React Hook Form + Zod · PostgreSQL (Supabase) via `pg` · bcryptjs · Vitest · Vercel.

> **Design decision — `pg` instead of Prisma.** Everything is plain SQL migrations + the `pg` driver. This keeps row-level locking (`SELECT … FOR UPDATE`) and DB triggers explicit and easy to explain, and avoids Prisma's engine-download step in restricted build environments. One data-access approach is used throughout.
>
> **Design decision — custom auth instead of Supabase Auth.** Passwords are hashed with bcrypt (cost 12); sessions are random 256-bit tokens whose SHA-256 hash is stored in the `sessions` table; the raw token lives only in an HTTP-only, SameSite=Lax (Secure in production) cookie.

## Architecture

```
Browser ── forms (RHF+Zod) ──► Route Handlers /api/*  ─┐
   ▲                                                     ├─► services (rules, authz) ─► PostgreSQL
Server Components (pages/layouts) ── call services ─────┘          (constraints + triggers)
```

All business logic lives in `src/server/services/*`. Both the API and the server-rendered pages call the same functions, so a rule can't be bypassed by choosing a different entry point. Details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Database Schema

`users`, `events`, `registrations` (+ `sessions`, `login_attempts`). Key constraints: `UNIQUE(event_id, attendee_id)`, `CHECK(seat_limit > 0)`, foreign keys everywhere, indexes on all FKs and `(event_date, event_time)`. Full reference: [`docs/DATABASE.md`](docs/DATABASE.md).

## Authentication

`/signup`, `/login`, logout from the user menu. Failed logins are rate-limited (5 per 15 min per email+IP, stored in the DB so it works on serverless). Wrong-email and wrong-password responses are identical and take similar time.

## Authorization

- Identity always comes from the server session — client-supplied `organizerId`/`attendeeId` is ignored.
- Role checks in services (`requireRole`) → 401 anonymous / 403 wrong role.
- Ownership checks (`assertOwner`) → 403 for another organizer's event.
- Pages: layouts run the same guards **before** streaming, so direct URL access returns a real `307 → /login` or `403`.
- CSRF: SameSite=Lax cookies + same-origin check on every mutating endpoint + JSON-only bodies.

## Business Rules

| # | Rule | Where enforced |
|---|------|----------------|
| 1 | Registrations never exceed seat limit | `FOR UPDATE` lock + count in `registerForEvent`; trigger `enforce_registration_rules` |
| 2 | One registration per attendee per event | `UNIQUE(event_id, attendee_id)` + friendly 409 |
| 3 | Organizers manage only their own events | `assertOwner` on edit/cancel/attendees/export |
| 4 | Events must be in the future; no registration for past/cancelled | `isFuture()` (SQL clock, app timezone), checks in service, trigger for cancelled |
| 5 | Seat limit can't drop below registrations | locked count check in `updateEvent`; trigger `enforce_seat_limit_change` |
| 6 | All of the above without the UI | rules live in services/DB; verified by direct HTTP tests |

### Concurrency / overbooking protection

Registration runs in one transaction: `SELECT … FROM events WHERE id=$1 FOR UPDATE` locks the event row, then the current count is read and the row inserted. A second request for the same event blocks on the lock until the first commits, then sees the updated count — so two people racing for the last seat serialize and one gets `EVENT_FULL`. Editing the seat limit takes the same lock. A `BEFORE INSERT` trigger repeats the check inside Postgres, so even raw SQL can't overbook. Tests prove this: 25 parallel attempts for 3 seats → exactly 3 succeed, in both the service and with the service bypassed. (I also verified the tests *fail* when the locks are removed.)

## Security

bcrypt hashing · opaque hashed session tokens · HTTP-only/SameSite/Secure cookies · server-side authz · Zod validation on every input · parameterized SQL only · CSRF origin check · login rate limit · CSV formula-injection guard · security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`) · no secrets in source, `.env` git-ignored, no `NEXT_PUBLIC_` variables · friendly errors, no stack traces to users.

## Local Development

```bash
npm install
cp .env.example .env          # then edit values (see below)
npm run db:migrate            # create tables
npm run db:seed               # demo data
npm run dev                   # http://localhost:3000
```

Requires Node 20+ and a PostgreSQL 13+ database (local Postgres or a free Supabase project).

## Environment Variables

| Name | Purpose |
|------|---------|
| `DATABASE_URL` | Postgres connection string (pooled on Vercel) |
| `DIRECT_URL` | Direct connection used by migrate/seed scripts |
| `DATABASE_SSL` | `true` for Supabase |
| `AUTH_SECRET` | Random string, keys the login-rate-limit hash (`openssl rand -base64 32`) |
| `APP_TIMEZONE` | IANA timezone events are interpreted in (default `UTC`, e.g. `Asia/Kolkata`) |
| `APP_URL` | Public site URL (extra allowed origin for the CSRF check) |

## Database Setup

`npm run db:migrate` applies `db/migrations/*.sql` in order and records them in `schema_migrations`. `npm run db:reset` drops and recreates everything (refuses in production).

## Seed Data

`npm run db:seed` is idempotent. It creates 2 organizers, 9 attendees and 8 fictional events: open, nearly full, **full** (Design Systems Roundtable, 5/5), **cancelled** (Cloud Cost Clinic) and **past** (Intro to TypeScript Evening).

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Organizer | `demo.organizer@example.com` | `DemoOrganizer123` |
| Organizer (second, for ownership demos) | `second.organizer@example.com` | `DemoOrganizer123` |
| Attendee | `demo.attendee@example.com` | `DemoAttendee123` |

These are throwaway passwords for fictional demo data. **Don't seed them into a public production database you care about** — or change them.

## Testing

```bash
npm test                 # 31 unit/integration tests against a real Postgres (<dbname>_test)
npm run build && npm start
BASE_URL=http://localhost:3000 npm run test:api   # 35 HTTP end-to-end checks
npm run verify:requirements
npm run preflight        # everything above + lint + typecheck + secret scan
```

Unit tests need `DATABASE_URL` to point at a Postgres where `<name>_test` exists (or set `TEST_DATABASE_URL`). The test DB is wiped on every run — never point it at real data.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) (Vercel + Supabase). **Deployment itself is a MANUAL ACTION REQUIRED** — it needs your accounts.

## Requirement Compliance

[`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) is generated from real evidence by `npm run verify:requirements -- --write-matrix`. Items that can't be automated are marked `MANUAL`.

## Bonus Features

Search & filters (`/events`), organizer analytics (`/organizer`), CSV export (attendee list), `.ics` calendar export.

## Known Limitations

- Attendees can't cancel their own registration (not in the required scope).
- No email notifications or password reset.
- Event times are interpreted in a single configured timezone (`APP_TIMEZONE`).
- `.ics` uses the configured timezone and a fixed 2-hour duration.
- Rate limiting is per email+IP in Postgres — adequate for the assessment, not a WAF replacement.
- Responsive/dark-mode visuals were implemented with Tailwind but not screenshot-tested in an automated browser (see `UI-02` in the matrix).

## Design Decisions

Custom bcrypt sessions over Supabase Auth (full control, easy to explain); `pg` + SQL over an ORM (explicit locking); services shared by API and pages (one place for rules); guards in layouts (so 403/307 are real status codes); defence in depth — every critical rule is checked in the service *and* the database.

## Screenshots

*(Add after deployment.)* `docs/screenshots/`

## Demo Video

*(Add link after recording — script in [`docs/DEMO_VIDEO_SCRIPT.md`](docs/DEMO_VIDEO_SCRIPT.md).)*
