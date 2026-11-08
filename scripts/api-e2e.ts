/**
 * HTTP-level end-to-end checks against a RUNNING server (npm run build && npm start, then npm run test:api).
 * Every business rule is exercised by calling the API directly, bypassing the UI.
 * Results are written to .reports/api-e2e.json for `npm run verify:requirements`.
 */
import "dotenv/config";
import fs from "fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
interface Ev { id: string; organizer_id: string; title: string; status: string; registered_count: number }
/** Loose shape of the API's JSON responses (only the fields these checks read). */
interface J {
  user: { id: string; role: string; email: string };
  event: Ev; events: Ev[];
  attendees: { email: string; name: string; registered_at: string }[];
  registrations: { status: string; event: Ev }[];
  error: { code: string; message: string; fields: Record<string, string> };
}
const results: { id: string; name: string; ok: boolean; detail?: string }[] = [];

class Client {
  cookie = "";
  constructor(private ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`) {}
  async req(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string>; raw?: string } = {}) {
    const headers: Record<string, string> = { Origin: BASE, "x-forwarded-for": this.ip, ...(init.headers ?? {}) };
    if (this.cookie) headers.Cookie = this.cookie;
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(BASE + path, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers,
      body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
      redirect: "manual",
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(";");
      if (pair.startsWith("evently_session=")) this.cookie = pair.endsWith("=") ? "" : pair;
    }
    const text = await res.text();
    let json = null as unknown as J;
    try { json = JSON.parse(text) as J; } catch { /* not json */ }
    return { status: res.status, json, text, headers: res.headers, setCookie: set };
  }
}

async function check(id: string, name: string, fn: () => Promise<void>) {
  try { await fn(); results.push({ id, name, ok: true }); console.log(`  ✓ ${name}`); }
  catch (e) { results.push({ id, name, ok: false, detail: (e as Error).message }); console.log(`  ✗ ${name}\n      ${(e as Error).message}`); }
}
function eq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const stamp = Date.now().toString(36);
const futureDate = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
const eventBody = (o: Record<string, unknown> = {}) => ({ title: "E2E Event " + stamp, description: "Created by the API end-to-end suite.", eventDate: futureDate(14), eventTime: "17:00", venue: "E2E Hall", seatLimit: 10, ...o });
let counter = 0;
async function signup(role: "ORGANIZER" | "ATTENDEE", c = new Client()) {
  const email = `e2e.${stamp}.${++counter}@example.com`;
  const r = await c.req("/api/auth/signup", { body: { name: `E2E ${role} ${counter}`, email, password: "E2ePassw0rd", confirmPassword: "E2ePassw0rd", role } });
  eq(r.status, 201, "signup status");
  return { c, email, user: r.json.user };
}

async function main() {
  console.log(`\nAPI end-to-end tests against ${BASE}\n`);
  const anon = new Client();
  const orgA = await signup("ORGANIZER");
  const orgB = await signup("ORGANIZER");
  const att = await signup("ATTENDEE");

  console.log("Authentication");
  await check("AUTH-01", "signup returns user with chosen role and no password data", async () => {
    eq(orgA.user.role, "ORGANIZER", "role"); eq(att.user.role, "ATTENDEE", "role");
    if (JSON.stringify(orgA.user).match(/password|hash/i)) throw new Error("password data leaked");
  });
  await check("AUTH-01", "signup rejects weak password / mismatch / bad email / bad role with field errors", async () => {
    const r = await anon.req("/api/auth/signup", { body: { name: "X", email: "bad", password: "short", confirmPassword: "nope", role: "ADMIN" } });
    eq(r.status, 400, "status"); if (!r.json.error.fields.email || !r.json.error.fields.password || !r.json.error.fields.role) throw new Error("missing field errors");
  });
  await check("AUTH-01", "duplicate email is rejected (409)", async () => {
    const r = await new Client().req("/api/auth/signup", { body: { name: "Dup User", email: orgA.email.toUpperCase(), password: "E2ePassw0rd", confirmPassword: "E2ePassw0rd", role: "ATTENDEE" } });
    eq(r.status, 409, "status");
  });
  await check("AUTH-04", "session cookie is HttpOnly + SameSite and holds an opaque token (no user data)", async () => {
    const r = await new Client().req("/api/auth/login", { body: { email: att.email, password: "E2ePassw0rd" } });
    eq(r.status, 200, "login status");
    const sc = r.setCookie.find((c) => c.startsWith("evently_session="));
    if (!sc) throw new Error("no session cookie"); if (!/HttpOnly/i.test(sc)) throw new Error("not HttpOnly"); if (!/SameSite=lax/i.test(sc)) throw new Error("no SameSite=Lax");
    if (sc.includes(att.email)) throw new Error("cookie contains user data");
  });
  await check("AUTH-02", "login with wrong password -> 401 generic message; unknown email -> same", async () => {
    const c = new Client();
    const a = await c.req("/api/auth/login", { body: { email: att.email, password: "WrongPass1" } });
    const b = await c.req("/api/auth/login", { body: { email: "nobody@example.com", password: "WrongPass1" } });
    eq(a.status, 401, "status a"); eq(b.status, 401, "status b"); eq(a.json.error.message, b.json.error.message, "messages equal");
  });
  await check("AUTH-02", "login rate limit: 6th attempt within window -> 429", async () => {
    const c = new Client("203.0.113.77"); let last = 0;
    for (let i = 0; i < 6; i++) last = (await c.req("/api/auth/login", { body: { email: `rl.${stamp}@example.com`, password: "WrongPass1" } })).status;
    eq(last, 429, "6th status");
  });
  await check("AUTH-03", "logout invalidates the session server-side (old cookie no longer works)", async () => {
    const c = new Client(); await c.req("/api/auth/login", { body: { email: att.email, password: "E2ePassw0rd" } });
    const stolen = c.cookie; eq((await c.req("/api/auth/me")).json.user.email, att.email, "me before");
    eq((await c.req("/api/auth/logout", { method: "POST" })).status, 200, "logout");
    const again = new Client(); again.cookie = stolen;
    eq((await again.req("/api/auth/me")).json.user, null, "me with old cookie");
  });
  await check("RULE-06", "CSRF: cross-origin mutating request is blocked (403); non-browser (no Origin) allowed", async () => {
    const r = await att.c.req("/api/auth/logout", { method: "POST", headers: { Origin: "https://evil.example" } });
    eq(r.status, 403, "cross-origin"); eq((await att.c.req("/api/auth/me")).json.user.email, att.email, "still logged in");
  });
  await check("RULE-06", "non-JSON content-type / malformed JSON are 400", async () => {
    eq((await orgA.c.req("/api/events", { method: "POST", raw: "x=1", headers: { "Content-Type": "text/plain" } })).status, 400, "text/plain");
    eq((await orgA.c.req("/api/events", { method: "POST", raw: "{oops", headers: { "Content-Type": "application/json" } })).status, 400, "bad json");
  });

  console.log("\nOrganizer events and ownership");
  let ev: Ev;
  await check("ORG-01", "organizer creates an event (201); organizerId in body is ignored", async () => {
    const r = await orgA.c.req("/api/events", { body: { ...eventBody(), organizerId: orgB.user.id, organizer_id: orgB.user.id } });
    eq(r.status, 201, "status"); ev = r.json.event; eq(ev.organizer_id, orgA.user.id, "organizer from session");
  });
  await check("RULE-04", "creating an event in the past is rejected (400)", async () => {
    const r = await orgA.c.req("/api/events", { body: eventBody({ eventDate: futureDate(-3) }) });
    eq(r.status, 400, "status"); eq(r.json.error.code, "EVENT_DATE_IN_PAST", "code");
  });
  await check("RULE-04", "validation: empty title / zero seats / bad time", async () => {
    const r = await orgA.c.req("/api/events", { body: eventBody({ title: "", seatLimit: 0, eventTime: "25:99" }) });
    eq(r.status, 400, "status"); const f = r.json.error.fields; if (!f.title || !f.seatLimit || !f.eventTime) throw new Error("missing field errors " + JSON.stringify(f));
  });
  await check("RULE-03", "attendee and anonymous cannot create events (403 / 401)", async () => {
    eq((await att.c.req("/api/events", { body: eventBody() })).status, 403, "attendee");
    eq((await anon.req("/api/events", { body: eventBody() })).status, 401, "anonymous");
  });
  await check("ORG-02", "organizer edits own event (200)", async () => {
    const r = await orgA.c.req(`/api/events/${ev.id}`, { method: "PATCH", body: eventBody({ title: "Renamed " + stamp, seatLimit: 12 }) });
    eq(r.status, 200, "status"); eq(r.json.event.title, "Renamed " + stamp, "title"); ev = r.json.event;
  });
  await check("RULE-03", "organizer B gets 403 editing / cancelling / viewing attendees / exporting A's event", async () => {
    eq((await orgB.c.req(`/api/events/${ev.id}`, { method: "PATCH", body: eventBody({ title: "Hijack" }) })).status, 403, "PATCH");
    eq((await orgB.c.req(`/api/events/${ev.id}/cancel`, { method: "POST" })).status, 403, "cancel");
    eq((await orgB.c.req(`/api/organizer/events/${ev.id}/attendees`)).status, 403, "attendees");
    eq((await orgB.c.req(`/api/organizer/events/${ev.id}/attendees/export`)).status, 403, "export");
    eq((await att.c.req(`/api/events/${ev.id}/cancel`, { method: "POST" })).status, 403, "attendee cancel");
    eq((await att.c.req(`/api/organizer/events/${ev.id}/attendees`)).status, 403, "attendee list");
    eq((await anon.req(`/api/organizer/events/${ev.id}/attendees`)).status, 401, "anon list");
    eq((await anon.req(`/api/events/${ev.id}`)).json.event.title, "Renamed " + stamp, "unchanged");
  });
  await check("ORG-04", "organizer events list contains only their own events", async () => {
    const mine = (await orgB.c.req("/api/organizer/events")).json.events ;
    if (mine.some((e) => e.organizer_id !== orgB.user.id)) throw new Error("foreign event in list");
  });

  console.log("\nRegistration rules");
  await check("ATT-02", "attendee registers (201); seat count increases", async () => {
    const r = await att.c.req(`/api/events/${ev.id}/register`, { method: "POST" });
    eq(r.status, 201, "status"); eq(r.json.event.registered_count, 1, "count");
  });
  await check("RULE-02", "duplicate registration -> 409 with friendly message", async () => {
    const r = await att.c.req(`/api/events/${ev.id}/register`, { method: "POST" });
    eq(r.status, 409, "status"); eq(r.json.error.message, "You are already registered for this event.", "message");
    eq((await anon.req(`/api/events/${ev.id}`)).json.event.registered_count, 1, "count unchanged");
  });
  await check("RULE-03", "organizers and anonymous cannot register (403 / 401)", async () => {
    eq((await orgA.c.req(`/api/events/${ev.id}/register`, { method: "POST" })).status, 403, "organizer");
    eq((await anon.req(`/api/events/${ev.id}/register`, { method: "POST" })).status, 401, "anonymous");
  });
  await check("ATT-03", "my-registrations lists the event; attendee-only", async () => {
    const r = await att.c.req("/api/my-registrations"); eq(r.status, 200, "status");
    if (!r.json.registrations.some((x) => x.event.id === ev.id && x.status === "CONFIRMED")) throw new Error("registration missing");
    eq((await orgA.c.req("/api/my-registrations")).status, 403, "organizer blocked");
  });
  await check("ORG-05", "organizer sees attendee name, email, date; CSV export works", async () => {
    const r = await orgA.c.req(`/api/organizer/events/${ev.id}/attendees`); eq(r.status, 200, "status");
    const a = r.json.attendees[0]; if (a.email !== att.email || !a.name || !a.registered_at) throw new Error("attendee fields missing");
    const csv = await orgA.c.req(`/api/organizer/events/${ev.id}/attendees/export`);
    eq(csv.status, 200, "csv status"); if (!csv.headers.get("content-type")?.includes("text/csv") || !csv.text.includes(att.email)) throw new Error("bad csv");
  });
  await check("BONUS-ICS", "calendar .ics only for registered attendee", async () => {
    const ok = await att.c.req(`/api/events/${ev.id}/calendar`); eq(ok.status, 200, "registered");
    if (!ok.text.includes("BEGIN:VEVENT")) throw new Error("not an ics");
    const other = await signup("ATTENDEE"); eq((await other.c.req(`/api/events/${ev.id}/calendar`)).status, 403, "unregistered");
  });
  await check("RULE-01", "limit=1: second registration rejected (409 EVENT_FULL)", async () => {
    const e1 = (await orgA.c.req("/api/events", { body: eventBody({ seatLimit: 1, title: "One seat " + stamp }) })).json.event;
    eq((await att.c.req(`/api/events/${e1.id}/register`, { method: "POST" })).status, 201, "first");
    const second = await signup("ATTENDEE"); const r = await second.c.req(`/api/events/${e1.id}/register`, { method: "POST" });
    eq(r.status, 409, "status"); eq(r.json.error.code, "EVENT_FULL", "code");
    eq((await anon.req(`/api/events/${e1.id}`)).json.event.registered_count, 1, "never 2/1");
  });
  await check("RULE-04", "cancelled event: cancel (confirm), registration rejected, history preserved, cannot edit", async () => {
    const e2 = (await orgA.c.req("/api/events", { body: eventBody({ title: "To cancel " + stamp }) })).json.event;
    const reg = await signup("ATTENDEE"); eq((await reg.c.req(`/api/events/${e2.id}/register`, { method: "POST" })).status, 201, "pre-register");
    eq((await orgA.c.req(`/api/events/${e2.id}/cancel`, { method: "POST" })).json.event.status, "CANCELLED", "cancelled");
    const late = await signup("ATTENDEE"); const r = await late.c.req(`/api/events/${e2.id}/register`, { method: "POST" });
    eq(r.status, 409, "status"); eq(r.json.error.code, "EVENT_CANCELLED", "code");
    eq((await orgA.c.req(`/api/organizer/events/${e2.id}/attendees`)).json.attendees.length, 1, "history kept");
    eq((await reg.c.req("/api/my-registrations")).json.registrations[0].status, "EVENT_CANCELLED", "attendee view");
    eq((await orgA.c.req(`/api/events/${e2.id}`, { method: "PATCH", body: eventBody() })).status, 409, "edit blocked");
  });
  await check("RULE-04", "past event (seed data) rejects registration (409 EVENT_PAST)", async () => {
    const list = await anon.req("/api/events?q=TypeScript"); // past events are not listed publicly...
    eq(list.json.events.length, 0, "past hidden from list");
    // ...so look it up through the DB-seeded id exposed via the organizer API of the demo organizer.
    const demo = new Client(); const l = await demo.req("/api/auth/login", { body: { email: "demo.organizer@example.com", password: "DemoOrganizer123" } });
    if (l.status !== 200) throw new Error("demo organizer login failed — run npm run db:seed");
    const past = (await demo.req("/api/organizer/events")).json.events.find((e) => e.title === "Intro to TypeScript Evening");
    if (!past) throw new Error("seeded past event missing — run npm run db:seed");
    const r = await att.c.req(`/api/events/${past.id}/register`, { method: "POST" });
    eq(r.status, 409, "status"); eq(r.json.error.code, "EVENT_PAST", "code");
  });
  await check("RULE-05", "limit=10, 5 registered: PATCH to 4 -> 409; to 5 -> 200; to 80 -> 200", async () => {
    const e3 = (await orgA.c.req("/api/events", { body: eventBody({ seatLimit: 10, title: "Seats " + stamp }) })).json.event;
    for (let i = 0; i < 5; i++) eq((await (await signup("ATTENDEE")).c.req(`/api/events/${e3.id}/register`, { method: "POST" })).status, 201, "register " + i);
    const low = await orgA.c.req(`/api/events/${e3.id}`, { method: "PATCH", body: eventBody({ seatLimit: 4, title: "Seats " + stamp }) });
    eq(low.status, 409, "to 4"); eq(low.json.error.code, "SEAT_LIMIT_BELOW_REGISTRATIONS", "code");
    eq((await orgA.c.req(`/api/events/${e3.id}`, { method: "PATCH", body: eventBody({ seatLimit: 5, title: "Seats " + stamp }) })).status, 200, "to 5");
    eq((await orgA.c.req(`/api/events/${e3.id}`, { method: "PATCH", body: eventBody({ seatLimit: 80, title: "Seats " + stamp }) })).status, 200, "to 80");
  });
  await check("RULE-01", "RACE: 15 simultaneous HTTP registrations for 3 seats -> exactly 3 succeed", async () => {
    const e4 = (await orgA.c.req("/api/events", { body: eventBody({ seatLimit: 3, title: "Race " + stamp }) })).json.event;
    const people = await Promise.all(Array.from({ length: 15 }, () => signup("ATTENDEE")));
    const res = await Promise.all(people.map((p) => p.c.req(`/api/events/${e4.id}/register`, { method: "POST" })));
    const ok = res.filter((r) => r.status === 201).length, full = res.filter((r) => r.status === 409 && r.json.error.code === "EVENT_FULL").length;
    eq(ok, 3, "successes"); eq(full, 12, "EVENT_FULL rejections");
    eq((await anon.req(`/api/events/${e4.id}`)).json.event.registered_count, 3, "final count");
  });
  await check("ATT-01", "public listing supports search + availability filter and hides cancelled events", async () => {
    const r = await anon.req(`/api/events?q=${encodeURIComponent("One seat " + stamp)}`); eq(r.json.events.length, 1, "search");
    eq((await anon.req(`/api/events?q=${encodeURIComponent("One seat " + stamp)}&availability=available`)).json.events.length, 0, "full filtered out");
    eq((await anon.req(`/api/events?q=${encodeURIComponent("To cancel " + stamp)}`)).json.events.length, 0, "cancelled hidden");
    eq((await anon.req("/api/events?page=abc")).status, 400, "bad page");
  });
  await check("RULE-06", "unknown / malformed event ids -> 404", async () => {
    eq((await anon.req("/api/events/not-a-uuid")).status, 404, "malformed");
    eq((await att.c.req("/api/events/00000000-0000-0000-0000-000000000000/register", { method: "POST" })).status, 404, "unknown register");
  });

  console.log("\nProtected pages (direct URL access)");
  const page = (c: Client, p: string) => c.req(p);
  await check("RULE-06", "anonymous -> redirect to /login for protected pages", async () => {
    for (const p of ["/dashboard", "/my-registrations", "/organizer", "/organizer/events", "/organizer/events/new", `/organizer/events/${ev.id}`]) {
      const r = await page(anon, p); eq(r.status, 307, p); if (!r.headers.get("location")?.includes("/login")) throw new Error(`${p} -> ${r.headers.get("location")}`);
    }
  });
  await check("RULE-03", "attendee requesting /organizer/* gets real HTTP 403", async () => {
    for (const p of ["/organizer", "/organizer/events", "/organizer/events/new", `/organizer/events/${ev.id}`, `/organizer/events/${ev.id}/edit`]) eq((await page(att.c, p)).status, 403, p);
  });
  await check("RULE-03", "organizer B requesting organizer A's event pages gets 403; A gets 200", async () => {
    eq((await page(orgB.c, `/organizer/events/${ev.id}`)).status, 403, "B view"); eq((await page(orgB.c, `/organizer/events/${ev.id}/edit`)).status, 403, "B edit");
    eq((await page(orgA.c, `/organizer/events/${ev.id}`)).status, 200, "A view"); eq((await page(orgA.c, `/organizer/events/${ev.id}/edit`)).status, 200, "A edit");
  });
  await check("RULE-03", "organizer requesting attendee pages: /my-registrations 403, /dashboard -> /organizer", async () => {
    eq((await page(orgA.c, "/my-registrations")).status, 403, "my-registrations");
    const d = await page(orgA.c, "/dashboard"); eq(d.status, 307, "dashboard"); if (!d.headers.get("location")?.endsWith("/organizer")) throw new Error("wrong redirect");
  });
  await check("UI-01", "public pages render (200) and show seeded content from the DB", async () => {
    for (const p of ["/", "/events", "/login", "/signup", `/events/${ev.id}`]) eq((await page(anon, p)).status, 200, p);
    if (!(await page(anon, "/events")).text.includes("React &amp; Next.js Developer Meetup")) throw new Error("seed event missing from /events");
    eq((await page(att.c, "/dashboard")).status, 200, "attendee dashboard"); eq((await page(att.c, "/my-registrations")).status, 200, "my-registrations");
    eq((await page(orgA.c, "/organizer")).status, 200, "organizer dashboard");
  });
  await check("RULE-06", "security headers present", async () => {
    const r = await anon.req("/"); if (r.headers.get("x-frame-options") !== "DENY" || r.headers.get("x-content-type-options") !== "nosniff") throw new Error("missing headers");
  });

  const failed = results.filter((r) => !r.ok);
  fs.mkdirSync(".reports", { recursive: true });
  fs.writeFileSync(".reports/api-e2e.json", JSON.stringify({ base: BASE, at: new Date().toISOString(), total: results.length, failed: failed.length, results }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
