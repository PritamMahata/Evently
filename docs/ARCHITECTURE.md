# Architecture

## Frontend
Next.js App Router. Pages and layouts are **Server Components** that call services directly (no client-side data fetching for reads). Interactive bits are small **Client Components**: forms (React Hook Form + Zod), register button, cancel dialog, theme toggle, mobile nav. After a mutation the client calls `router.refresh()` so seat counts always come from the database. UI primitives in `src/components/ui` follow the shadcn/ui pattern (Radix + Tailwind + `cva`).

## Backend
Route Handlers under `src/app/api/**` are thin: parse input with Zod → call a service → return JSON. A `route()` wrapper adds the CSRF origin check for mutations and converts `AppError` into `{ error: { code, message, fields? } }` with the right status. Unexpected errors are logged server-side and returned as a generic 500.

```
src/lib/        auth, db pool/migrations, validation (zod), permissions, http helpers
src/server/     services (auth, events, registrations) + page-data loaders
db/migrations/  plain SQL
scripts/        migrate, seed, e2e, verify-requirements, preflight
```

## Authentication flow
1. Signup/login validates input (Zod), checks credentials (bcrypt), then creates a random 32-byte token.
2. `sessions` stores `sha256(token)` + expiry (7 days); the raw token goes into an HTTP-only cookie.
3. Each request resolves the cookie → session → user with one join (`getSessionUser`, cached per request).
4. Logout deletes the session row, so a copied cookie stops working immediately.

## Authorization flow
Service functions receive the **actor** (from the session) and call `requireRole` / `assertOwner`. Pages guard in **layouts** (`requirePageUser`, `loadOwnedEvent`) which run before streaming, producing real `307`/`403`/`404` statuses. Middleware only forwards the pathname for `?next=`; it makes no auth decisions.

## Database
PostgreSQL. `events.organizer_id` and `registrations.(event_id, attendee_id)` are FKs with `RESTRICT` deletes (history is never silently lost). See `DATABASE.md`.

## Registration flow
`registerForEvent` → role check → **BEGIN** → `SELECT … FOR UPDATE` on the event → reject cancelled/past → reject duplicate → count ≥ limit? reject → `INSERT` (trigger re-checks) → **COMMIT**. DB error codes are mapped to friendly messages (`mapDbError`).

## Seat-limit protection
The row lock serializes all registrations *and* seat-limit edits for one event. The trigger `enforce_registration_rules` repeats the rule inside Postgres for any other writer. Tests cover: sequential, 25-way parallel through the service, 12-way parallel raw SQL, and the same race over real HTTP.

## Error handling
Domain errors are `AppError(code)`. Forms show field errors (`fields`) inline plus a toast; pages use `not-found.tsx`, `forbidden.tsx`, `error.tsx`; every route segment with data has a skeleton `loading.tsx` placed in a route group so it doesn't mask status codes.

## Deployment architecture
Vercel (Next.js serverless functions + static assets) → Supabase Postgres through the transaction pooler (small `pg` pool, `max: 5`). Migrations/seed run from a developer machine against the direct connection.
