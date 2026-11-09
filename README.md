# Evently

**Simple Event Booking & RSVP Platform** — organizers publish events with a seat limit; attendees browse and reserve a seat. Seat limits, duplicate prevention, email confirmation, media uploads, and ownership are enforced on the server and in the database, never just in the UI.

## Overview

Two roles, chosen at signup:

- **Organizer** — create, edit, cancel events; upload custom event banner images to Cloudinary; view attendee lists and live capacity counts; export attendees as CSV.
- **Attendee** — browse upcoming events, view details, register with instant capacity tracking, see their registrations, export reservations to calendar (.ics), and verify their email account.

## Features

- **Authentication & Verification** — Email/password auth with bcrypt-12 hashing, DB-backed HTTP-only session cookies, and Supabase PostgreSQL email confirmation with single-use SHA-256 tokens and Resend email delivery.
- **Role-Based Access & Ownership** — Strict RBAC and per-event ownership checks enforced across Route Handlers and Server Component layouts (HTTP 401 / 403 / 307 responses).
- **Event Lifecycle & Media Uploads** — Event CRUD with Cloudinary-backed banner image uploads, drag-and-drop file picker, live 21:9 preview, quick theme presets, and soft cancellation preserving registration history.
- **Atomic Registration & RSVP Cancellation** — Database row-level locking (`FOR UPDATE`) and database triggers guarantee seat limits are never exceeded even under simultaneous concurrent registrations; attendees can cancel reservations up to 1 day before the event, instantly releasing seats.
- **Modern Responsive SaaS Interface** — Live capacity hero monitor, trust/value strip, event discovery with search and filters, feature showcase, password visibility toggle, accessible Radix dialogs/sheets, and dark mode.
- **Comprehensive Bonus Features** — Search & filters, organizer dashboard & analytics, CSV export, `.ics` calendar export, Cloudinary banner uploads, and email confirmation.

## Tech Stack

Next.js 15 (App Router, Route Handlers, Server Components) · React 19 · TypeScript · Tailwind CSS v4 · Base UI / Radix primitives · Lucide icons · React Hook Form + Zod · PostgreSQL (Supabase) via `pg` · Resend · Cloudinary · bcryptjs · Vitest · Vercel.

> **Design decision — `pg` instead of Prisma.** Everything is plain SQL migrations + the `pg` driver. This keeps row-level locking (`SELECT … FOR UPDATE`) and DB triggers explicit and easy to explain, and avoids Prisma's engine-download step in restricted build environments.
>
> **Design decision — custom auth & verification over Supabase Auth.** Passwords are hashed with bcrypt (cost 12); sessions are random 256-bit tokens whose SHA-256 hash is stored in the `sessions` table; confirmation tokens are stored hashed in `email_confirmations` with 24h expiration; raw tokens live only in secure cookies or emailed links.

## Architecture

```
Browser ── forms (RHF+Zod) ──► Route Handlers /api/*  ─┐
   ▲                                                     ├─► services (rules, authz) ─► PostgreSQL (Supabase)
Server Components (pages/layouts) ── call services ─────┘    ├─► Resend (Confirmation Emails)
                                                             └─► Cloudinary (Banner Media Uploads)
```

All business logic lives in `src/server/services/*`. Both the API and the server-rendered pages call the same functions, ensuring rules cannot be bypassed by choosing a different entry point. Details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Database Schema

- `users` — stores user profile, hashed passwords, roles, and `email_confirmed_at` verification timestamp.
- `sessions` — holds active session hashes and expiration times.
- `email_confirmations` — stores single-use SHA-256 token hashes, user foreign keys, and 24h expiration timestamps.
- `login_attempts` — sliding-window rate-limiting keys (`HMAC(email|ip)`).
- `events` — event metadata, date, time, venue, seat limit, status, and `banner_url`.
- `registrations` — `UNIQUE(event_id, attendee_id)` records with atomic triggers.

Full reference: [`docs/DATABASE.md`](docs/DATABASE.md).

## Business Rules

| # | Rule | Where enforced |
|---|------|----------------|
| 1 | Registrations never exceed seat limit | `FOR UPDATE` lock + count in `registerForEvent`; trigger `enforce_registration_rules` |
| 2 | One registration per attendee per event | `UNIQUE(event_id, attendee_id)` + friendly 409 |
| 3 | Organizers manage only their own events | `assertOwner` on edit/cancel/attendees/export |
| 4 | Events must be in the future; no registration for past/cancelled | `isFuture()` (SQL clock, app timezone), checks in service, trigger for cancelled |
| 5 | Seat limit can't drop below registrations | locked count check in `updateEvent`; trigger `enforce_seat_limit_change` |
| 6 | Attendee RSVP cancellation cutoff | Allowed up to 1 day (24h) before event starts; blocked if < 24h away or past (`cancelRsvp`) |
| 7 | All of the above without the UI | rules live in services/DB; verified by direct HTTP and vitest suites |

### Concurrency / overbooking protection

