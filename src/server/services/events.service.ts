import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "@/lib/db/pool";
import { getEnv } from "@/lib/env";
import { AppError, mapDbError } from "@/lib/errors";
import { assertOwner, requireRole } from "@/lib/permissions";
import { parseWith } from "@/lib/validation/parse";
import { eventSchema, uuidSchema, type EventFilters, type EventInput } from "@/lib/validation/schemas";
import type { AttendeeRecord, EventRecord, SessionUser } from "@/types";

/** $1 is always the application timezone; callers append their own params from $2. */
const EVENT_SELECT = `
  SELECT e.id, e.organizer_id, u.name AS organizer_name, e.title, e.description,
         to_char(e.event_date, 'YYYY-MM-DD') AS event_date,
         to_char(e.event_time, 'HH24:MI')    AS event_time,
         e.venue, e.seat_limit, e.status, e.banner_url,
         (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id) AS registered_count,
         ((e.event_date + e.event_time) <= (now() AT TIME ZONE $1)) AS is_past,
         e.created_at, e.updated_at
    FROM events e JOIN users u ON u.id = e.organizer_id`;

const tz = () => getEnv().timezone;

function assertUuid(id: string) {
  if (!uuidSchema.safeParse(id).success) throw new AppError("NOT_FOUND", "Event not found.");
}

/** True when date+time is in the future in the application timezone. */
async function isFuture(date: string, time: string, client?: PoolClient) {
  const sql = "SELECT (($1::date + $2::time) > (now() AT TIME ZONE $3)) AS ok";
  const params = [date, time, tz()];
  const res = client ? (await client.query<{ ok: boolean }>(sql, params)).rows[0] : await queryOne<{ ok: boolean }>(sql, params);
  return !!res?.ok;
}

export const PAGE_SIZE = 9;

/** Public list: upcoming, active events, with search and filters (bonus 1). */
export async function listUpcomingEvents(f: EventFilters) {
  const where = ["e.status = 'ACTIVE'", "(e.event_date + e.event_time) > (now() AT TIME ZONE $1)"];
  const params: unknown[] = [tz()];
  if (f.q) {
    params.push(`%${f.q.replace(/[%_\\]/g, "\\$&")}%`);
    where.push(`(e.title ILIKE $${params.length} OR e.description ILIKE $${params.length} OR e.venue ILIKE $${params.length})`);
  }
  if (f.when === "today") where.push("e.event_date = (now() AT TIME ZONE $1)::date");
  if (f.when === "week") where.push("e.event_date <= ((now() AT TIME ZONE $1)::date + 7)");
  if (f.when === "month") where.push("e.event_date <= ((now() AT TIME ZONE $1)::date + 30)");
  if (f.availability === "available")
    where.push("(SELECT count(*) FROM registrations r WHERE r.event_id = e.id) < e.seat_limit");

  const whereSql = where.join(" AND ");
  const total = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM events e WHERE ${whereSql}`, params);
  const rows = await query<EventRecord>(
    `${EVENT_SELECT} WHERE ${whereSql} ORDER BY e.event_date, e.event_time, e.id LIMIT ${PAGE_SIZE} OFFSET ${(f.page - 1) * PAGE_SIZE}`,
    params,
  );
  return { events: rows, total: total?.n ?? 0, page: f.page, pageSize: PAGE_SIZE };
}

export async function getEvent(id: string): Promise<EventRecord> {
  assertUuid(id);
  const ev = await queryOne<EventRecord>(`${EVENT_SELECT} WHERE e.id = $2`, [tz(), id]);
  if (!ev) throw new AppError("NOT_FOUND", "Event not found.");
  return ev;
}

export async function createEvent(actor: SessionUser | null, raw: EventInput): Promise<EventRecord> {
  const user = requireRole(actor, "ORGANIZER");
  const input = parseWith(eventSchema, raw);
  if (!(await isFuture(input.eventDate, input.eventTime)))
    throw new AppError("EVENT_DATE_IN_PAST", "Events must be scheduled in the future.", { eventDate: "Choose a date and time in the future." });
  const row = await queryOne<{ id: string }>(
    `INSERT INTO events (organizer_id, title, description, event_date, event_time, venue, seat_limit, banner_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      user.id,
      input.title,
      input.description,
      input.eventDate,
      input.eventTime,
      input.venue,
      input.seatLimit,
      input.bannerUrl || null,
    ],
  );
  return getEvent(row!.id);
}

/** Loads an event under a row lock, and verifies the actor owns it. */
async function lockOwnedEvent(client: PoolClient, id: string, user: SessionUser) {
  const { rows } = await client.query<{ organizer_id: string; status: string; is_past: boolean }>(
    `SELECT organizer_id, status, ((event_date + event_time) <= (now() AT TIME ZONE $2)) AS is_past
       FROM events WHERE id = $1 FOR UPDATE`,
    [id, tz()],
  );
  const ev = rows[0];
  if (!ev) throw new AppError("NOT_FOUND", "Event not found.");
  assertOwner(ev.organizer_id, user);
  return ev;
}

