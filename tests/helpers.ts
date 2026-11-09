import { query, queryOne } from "@/lib/db/pool";
import { createEvent } from "@/server/services/events.service";
import { signupUser } from "@/server/services/auth.service";
import type { Role, SessionUser } from "@/types";

let n = 0;
export async function makeUser(role: Role, name = `Test ${role.toLowerCase()}`): Promise<SessionUser> {
  n += 1;
  return signupUser({ name, email: `u${Date.now()}${n}@example.com`, password: "Passw0rdTest", confirmPassword: "Passw0rdTest", role });
}

export function dateFromNow(days: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export async function makeEvent(organizer: SessionUser, overrides: Partial<{ seatLimit: number; eventDate: string; eventTime: string; title: string }> = {}) {
  return createEvent(organizer, {
    title: overrides.title ?? "Test Event",
    description: "A test event used by the automated suite.",
    eventDate: overrides.eventDate ?? dateFromNow(10),
    eventTime: overrides.eventTime ?? "18:30",
    venue: "Test Hall",
    seatLimit: overrides.seatLimit ?? 10,
  });
}

/** Inserts an event in the past directly (the API refuses to create one). */
export async function makePastEvent(organizer: SessionUser) {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO events (organizer_id, title, description, event_date, event_time, venue, seat_limit)
     VALUES ($1, 'Old Event', 'This event already happened.', current_date - 5, '10:00', 'Old Hall', 10) RETURNING id`,
    [organizer.id],
  );
  return row!.id;
}

/** Inserts an event starting in 2 hours (less than 1 day away, within the cancellation cutoff). */
export async function makeImminentEvent(organizer: SessionUser) {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO events (organizer_id, title, description, event_date, event_time, venue, seat_limit)
     VALUES ($1, 'Imminent Event', 'Starts soon.', (now() AT TIME ZONE 'UTC')::date, ((now() AT TIME ZONE 'UTC') + interval '2 hours')::time, 'Quick Hall', 10) RETURNING id`,
    [organizer.id],
  );
  return row!.id;
}

export const count = async (sql: string, params: unknown[] = []) => (await query<{ n: number }>(sql, params))[0].n;
