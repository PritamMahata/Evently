import { query, withTransaction } from "@/lib/db/pool";
import { getEnv } from "@/lib/env";
import { AppError, mapDbError } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { uuidSchema } from "@/lib/validation/schemas";
import { getEvent } from "./events.service";
import type { EventRecord, RegistrationRecord, SessionUser } from "@/types";

/**
 * Registers the logged-in attendee for an event.
 *
 * Overbooking protection: the event row is locked with SELECT ... FOR UPDATE inside a
 * transaction, so concurrent registrations for the same event are serialised. The seat
 * count is read and the row inserted while the lock is held. A BEFORE INSERT trigger
 * repeats the same check in the database, and UNIQUE(event_id, attendee_id) blocks duplicates.
 */
export async function registerForEvent(actor: SessionUser | null, eventId: string) {
  const user = requireRole(actor, "ATTENDEE");
  if (!uuidSchema.safeParse(eventId).success) throw new AppError("NOT_FOUND", "Event not found.");
  try {
    const registrationId = await withTransaction(async (client) => {
      const { rows } = await client.query<{ status: string; seat_limit: number; is_past: boolean }>(
        `SELECT status, seat_limit, ((event_date + event_time) <= (now() AT TIME ZONE $2)) AS is_past
           FROM events WHERE id = $1 FOR UPDATE`,
        [eventId, getEnv().timezone],
      );
      const ev = rows[0];
      if (!ev) throw new AppError("NOT_FOUND", "Event not found.");
      if (ev.status === "CANCELLED") throw new AppError("EVENT_CANCELLED", "This event has been cancelled.");
      if (ev.is_past) throw new AppError("EVENT_PAST", "This event has already taken place.");
      const dup = await client.query("SELECT 1 FROM registrations WHERE event_id = $1 AND attendee_id = $2", [eventId, user.id]);
      if (dup.rowCount) throw new AppError("ALREADY_REGISTERED", "You are already registered for this event.");
      const { rows: c } = await client.query<{ n: number }>("SELECT count(*)::int AS n FROM registrations WHERE event_id = $1", [eventId]);
      if (c[0].n >= ev.seat_limit) throw new AppError("EVENT_FULL", "This event is full. No seats are left.");
      const ins = await client.query<{ id: string }>(
        "INSERT INTO registrations (event_id, attendee_id) VALUES ($1, $2) RETURNING id",
        [eventId, user.id],
      );
      return ins.rows[0].id;
    });
    return { registrationId, event: await getEvent(eventId) };
  } catch (err) {
    mapDbError(err);
  }
}

export async function isRegistered(userId: string, eventId: string) {
  const rows = await query("SELECT 1 FROM registrations WHERE event_id = $1 AND attendee_id = $2", [eventId, userId]);
  return rows.length > 0;
}

type Row = Omit<RegistrationRecord, "event"> & { event_id: string };

export async function listMyRegistrations(actor: SessionUser | null): Promise<RegistrationRecord[]> {
  const user = requireRole(actor, "ATTENDEE");
  const rows = await query<Row>(
    `SELECT r.id AS registration_id, r.registered_at, r.event_id
       FROM registrations r JOIN events e ON e.id = r.event_id
      WHERE r.attendee_id = $1 ORDER BY e.event_date, e.event_time`,
    [user.id],
  );
  const events = await Promise.all(rows.map((r) => getEvent(r.event_id)));
  return rows.map((r, i) => ({ registration_id: r.registration_id, registered_at: r.registered_at, event: events[i] as EventRecord }));
}

export type RegistrationStatus = "CONFIRMED" | "EVENT_CANCELLED" | "COMPLETED";
export const registrationStatus = (e: EventRecord): RegistrationStatus =>
  e.status === "CANCELLED" ? "EVENT_CANCELLED" : e.is_past ? "COMPLETED" : "CONFIRMED";

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);

/** Bonus 4: .ics for an event the attendee is registered for (floating local time, 2h default duration). */
export async function registrationIcs(actor: SessionUser | null, eventId: string) {
  const user = requireRole(actor, "ATTENDEE");
  const event = await getEvent(eventId);
  if (!(await isRegistered(user.id, eventId))) throw new AppError("FORBIDDEN", "Register for this event to add it to your calendar.");
  const start = `${event.event_date.replace(/-/g, "")}T${event.event_time.replace(":", "")}00`;
  const end = new Date(Date.UTC(+event.event_date.slice(0, 4), +event.event_date.slice(5, 7) - 1, +event.event_date.slice(8, 10), +event.event_time.slice(0, 2) + 2, +event.event_time.slice(3, 5)));
  const endStr = end.toISOString().replace(/[-:]/g, "").slice(0, 15);
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Evently//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${event.id}@evently`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=${getEnv().timezone}:${start}`, `DTEND;TZID=${getEnv().timezone}:${endStr}`,
    `SUMMARY:${icsEscape(event.title)}`, `LOCATION:${icsEscape(event.venue)}`, `DESCRIPTION:${icsEscape(event.description.slice(0, 500))}`,
    `STATUS:${event.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED"}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n") + "\r\n";
  return { filename: `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`, body };
}
