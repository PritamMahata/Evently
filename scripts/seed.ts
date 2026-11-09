import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
// Migrations and seeding use the direct (non-pooled) connection when one is provided.
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;
import { closePool, queryOne, query } from "@/lib/db/pool";
import { runMigrations } from "@/lib/db/migrate";
import { hashPassword } from "@/lib/auth/password";
import type { Role } from "@/types";

/** Demo credentials (fictional, throwaway). Documented in README. */
export const DEMO = {
  organizer: {
    name: "Demo Organizer",
    email: "demo.organizer@example.com",
    password: "DemoOrganizer123",
  },
  organizer2: {
    name: "Second Organizer",
    email: "second.organizer@example.com",
    password: "DemoOrganizer123",
  },
  attendee: {
    name: "Demo Attendee",
    email: "demo.attendee@example.com",
    password: "DemoAttendee123",
  },
};

const FICTIONAL_ATTENDEES = [
  "Priya Nair",
  "Marco Silva",
  "Hana Kim",
  "Omar Haddad",
  "Lena Fischer",
  "Tomás Rivera",
  "Aisha Khan",
  "Noah Bennett",
];

async function upsertUser(
  name: string,
  email: string,
  password: string,
  role: Role,
) {
  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM users WHERE lower(email) = lower($1)",
    [email],
  );
  if (existing) return existing.id;
  const row = await queryOne<{ id: string }>(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id",
    [name, email, await hashPassword(password), role],
  );
  return row!.id;
}

interface SeedEvent {
  title: string;
  description: string;
  venue: string;
  seats: number;
  days: number;
  time: string;
  organizer: string;
  cancelled?: boolean;
  registrations: number;
}

async function main() {
  await runMigrations();
  const org = await upsertUser(
    DEMO.organizer.name,
    DEMO.organizer.email,
    DEMO.organizer.password,
    "ORGANIZER",
  );
  const org2 = await upsertUser(
    DEMO.organizer2.name,
    DEMO.organizer2.email,
    DEMO.organizer2.password,
    "ORGANIZER",
  );
  const demoAttendee = await upsertUser(
    DEMO.attendee.name,
    DEMO.attendee.email,
    DEMO.attendee.password,
    "ATTENDEE",
  );
  const people: string[] = [];
  for (const [i, name] of FICTIONAL_ATTENDEES.entries())
    people.push(
      await upsertUser(
        name,
        `attendee${i + 1}@example.com`,
        "SeedAttendee123",
        "ATTENDEE",
      ),
    );

  const events: SeedEvent[] = [
    {
      title: "React & Next.js Developer Meetup",
      description:
        "An evening of lightning talks on the App Router, server components and real-world performance wins. Pizza and networking afterwards.",
      venue: "Lantern Hall, Riverside Campus",
      seats: 60,
      days: 7,
      time: "18:30",
      organizer: org,
      registrations: 4,
    },
    {
      title: "AI Workshop: Building with LLMs",
      description:
        "A hands-on workshop covering prompt design, retrieval, evaluation and shipping a small AI feature. Bring a laptop.",
      venue: "Innovation Lab, 3rd Floor",
      seats: 40,
      days: 12,
      time: "10:00",
      organizer: org,
      registrations: 6,
    },
    {
      title: "Startup Networking Night",
      description:
        "Meet founders, designers and engineers from the local startup community. Short pitches followed by open networking.",
      venue: "The Foundry Café",
      seats: 80,
      days: 5,
      time: "19:00",
      organizer: org,
      registrations: 3,
    },
    {
      title: "Open Source Hackathon",
      description:
        "A full-day hackathon to contribute to open-source projects. Mentors will be available to help you land your first pull request.",
      venue: "Commons Coworking Space",
      seats: 100,
      days: 21,
      time: "09:00",
      organizer: org,
      registrations: 2,
    },
    {
      title: "Web Development Masterclass",
      description:
        "A deep dive into accessible, fast and maintainable web apps: semantic HTML, CSS architecture, testing and deployment.",
      venue: "Summit Conference Centre, Room 4",
      seats: 30,
      days: 30,
      time: "13:00",
      organizer: org2,
      registrations: 1,
    },
    {
      title: "Design Systems Roundtable",
      description:
        "A small, discussion-led session on building and governing design systems. Limited seats so everyone gets to speak.",
      venue: "Studio Nine",
      seats: 5,
      days: 9,
      time: "17:30",
      organizer: org2,
      registrations: 5,
    },
    {
      title: "Cloud Cost Clinic",
      description:
        "Bring your cloud bill and get practical tips for cutting costs. This session has been cancelled.",
      venue: "Online / Video Call",
      seats: 25,
      days: 14,
      time: "15:00",
      organizer: org2,
      cancelled: true,
      registrations: 2,
    },
    {
      title: "Intro to TypeScript Evening",
      description:
        "A relaxed beginner evening introducing types, generics and tooling. This event has already taken place.",
      venue: "Lantern Hall, Riverside Campus",
      seats: 30,
      days: -20,
      time: "18:00",
      organizer: org,
      registrations: 3,
    },
  ];

  let created = 0;
  for (const e of events) {
    const exists = await queryOne<{ id: string }>(
      "SELECT id FROM events WHERE organizer_id = $1 AND title = $2",
      [e.organizer, e.title],
    );
    if (exists) continue;
    // Past event is inserted directly: the API rightly refuses to create events in the past.
    const row = await queryOne<{ id: string }>(
      `INSERT INTO events (organizer_id, title, description, event_date, event_time, venue, seat_limit)
       VALUES ($1,$2,$3, (now() AT TIME ZONE $8)::date + $4::int, $5, $6, $7) RETURNING id`,
      [
        e.organizer,
        e.title,
        e.description,
        e.days,
        e.time,
        e.venue,
        e.seats,
        process.env.APP_TIMEZONE || "UTC",
      ],
    );
    const pool = [...people];
    for (let i = 0; i < e.registrations; i++)
      await query(
        "INSERT INTO registrations (event_id, attendee_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [row!.id, pool[i % pool.length]],
      );
    if (e.cancelled)
      await query("UPDATE events SET status='CANCELLED' WHERE id=$1", [
        row!.id,
      ]);
    created++;
  }
  // The demo attendee is pre-registered for one upcoming event so "My registrations" is not empty.
  const meetup = await queryOne<{ id: string }>(
    "SELECT id FROM events WHERE title = 'React & Next.js Developer Meetup'",
  );
  if (meetup)
    await query(
      "INSERT INTO registrations (event_id, attendee_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [meetup.id, demoAttendee],
    );

  console.log(`Seed complete: ${created} new event(s). Demo logins:`);
  console.log(`  organizer: ${DEMO.organizer.email}`);
  console.log(`  attendee:  ${DEMO.attendee.email}`);
  console.log("  (passwords are listed in README.md)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(closePool);
