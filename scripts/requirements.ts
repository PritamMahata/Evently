/** Single source of truth for the requirement matrix. Statuses are computed from real evidence, never hard-coded. */
import fs from "fs";
import { execSync } from "child_process";
import { query } from "@/lib/db/pool";

export type Status = "PASS" | "FAIL" | "MANUAL";
export interface Req {
  id: string;
  group: string;
  title: string;
  impl: string;
  test: string;
  bonus?: boolean;
  manual?: string; // when set the item can't be automated -> MANUAL
  check?: (ctx: Ctx) => Promise<string | null> | string | null; // returns failure message, or null on success
}
export interface Ctx {
  e2e: (id: string) => string | null;
  unit: (pattern: RegExp) => string | null;
  file: (path: string, contains?: RegExp) => string | null;
  sql: (
    q: string,
    expect: (rows: Record<string, unknown>[]) => boolean,
    msg: string,
  ) => Promise<string | null>;
}

export function makeCtx(): Ctx {
  const read = (p: string) =>
    fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
  const e2e = read(".reports/api-e2e.json");
  const unit = read(".reports/vitest.json");
  const tests: { name: string; status: string }[] = unit
    ? unit.testResults.flatMap(
        (f: { assertionResults: { fullName: string; status: string }[] }) =>
          f.assertionResults.map((a) => ({
            name: a.fullName,
            status: a.status,
          })),
      )
    : [];
  return {
    e2e: (id) => {
      if (!e2e)
        return "no API e2e report (.reports/api-e2e.json) — run npm run test:api against a running server";
      const rs = e2e.results.filter((r: { id: string }) => r.id === id);
      if (!rs.length) return `no e2e checks tagged ${id}`;
      const bad = rs.filter((r: { ok: boolean }) => !r.ok);
      return bad.length
        ? `e2e failed: ${bad.map((b: { name: string }) => b.name).join("; ")}`
        : null;
    },
    unit: (re) => {
      if (!unit)
        return "no unit-test report (.reports/vitest.json) — run npm test";
      const m = tests.filter((t) => re.test(t.name));
      if (!m.length) return `no unit test matches ${re}`;
      const bad = m.filter((t) => t.status !== "passed");
      return bad.length ? `unit test failed: ${bad[0].name}` : null;
    },
    file: (p, contains) =>
      !fs.existsSync(p)
        ? `missing file ${p}`
        : contains && !contains.test(fs.readFileSync(p, "utf8"))
          ? `${p} does not match ${contains}`
          : null,
    sql: async (q, expect, msg) => {
      try {
        return expect(await query(q)) ? null : msg;
      } catch (e) {
        return `db error: ${(e as Error).message}`;
      }
    },
  };
}

const first = (...r: (string | null)[]) => r.find((x) => x) ?? null;