Registration executes in a single database transaction: `SELECT … FROM events WHERE id=$1 FOR UPDATE` locks the event row, then the count is verified and the row inserted. Concurrent requests serialize on the row lock, guaranteeing zero overbooking under race conditions. A `BEFORE INSERT` trigger repeats the check inside PostgreSQL, preventing overbooking even if raw SQL queries bypass the service. Tests verify that 25 parallel attempts for 3 remaining seats result in exactly 3 successful registrations.

## Security

bcrypt-12 password hashing · opaque SHA-256 hashed session tokens · HTTP-only/SameSite=Lax cookies · server-side role authorization · Zod schema validation · parameterized SQL queries · CSRF same-origin check · DB-backed login rate limiting (5 attempts per 15 mins) · single-use hashed email confirmation tokens · CSV formula-injection protection (`=`, `+`, `-`, `@` sanitized) · secure Cloudinary transformation & upload verification · security headers.

## Local Development

```bash
npm install
cp .env.example .env.local    # configure database and API keys
npm run db:migrate            # apply all migrations (001_init, 002_email_confirmation, 003_event_banner)
npm run db:seed               # seed demo events and users
npm run dev                   # start local dev server at http://localhost:3000
```

Requires Node 20+ and PostgreSQL 13+ (e.g. Supabase).

## Environment Variables

| Name | Purpose | Required |
|------|---------|:--------:|
| `DATABASE_URL` | Postgres connection string (pooled connection on serverless) | Yes |
| `DIRECT_URL` | Direct connection string for migrations and seeding | Optional |
| `DATABASE_SSL` | `true` for remote SSL/TLS database connections (Supabase) | Yes |
| `AUTH_SECRET` | Random secret string for login rate-limit hashing | Yes |
| `APP_TIMEZONE` | IANA timezone for event date/time operations (default `UTC`, e.g. `Asia/Kolkata`) | Yes |
| `APP_URL` | Public application URL for CSRF origin verification and email links | Yes |
| `RESEND_API_KEY` | Resend API key for transactional email confirmation dispatch | Optional |
| `RESEND_FROM_EMAIL` | Sender address (e.g. `Evently <onboarding@resend.dev>`) | Optional |
| `CLOUDINARY_URL` | Cloudinary connection URL (`cloudinary://<key>:<secret>@<cloud_name>`) | Optional |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier for event banner media storage | Optional |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Optional |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | Optional |

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Organizer | `demo.organizer@example.com` | `DemoOrganizer123` |
| Organizer (second, for ownership demos) | `second.organizer@example.com` | `DemoOrganizer123` |
| Attendee | `demo.attendee@example.com` | `DemoAttendee123` |

## Testing & Verification

```bash
npm test                 # Run vitest integration suite (34 tests across auth, email confirmation, events & registrations)
npm run build            # Verify Next.js optimized production build
npm run typecheck        # Run TypeScript compiler check (tsc --noEmit)
npm run lint             # Run ESLint validation
npm run verify:requirements # Verify matrix of requirements
npm run preflight        # Full check: lint + typecheck + tests + secret scan
```

## Bonus Features Implemented

1. **Search & Multi-Parameter Filter** — Live search by title, description, or venue, combined with date window filters (*Any*, *Today*, *This Week*, *This Month*) and seat availability filters (`/events`).
2. **Organizer Dashboard & Analytics** — Dedicated organizer view (`/organizer`) with active events count, total attendees, aggregate capacity utilization metrics, and live progress meters.
3. **CSV Export** — One-click attendee roster export (`/api/organizer/events/[id]/attendees/export`) formatted with RFC 4180 compliance and spreadsheet formula-injection defenses.
4. **Add to Calendar (.ics)** — Downloadable iCalendar file (`/api/events/[id]/calendar`) allowing attendees to add events to Google Calendar, Apple Calendar, or Outlook.
5. **Banner Image & Media Uploads** — Cloudinary-powered drag-and-drop banner uploader, live 21:9 image previews, preset themes, and 16:9 thumbnails on discovery cards.
6. **Email Confirmation** — Supabase PostgreSQL token storage, single-use SHA-256 tokens, dedicated `/confirm-email` verification page, "Verified ✓" user badges, and Resend transactional mailer.
7. **Accessibility & Dark Mode** — Full theme switcher (System / Light / Dark), contrast-compliant colors, accessible ARIA roles, semantic landmarks, keyboard focus management, and screen-reader safe forms.
8. **Security Hardening** — Row-level locks, PostgreSQL constraint triggers, bcrypt-12 hashing, sliding-window rate limits, and CSRF origin verification.

## Known Limitations

- Attendees can't cancel their own registration (preserves audit trail in current scope).
- Event times are interpreted in a single configured timezone (`APP_TIMEZONE`).
- `.ics` export uses a default 2-hour duration when no end time is specified.
- Cloudinary free tier sandbox and Resend unverified domains require testing with registered account emails until custom domains are verified.

## Design Decisions

Custom bcrypt sessions and PostgreSQL token storage over Supabase Auth (full database ownership, zero third-party lock-in); `pg` driver + SQL migrations over Prisma (explicit row locks and native trigger enforcement); shared server services for both API endpoints and Server Components (single source of truth); defence-in-depth where business constraints are validated in application code and strictly guarded by PostgreSQL triggers.
