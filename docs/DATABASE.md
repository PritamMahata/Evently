# Database

PostgreSQL 13+. Source: `db/migrations/001_init.sql`.

| Table | Why it exists | Key columns |
|-------|---------------|-------------|
| `users` | accounts and roles | `id uuid`, `name`, `email` (unique, case-insensitive index), `password_hash`, `role` CHECK in (`ORGANIZER`,`ATTENDEE`), timestamps |
| `events` | events owned by an organizer | `organizer_id → users`, `title`, `description`, `event_date date`, `event_time time`, `venue`, `seat_limit` CHECK > 0, `status` CHECK in (`ACTIVE`,`CANCELLED`) |
| `registrations` | attendee ↔ event | `event_id → events`, `attendee_id → users`, `registered_at`, **UNIQUE(event_id, attendee_id)** |
| `sessions` | server-side login sessions | `user_id → users (CASCADE)`, `token_hash` unique, `expires_at` |
| `login_attempts` | login rate limiting | `key_hash` (HMAC of email+IP), `created_at` |
| `schema_migrations` | migration bookkeeping | `name` |

## Relationships
`users 1─* events` (organizer) · `users 1─* registrations` (attendee) · `events 1─* registrations`. Deletes are `RESTRICT` for events/registrations so history isn't lost.

## Indexes
`users(lower(email))` unique · `events(organizer_id)` · `events(event_date, event_time)` · `events(status)` · `registrations(attendee_id)` · `registrations(event_id)` · `sessions(user_id)`, `sessions(expires_at)` · `login_attempts(key_hash, created_at)`.

## Duplicate registration prevention
`CONSTRAINT registrations_event_attendee_key UNIQUE (event_id, attendee_id)`. The service checks first for a friendly message; if two identical requests race, the constraint rejects the loser (`23505`) and `mapDbError` returns the same friendly 409.

## Seat limit enforcement
1. Service: transaction + `SELECT … FOR UPDATE` on the event row + count + insert.
2. Trigger `registrations_enforce_rules` (BEFORE INSERT): locks the event row, rejects cancelled events (`P0003`) and `count >= seat_limit` (`P0004`).
3. Trigger `events_enforce_seat_limit` (BEFORE UPDATE OF seat_limit): rejects lowering the limit below current registrations (`P0005`).

## Dates
`event_date` + `event_time` are interpreted in `APP_TIMEZONE`; "future" is evaluated by Postgres: `(date + time) > (now() AT TIME ZONE tz)`.