export const REQUIREMENTS: Req[] = [
  {
    id: "AUTH-01",
    group: "Authentication",
    title: "Signup (attendee / organizer, validated)",
    impl: "src/app/api/auth/signup, auth.service.ts, auth-forms.tsx",
    test: "tests/auth.test.ts; api-e2e (AUTH-01)",
    check: (c) => first(c.unit(/AUTH-01/), c.e2e("AUTH-01")),
  },
  {
    id: "AUTH-02",
    group: "Authentication",
    title: "Login (+ invalid credentials, rate limit)",
    impl: "src/app/api/auth/login, auth.service.ts",
    test: "tests/auth.test.ts; api-e2e (AUTH-02)",
    check: (c) =>
      first(
        c.unit(/AUTH-02/),
        c.unit(/invalid credentials/),
        c.unit(/rate-limits/),
        c.e2e("AUTH-02"),
      ),
  },
  {
    id: "AUTH-03",
    group: "Authentication",
    title: "Logout (server-side session invalidation)",
    impl: "src/app/api/auth/logout, lib/auth/session.ts",
    test: "api-e2e (AUTH-03)",
    check: (c) => c.e2e("AUTH-03"),
  },
  {
    id: "AUTH-04",
    group: "Authentication",
    title: "Password hashing + HTTP-only session cookie",
    impl: "lib/auth/password.ts (bcrypt), lib/auth/session.ts",
    test: "tests/auth.test.ts; api-e2e (AUTH-04)",
    check: (c) => first(c.unit(/AUTH-04/), c.e2e("AUTH-04")),
  },
  {
    id: "ORG-01",
    group: "Organizer",
    title: "Create event",
    impl: "events.service.createEvent, POST /api/events, event-form.tsx",
    test: "tests/events.test.ts; api-e2e (ORG-01)",
    check: (c) => first(c.unit(/ORG-01/), c.e2e("ORG-01")),
  },
  {
    id: "ORG-02",
    group: "Organizer",
    title: "Edit own event",
    impl: "events.service.updateEvent, PATCH /api/events/:id",
    test: "tests/events.test.ts; api-e2e (ORG-02)",
    check: (c) => first(c.unit(/ORG-02/), c.e2e("ORG-02")),
  },
  {
    id: "ORG-03",
    group: "Organizer",
    title: "Cancel own event (confirmation dialog, history kept)",
    impl: "events.service.cancelEvent, cancel-event-button.tsx",
    test: "tests/events.test.ts; tests/registrations.test.ts; api-e2e",
    check: (c) =>
      first(
        c.unit(/ORG-03/),
        c.unit(/cancelling keeps existing registrations/),
        c.e2e("RULE-04"),
      ),
  },
  {
    id: "ORG-04",
    group: "Organizer",
    title: "View only own events (+ seats taken/remaining)",
    impl: "events.service.listOrganizerEvents, /organizer/events",
    test: "tests/events.test.ts; api-e2e (ORG-04)",
    check: (c) =>
      first(c.unit(/lists only the organizer's own events/), c.e2e("ORG-04")),
  },
  {
    id: "ORG-05",
    group: "Organizer",
    title: "View attendee list of own event",
    impl: "events.service.getOrganizerEventWithAttendees, /organizer/events/[id]",
    test: "tests/registrations.test.ts; api-e2e (ORG-05)",
    check: (c) => first(c.unit(/ATT-02/), c.e2e("ORG-05")),
  },
  {
    id: "ATT-01",
    group: "Attendee",
    title: "Browse upcoming events / view details",
    impl: "/events, /events/[id], listUpcomingEvents",
    test: "api-e2e (ATT-01, UI-01)",
    check: (c) => first(c.e2e("ATT-01"), c.e2e("UI-01")),
  },
  {
    id: "ATT-02",
    group: "Attendee",
    title: "Register for an event",
    impl: "registrations.service.registerForEvent, register-button.tsx",
    test: "tests/registrations.test.ts; api-e2e (ATT-02)",
    check: (c) => first(c.unit(/ATT-02/), c.e2e("ATT-02")),
  },
  {
    id: "ATT-03",
    group: "Attendee",
    title: "View my registrations",
    impl: "/my-registrations, /dashboard, GET /api/my-registrations",
    test: "api-e2e (ATT-03)",
    check: (c) => c.e2e("ATT-03"),
  },
  {
    id: "RULE-01",
    group: "Business rules",
    title: "Seat limit never exceeded (incl. concurrent requests)",
    impl: "SELECT … FOR UPDATE in registerForEvent + DB trigger enforce_registration_rules",
    test: "tests/registrations.test.ts (RULE-01, OVERBOOKING); api-e2e race",
    check: (c) =>
      first(
        c.unit(/RULE-01 limit=1/),
        c.unit(/OVERBOOKING: 25 simultaneous/),
        c.unit(/OVERBOOKING: the DB trigger alone/),
        c.e2e("RULE-01"),
      ),
  },
  {
    id: "RULE-02",
    group: "Business rules",
    title: "One registration per attendee per event",
    impl: "UNIQUE(event_id, attendee_id) + friendly 409",
    test: "tests/registrations.test.ts; api-e2e (RULE-02)",
    check: (c) => first(c.unit(/RULE-02/), c.e2e("RULE-02")),
  },
  {
    id: "RULE-03",
    group: "Business rules",
    title: "Ownership + role enforcement (403)",
    impl: "lib/permissions, services take actor from session, layouts call forbidden()",
    test: "tests/events.test.ts; api-e2e (RULE-03)",
    check: (c) => first(c.unit(/RULE-03/), c.e2e("RULE-03")),
  },
  {
    id: "RULE-04",
    group: "Business rules",
    title: "Future dates only; no registration for past/cancelled",
    impl: "isFuture() in events.service, checks in registerForEvent, trigger",
    test: "tests/events.test.ts; tests/registrations.test.ts; api-e2e (RULE-04)",
    check: (c) =>
      first(
        c.unit(/RULE-04/),
        c.unit(/rejects registration for past events/),
        c.unit(/cancelled events/),
        c.e2e("RULE-04"),
      ),
  },
  {
    id: "RULE-05",
    group: "Business rules",
    title: "Seat limit cannot drop below registrations",
    impl: "updateEvent (locked count check) + trigger enforce_seat_limit_change",
    test: "tests/registrations.test.ts (RULE-05); api-e2e",
    check: (c) => first(c.unit(/RULE-05/), c.e2e("RULE-05")),
  },
  {
    id: "RULE-06",
    group: "Business rules",
    title: "Backend enforcement without the UI (direct API/URL calls, CSRF)",
    impl: "all rules live in services/DB; route wrapper checks Origin",
    test: "api-e2e (RULE-06)",
    check: (c) => c.e2e("RULE-06"),
  },
  {
    id: "DB-01",
    group: "Database",
    title: "PostgreSQL persistence with required tables",
    impl: "db/migrations/001_init.sql",
    test: "verify:requirements (live schema inspection)",
    check: (c) =>
      c.sql(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
        (r) =>
          ["users", "events", "registrations", "sessions"].every((t) =>
            r.some((x) => x.table_name === t),
          ),
        "required tables missing — run npm run db:migrate",
      ),
  },
  {
    id: "DB-02",
    group: "Database",
    title: "Unique, FK and CHECK constraints + triggers exist",
    impl: "001_init.sql",
    test: "verify:requirements (live schema inspection)",
    check: async (c) =>
      first(
        await c.sql(
          "SELECT conname FROM pg_constraint WHERE conname='registrations_event_attendee_key'",
          (r) => r.length === 1,
          "UNIQUE(event_id, attendee_id) missing",
        ),
        await c.sql(
          "SELECT count(*)::int n FROM pg_constraint WHERE contype='f' AND conrelid::regclass::text IN ('events','registrations','sessions')",
          (r) => Number(r[0].n) === 4,
          "expected 4 foreign keys (events.organizer, registrations x2, sessions.user)",
        ),
        await c.sql(
          "SELECT tgname FROM pg_trigger WHERE NOT tgisinternal",
          (r) =>
            ["registrations_enforce_rules", "events_enforce_seat_limit"].every(
              (t) => r.some((x) => x.tgname === t),
            ),
          "overbooking triggers missing",
        ),
      ),
  },
  {
    id: "UI-01",
    group: "UI",
    title:
      "Responsive layout, mobile nav (Sheet), dark mode, shadcn/ui components (code + rendering)",
    impl: "components/layout/*, components/ui/*",
    test: "api-e2e (UI-01 renders); static checks",
    check: (c) =>
      first(
        c.e2e("UI-01"),
        c.file("src/components/layout/mobile-nav.tsx", /Sheet/),
        c.file("src/components/layout/theme-toggle.tsx", /setTheme/),
        c.file("src/components/events/event-card.tsx", /Card/),
      ),
  },
  {
    id: "UI-02",
    group: "UI",
    title: "Visual check at 320 / 375 / 768 / 1024 / 1440 px, light + dark",
    impl: "n/a",
    test: "browser review",
    manual:
      "Open the deployed app and resize/inspect each breakpoint (see docs/DEMO_VIDEO_SCRIPT.md).",
  },
  {
    id: "SEC-01",
    group: "Security",
    title: ".env not committed; .env.example has placeholders only",
    impl: ".gitignore, .env.example",
    test: "verify:requirements",
    check: (c) =>
      first(
        c.file(".gitignore", /^\.env$/m),
        c.file(".env.example", /your_database_url_here/),
        gitTracked(".env") ? ".env is tracked by git" : null,
      ),
  },
  {
    id: "SEC-02",
    group: "Security",
    title: "No obvious secrets in tracked source",
    impl: "scripts/secret-scan.ts",
    test: "verify:requirements",
    check: () => scanSecrets(),
  },
  {
    id: "DOC-01",
    group: "Documentation",
    title: "README + architecture/database/API/deployment docs + matrix",
    impl: "README.md, docs/*",
    test: "verify:requirements",
    check: (c) =>
      first(
        c.file("README.md", /## Business Rules/),
        c.file("README.md", /## Demo Accounts/),
        c.file("docs/ARCHITECTURE.md"),
        c.file("docs/DATABASE.md"),
        c.file("docs/API.md"),
        c.file("docs/DEPLOYMENT.md"),
        c.file("docs/DEMO_VIDEO_SCRIPT.md"),
      ),
  },
  {
    id: "DEMO-01",
    group: "Demo",
    title: "Seed script + demo accounts work",
    impl: "scripts/seed.ts",
    test: "api-e2e (demo organizer login)",
    check: (c) =>
      first(
        c.file("scripts/seed.ts", /demo\.organizer@example\.com/),
        c.e2e("RULE-04"),
      ),
  },
  {
    id: "DEP-01",
    group: "Manual",
    title: "Production deployment on Vercel + Supabase",
    impl: "docs/DEPLOYMENT.md",
    test: "-",
    manual: "Needs your Vercel/Supabase accounts. Follow docs/DEPLOYMENT.md.",
  },
  {
    id: "VIDEO-01",
    group: "Manual",
    title: "Demo video recorded",
    impl: "docs/DEMO_VIDEO_SCRIPT.md",
    test: "-",
    manual: "Record using the script.",
  },
  {
    id: "FORM-01",
    group: "Manual",
    title: "Official submission form completed",
    impl: "-",
    test: "-",
    manual: "Submit the deployed URL and repo as the assessment requires.",
  },
  {
    id: "BONUS-SEARCH",
    group: "Bonus",
    bonus: true,
    title: "Search + date/availability filters",
    impl: "/events, listUpcomingEvents",
    test: "api-e2e (ATT-01)",
    check: (c) => c.e2e("ATT-01"),
  },
  {
    id: "BONUS-DASH",
    group: "Bonus",
    bonus: true,
    title: "Organizer dashboard analytics",
    impl: "/organizer, getOrganizerStats",
    test: "api-e2e (UI-01)",
    check: (c) =>
      first(
        c.e2e("UI-01"),
        c.file("src/server/services/events.service.ts", /utilization/),
      ),
  },
  {
    id: "BONUS-CSV",
    group: "Bonus",
    bonus: true,
    title: "CSV attendee export",
    impl: "attendeesCsv, /api/organizer/events/:id/attendees/export",
    test: "api-e2e (ORG-05)",
    check: (c) => c.e2e("ORG-05"),
  },
  {
    id: "BONUS-ICS",
    group: "Bonus",
    bonus: true,
    title: "Calendar (.ics) export",
    impl: "registrationIcs, /api/events/:id/calendar",
    test: "tests/registrations.test.ts; api-e2e",
    check: (c) => first(c.unit(/calendar export/), c.e2e("BONUS-ICS")),
  },
];

function gitTracked(f: string) {
  try {
    return (
      execSync(`git ls-files --error-unmatch ${f}`, { stdio: "pipe" }) && true
    );
  } catch {
    return false;
  }
}

export function trackedFiles(): string[] {
  try {
    return execSync(
      "git ls-files && git ls-files --others --exclude-standard",
      { encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

const SECRET_PATTERNS: [RegExp, string][] = [
  [
    /postgres(ql)?:\/\/[^:\s"']+:(?!evently_local|password|\$\{|your_)[^@\s"']{6,}@/i,
    "database URL with password",
  ],
  [/(sk|pk)_(live|test)_[A-Za-z0-9]{16,}/, "payment key"],
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, "JWT"],
  [/AKIA[0-9A-Z]{16}/, "AWS key"],
  [/-----BEGIN (RSA |EC )?PRIVATE KEY-----/, "private key"],
  [
    /(api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{24,}["']/i,
    "hard-coded credential",
  ],
];
export function scanSecrets(): string | null {
  const hits: string[] = [];
  for (const f of trackedFiles()) {
    if (
      /node_modules|package-lock|\.lock$|\.png$|\.ico$/.test(f) ||
      !fs.existsSync(f)
    )
      continue;
    if (f === "scripts/requirements.ts") continue; // contains the patterns themselves
    const text = fs.readFileSync(f, "utf8");
    for (const [re, label] of SECRET_PATTERNS)
      if (re.test(text)) hits.push(`${f}: ${label}`);
  }
  return hits.length ? `possible secrets: ${hits.join("; ")}` : null;
}