export async function updateEvent(actor: SessionUser | null, id: string, raw: EventInput): Promise<EventRecord> {
  const user = requireRole(actor, "ORGANIZER");
  assertUuid(id);
  const input = parseWith(eventSchema, raw);
  try {
    await withTransaction(async (client) => {
      const ev = await lockOwnedEvent(client, id, user);
      if (ev.status === "CANCELLED") throw new AppError("EVENT_CANCELLED", "Cancelled events can't be edited.");
      if (ev.is_past) throw new AppError("EVENT_PAST", "Past events can't be edited.");
      if (!(await isFuture(input.eventDate, input.eventTime, client)))
        throw new AppError("EVENT_DATE_IN_PAST", "Events must be scheduled in the future.", { eventDate: "Choose a date and time in the future." });
      const { rows } = await client.query<{ n: number }>("SELECT count(*)::int AS n FROM registrations WHERE event_id = $1", [id]);
      const taken = rows[0].n;
      if (input.seatLimit < taken)
        throw new AppError(
          "SEAT_LIMIT_BELOW_REGISTRATIONS",
          `${taken} ${taken === 1 ? "person has" : "people have"} already registered. The seat limit can't be lower than ${taken}.`,
          { seatLimit: `Must be at least ${taken} (current registrations).` },
        );
      await client.query(
        `UPDATE events SET title=$2, description=$3, event_date=$4, event_time=$5, venue=$6, seat_limit=$7, banner_url=$8, updated_at=now() WHERE id=$1`,
        [
          id,
          input.title,
          input.description,
          input.eventDate,
          input.eventTime,
          input.venue,
          input.seatLimit,
          input.bannerUrl !== undefined ? input.bannerUrl || null : null,
        ],
      );
    });
  } catch (err) {
    mapDbError(err);
  }
  return getEvent(id);
}

/** Cancels an event. Existing registrations are kept as history. */
export async function cancelEvent(actor: SessionUser | null, id: string): Promise<EventRecord> {
  const user = requireRole(actor, "ORGANIZER");
  assertUuid(id);
  await withTransaction(async (client) => {
    const ev = await lockOwnedEvent(client, id, user);
    if (ev.status === "CANCELLED") throw new AppError("EVENT_CANCELLED", "This event is already cancelled.");
    if (ev.is_past) throw new AppError("EVENT_PAST", "Past events can't be cancelled.");
    await client.query("UPDATE events SET status='CANCELLED', updated_at=now() WHERE id=$1", [id]);
  });
  return getEvent(id);
}

export async function listOrganizerEvents(actor: SessionUser | null): Promise<EventRecord[]> {
  const user = requireRole(actor, "ORGANIZER");
  return query<EventRecord>(`${EVENT_SELECT} WHERE e.organizer_id = $2 ORDER BY e.event_date DESC, e.event_time DESC`, [tz(), user.id]);
}

/** Organizer-only: event + attendee list. 403 for events owned by someone else. */
export async function getOrganizerEventWithAttendees(actor: SessionUser | null, id: string) {
  const user = requireRole(actor, "ORGANIZER");
  const event = await getEvent(id);
  assertOwner(event.organizer_id, user);
  const attendees = await query<AttendeeRecord>(
    `SELECT r.id AS registration_id, u.id AS attendee_id, u.name, u.email, r.registered_at
       FROM registrations r JOIN users u ON u.id = r.attendee_id
      WHERE r.event_id = $1 ORDER BY r.registered_at, r.id`,
    [id],
  );
  return { event, attendees };
}

/** Bonus 2: organizer analytics. */
export async function getOrganizerStats(actor: SessionUser | null) {
  const events = await listOrganizerEvents(actor);
  const active = events.filter((e) => e.status === "ACTIVE");
  const upcoming = active.filter((e) => !e.is_past);
  const seats = active.reduce((s, e) => s + e.seat_limit, 0);
  const taken = active.reduce((s, e) => s + e.registered_count, 0);
  return {
    totalEvents: events.length,
    totalRegistrations: events.reduce((s, e) => s + e.registered_count, 0),
    upcomingEvents: upcoming.length,
    cancelledEvents: events.filter((e) => e.status === "CANCELLED").length,
    utilization: seats ? Math.round((taken / seats) * 100) : 0,
    events,
  };
}

const csvCell = (v: string) => {
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** Bonus 3: attendee CSV (owner only). */
export async function attendeesCsv(actor: SessionUser | null, id: string) {
  const { event, attendees } = await getOrganizerEventWithAttendees(actor, id);
  const lines = [["Name", "Email", "Registered at (UTC)"].map(csvCell).join(",")];
  for (const a of attendees) lines.push([a.name, a.email, new Date(a.registered_at).toISOString()].map(csvCell).join(","));
  return { filename: `attendees-${event.id}.csv`, csv: lines.join("\r\n") + "\r\n" };
}
