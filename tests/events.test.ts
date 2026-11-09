import { beforeAll, describe, expect, it } from "vitest";
import { cancelEvent, createEvent, getOrganizerEventWithAttendees, updateEvent, listOrganizerEvents } from "@/server/services/events.service";
import { dateFromNow, makeEvent, makeUser } from "./helpers";
import type { SessionUser } from "@/types";

let orgA: SessionUser, orgB: SessionUser, attendee: SessionUser;
beforeAll(async () => {
  orgA = await makeUser("ORGANIZER");
  orgB = await makeUser("ORGANIZER");
  attendee = await makeUser("ATTENDEE");
});

const input = (over = {}) => ({ title: "Edited title", description: "Edited description text.", eventDate: dateFromNow(12), eventTime: "09:00", venue: "New Venue", seatLimit: 20, ...over });

describe("organizer event management", () => {
  it("ORG-01 organizer creates an event owned by themselves", async () => {
    const ev = await makeEvent(orgA);
    expect(ev.organizer_id).toBe(orgA.id);
    expect(ev.status).toBe("ACTIVE");
    expect(ev.registered_count).toBe(0);
  });

  it("attendees cannot create, edit or cancel events", async () => {
    const ev = await makeEvent(orgA);
    await expect(makeEvent(attendee)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(updateEvent(attendee, ev.id, input())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(cancelEvent(attendee, ev.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createEvent(null, input())).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("RULE-04 rejects past dates on create and edit", async () => {
    await expect(makeEvent(orgA, { eventDate: dateFromNow(-2) })).rejects.toMatchObject({ code: "EVENT_DATE_IN_PAST" });
    const ev = await makeEvent(orgA);
    await expect(updateEvent(orgA, ev.id, input({ eventDate: dateFromNow(-1) }))).rejects.toMatchObject({ code: "EVENT_DATE_IN_PAST" });
  });

  it("ORG-02 organizer edits their own event", async () => {
    const ev = await makeEvent(orgA);
    const updated = await updateEvent(orgA, ev.id, input());
    expect(updated.title).toBe("Edited title");
    expect(updated.seat_limit).toBe(20);
  });

  it("RULE-03 organizer cannot edit another organizer's event", async () => {
    const ev = await makeEvent(orgA);
    await expect(updateEvent(orgB, ev.id, input())).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("RULE-03 organizer cannot cancel or view attendees of another organizer's event", async () => {
    const ev = await makeEvent(orgA);
    await expect(cancelEvent(orgB, ev.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getOrganizerEventWithAttendees(orgB, ev.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ORG-03 organizer cancels own event; it is kept with CANCELLED status", async () => {
    const ev = await makeEvent(orgA);
    const cancelled = await cancelEvent(orgA, ev.id);
    expect(cancelled.status).toBe("CANCELLED");
    await expect(cancelEvent(orgA, ev.id)).rejects.toMatchObject({ code: "EVENT_CANCELLED" });
    await expect(updateEvent(orgA, ev.id, input())).rejects.toMatchObject({ code: "EVENT_CANCELLED" });
  });

  it("lists only the organizer's own events", async () => {
    const mine = await listOrganizerEvents(orgB);
    expect(mine.every((e) => e.organizer_id === orgB.id)).toBe(true);
  });

  it("unknown or malformed ids are 404", async () => {
    await expect(updateEvent(orgA, "not-a-uuid", input())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(cancelEvent(orgA, "00000000-0000-0000-0000-000000000000")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("validates fields (title, seats)", async () => {
    await expect(makeEvent(orgA, { title: "x" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(makeEvent(orgA, { seatLimit: 0 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("creates and updates an event with a banner image URL", async () => {
    const banner = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
    const ev = await createEvent(orgA, {
      title: "Banner Test Event",
      description: "Testing banner upload persistence.",
      eventDate: dateFromNow(15),
      eventTime: "18:00",
      venue: "Cloudinary Stage",
      seatLimit: 100,
      bannerUrl: banner,
    });
    expect(ev.banner_url).toBe(banner);

    const updated = await updateEvent(orgA, ev.id, {
      title: "Banner Test Event Updated",
      description: "Testing banner upload persistence updated.",
      eventDate: dateFromNow(15),
      eventTime: "18:00",
      venue: "Cloudinary Stage",
      seatLimit: 100,
      bannerUrl: "https://res.cloudinary.com/demo/image/upload/v2.jpg",
    });
    expect(updated.banner_url).toBe("https://res.cloudinary.com/demo/image/upload/v2.jpg");
  });
});
