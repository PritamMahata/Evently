import { beforeAll, describe, expect, it } from "vitest";
import { getPool, query } from "@/lib/db/pool";
import { cancelEvent, getEvent, getOrganizerEventWithAttendees, updateEvent } from "@/server/services/events.service";
import {
  canAttendeeCancelRsvp,
  cancelRsvp,
  listMyRegistrations,
  registerForEvent,
  registrationIcs,
} from "@/server/services/registrations.service";
import { count, dateFromNow, makeEvent, makeImminentEvent, makePastEvent, makeUser } from "./helpers";
import type { SessionUser } from "@/types";

let org: SessionUser;
beforeAll(async () => {
  org = await makeUser("ORGANIZER");
});

const edit = (seatLimit: number) => ({ title: "Seat test", description: "Seat limit change test.", eventDate: dateFromNow(11), eventTime: "10:00", venue: "Hall", seatLimit });

describe("registration", () => {
  it("ATT-02 registers an attendee and shows it in my registrations and organizer list", async () => {
    const ev = await makeEvent(org);
    const a = await makeUser("ATTENDEE");
    const { event } = (await registerForEvent(a, ev.id))!;
    expect(event.registered_count).toBe(1);
    expect((await listMyRegistrations(a)).map((r) => r.event.id)).toEqual([ev.id]);
    const { attendees } = await getOrganizerEventWithAttendees(org, ev.id);
    expect(attendees.map((x) => x.email)).toEqual([a.email]);
  });

  it("organizers and anonymous users cannot register", async () => {
    const ev = await makeEvent(org);
    await expect(registerForEvent(org, ev.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(registerForEvent(null, ev.id)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("RULE-02 rejects a duplicate registration with a friendly message", async () => {
    const ev = await makeEvent(org);
    const a = await makeUser("ATTENDEE");
    await registerForEvent(a, ev.id);
    await expect(registerForEvent(a, ev.id)).rejects.toMatchObject({ code: "ALREADY_REGISTERED", message: "You are already registered for this event." });
    expect((await getEvent(ev.id)).registered_count).toBe(1);
  });

  it("RULE-02 database UNIQUE(event_id, attendee_id) blocks duplicates even via raw SQL", async () => {
    const ev = await makeEvent(org);
    const a = await makeUser("ATTENDEE");
    await registerForEvent(a, ev.id);
    await expect(query("INSERT INTO registrations (event_id, attendee_id) VALUES ($1, $2)", [ev.id, a.id])).rejects.toMatchObject({ code: "23505" });
  });

  it("RULE-01 limit=1: second registration is rejected", async () => {
    const ev = await makeEvent(org, { seatLimit: 1 });
    await registerForEvent(await makeUser("ATTENDEE"), ev.id);
    await expect(registerForEvent(await makeUser("ATTENDEE"), ev.id)).rejects.toMatchObject({ code: "EVENT_FULL" });
    const after = await getEvent(ev.id);
    expect(after.registered_count).toBe(1);
  });

  it("RULE-01 database trigger rejects overbooking even via raw SQL", async () => {
    const ev = await makeEvent(org, { seatLimit: 1 });
    await registerForEvent(await makeUser("ATTENDEE"), ev.id);
    const extra = await makeUser("ATTENDEE");
    await expect(query("INSERT INTO registrations (event_id, attendee_id) VALUES ($1, $2)", [ev.id, extra.id])).rejects.toMatchObject({ code: "P0004" });
  });

  it("rejects registration for cancelled events (service and DB trigger)", async () => {
    const ev = await makeEvent(org);
    await cancelEvent(org, ev.id);
    const a = await makeUser("ATTENDEE");
    await expect(registerForEvent(a, ev.id)).rejects.toMatchObject({ code: "EVENT_CANCELLED" });
    await expect(query("INSERT INTO registrations (event_id, attendee_id) VALUES ($1, $2)", [ev.id, a.id])).rejects.toMatchObject({ code: "P0003" });
  });

  it("rejects registration for past events", async () => {
    const id = await makePastEvent(org);
    await expect(registerForEvent(await makeUser("ATTENDEE"), id)).rejects.toMatchObject({ code: "EVENT_PAST" });
  });

  it("cancelling keeps existing registrations as history", async () => {
    const ev = await makeEvent(org);
    const a = await makeUser("ATTENDEE");
    await registerForEvent(a, ev.id);
    await cancelEvent(org, ev.id);
    const mine = await listMyRegistrations(a);
    expect(mine).toHaveLength(1);
    expect(mine[0].event.status).toBe("CANCELLED");
  });

  it("OVERBOOKING: 25 simultaneous attempts for 3 seats yield exactly 3 registrations", async () => {
    const ev = await makeEvent(org, { seatLimit: 3 });
    const attendees = await Promise.all(Array.from({ length: 25 }, () => makeUser("ATTENDEE")));
    const results = await Promise.allSettled(attendees.map((a) => registerForEvent(a, ev.id)));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const full = results.filter((r) => r.status === "rejected" && (r.reason as { code: string }).code === "EVENT_FULL").length;
    expect(ok).toBe(3);
    expect(full).toBe(22);
    expect(await count("SELECT count(*)::int AS n FROM registrations WHERE event_id = $1", [ev.id])).toBe(3);
  });

  it("OVERBOOKING: the DB trigger alone holds under concurrent raw inserts (service bypassed)", async () => {
    const ev = await makeEvent(org, { seatLimit: 2 });
    const attendees = await Promise.all(Array.from({ length: 12 }, () => makeUser("ATTENDEE")));
    const pool = getPool();
    const results = await Promise.allSettled(attendees.map((a) => pool.query("INSERT INTO registrations (event_id, attendee_id) VALUES ($1, $2)", [ev.id, a.id])));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    expect(await count("SELECT count(*)::int AS n FROM registrations WHERE event_id = $1", [ev.id])).toBe(2);
  });
});

describe("RULE-05 seat limit modification", () => {
  it("limit=10, registrations=5: lowering to 4 is rejected; 5 and 80 are allowed", async () => {
    const ev = await makeEvent(org, { seatLimit: 10 });
    for (let i = 0; i < 5; i++) await registerForEvent(await makeUser("ATTENDEE"), ev.id);
    await expect(updateEvent(org, ev.id, edit(4))).rejects.toMatchObject({ code: "SEAT_LIMIT_BELOW_REGISTRATIONS" });
    expect((await getEvent(ev.id)).seat_limit).toBe(10);
    expect((await updateEvent(org, ev.id, edit(5))).seat_limit).toBe(5);
    expect((await updateEvent(org, ev.id, edit(80))).seat_limit).toBe(80);
  });

  it("database trigger rejects lowering the limit via raw SQL", async () => {
    const ev = await makeEvent(org, { seatLimit: 10 });
    for (let i = 0; i < 3; i++) await registerForEvent(await makeUser("ATTENDEE"), ev.id);
    await expect(query("UPDATE events SET seat_limit = 2 WHERE id = $1", [ev.id])).rejects.toMatchObject({ code: "P0005" });
  });
});

describe("calendar export", () => {
  it("generates an .ics only for registered attendees", async () => {
    const ev = await makeEvent(org);
    const a = await makeUser("ATTENDEE");
    await expect(registrationIcs(a, ev.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await registerForEvent(a, ev.id);
    const { body } = await registrationIcs(a, ev.id);
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("SUMMARY:Test Event");
  });
});

describe("cancel RSVP", () => {
  it("cancels RSVP successfully when event is > 1 day away and releases the seat", async () => {
    const ev = await makeEvent(org, { seatLimit: 5 });
    const a = await makeUser("ATTENDEE");

    // Register
    await registerForEvent(a, ev.id);
    expect((await getEvent(ev.id)).registered_count).toBe(1);
    expect(await canAttendeeCancelRsvp(ev.id)).toBe(true);

    const mineBefore = await listMyRegistrations(a);
    expect(mineBefore).toHaveLength(1);
    expect(mineBefore[0].can_cancel).toBe(true);

    // Cancel RSVP
    const res = await cancelRsvp(a, ev.id);
    expect(res?.success).toBe(true);
    expect(res?.event.registered_count).toBe(0);

    // Verify registrations list is now empty
    const mineAfter = await listMyRegistrations(a);
    expect(mineAfter).toHaveLength(0);

    // Verify attendee is removed from organizer attendee list
    const { attendees } = await getOrganizerEventWithAttendees(org, ev.id);
    expect(attendees).toHaveLength(0);

    // Attendee can register again
    await registerForEvent(a, ev.id);
    expect((await getEvent(ev.id)).registered_count).toBe(1);
  });

  it("rejects cancellation when the event begins in less than 1 day (cutoff passed)", async () => {
    const imminentId = await makeImminentEvent(org);
    const a = await makeUser("ATTENDEE");

    // Manually register for imminent event
    await query("INSERT INTO registrations (event_id, attendee_id) VALUES ($1, $2)", [imminentId, a.id]);
    expect((await getEvent(imminentId)).registered_count).toBe(1);
    expect(await canAttendeeCancelRsvp(imminentId)).toBe(false);

    // Try to cancel: should be rejected
    await expect(cancelRsvp(a, imminentId)).rejects.toMatchObject({
      code: "CANCELLATION_DEADLINE_PASSED",
      message: expect.stringContaining("at least 1 day"),
    });

    // Seat remains registered
    expect((await getEvent(imminentId)).registered_count).toBe(1);
  });

  it("rejects cancellation if attendee is not registered", async () => {
    const ev = await makeEvent(org);
    const a = await makeUser("ATTENDEE");
    await expect(cancelRsvp(a, ev.id)).rejects.toMatchObject({
      code: "NOT_REGISTERED",
      message: "You are not registered for this event.",
    });
  });

  it("rejects cancellation for past events", async () => {
    const pastId = await makePastEvent(org);
    const a = await makeUser("ATTENDEE");
    await query("INSERT INTO registrations (event_id, attendee_id) VALUES ($1, $2)", [pastId, a.id]);

    await expect(cancelRsvp(a, pastId)).rejects.toMatchObject({
      code: "EVENT_PAST",
    });
  });

  it("organizers and anonymous users cannot cancel attendee RSVPs", async () => {
    const ev = await makeEvent(org);
    const a = await makeUser("ATTENDEE");
    await registerForEvent(a, ev.id);

    await expect(cancelRsvp(org, ev.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(cancelRsvp(null, ev.id)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("unknown event id returns 404 NOT_FOUND", async () => {
    const a = await makeUser("ATTENDEE");
    await expect(cancelRsvp(a, "00000000-0000-0000-0000-000000000000")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
