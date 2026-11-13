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
  deadline: string;
  organizer: string;
  cancelled?: boolean;
  registrations: number;
  banner_url: string;
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
      deadline: "2026-11-19T17:00:00+05:30",
      organizer: org,
      registrations: 4,
      banner_url:
        "https://res.cloudinary.com/dz5o4me4n/image/upload/v1794211231/ec815715-bd4d-4a81-bf76-047e30b46fb5.png",
    },
    {
      title: "AI Workshop: Building with LLMs",
      description:
        "A hands-on workshop covering prompt design, retrieval, evaluation and shipping a small AI feature. Bring a laptop.",
      venue: "Innovation Lab, 3rd Floor",
      seats: 40,
      days: 12,
      time: "10:00",
      deadline: "2026-11-24T17:00:00+05:30",
      organizer: org,
      registrations: 6,
      banner_url:
        "https://res.cloudinary.com/dz5o4me4n/image/upload/v1794211227/d39ea38d-3832-42fe-985b-bf80e178f4dc.png",
    },
    {
      title: "Startup Networking Night",
      description:
        "Meet founders, designers and engineers from the local startup community. Short pitches followed by open networking.",
      venue: "The Foundry Café",
      seats: 80,
      days: 5,
      time: "19:00",
      deadline: "2026-11-17T17:00:00+05:30",
      organizer: org,
      registrations: 3,
      banner_url:
        "https://res.cloudinary.com/dz5o4me4n/image/upload/v1794211506/feb92f5a-c88f-444e-9546-ff2a3da6b7f2.png",
    },
    {
      title: "Open Source Hackathon",
      description:
        "A full-day hackathon to contribute to open-source projects. Mentors will be available to help you land your first pull request.",
      venue: "Commons Coworking Space",
      seats: 100,
      days: 21,
      time: "09:00",
      deadline: "2026-12-03T17:00:00+05:30",
      organizer: org,
      registrations: 2,
      banner_url:
        "https://res.cloudinary.com/dz5o4me4n/image/upload/v1794211227/bca23ec2-1a7d-4636-8f73-feb9fe825bd0.png",
    },
    {
      title: "Web Development Masterclass",
      description:
        "A deep dive into accessible, fast and maintainable web apps: semantic HTML, CSS architecture, testing and deployment.",
      venue: "Summit Conference Centre, Room 4",
      seats: 30,
      days: 30,
      time: "13:00",
      deadline: "2026-12-12T17:00:00+05:30",
      organizer: org2,
      registrations: 1,
      banner_url:
        "https://res.cloudinary.com/dz5o4me4n/image/upload/v1794211227/c0c9bc0f-8f26-42a4-85b0-e69d0cdae533.png",
    },
    {
      title: "Design Systems Roundtable",
      description:
        "A small, discussion-led session on building and governing design systems. Limited seats so everyone gets to speak.",
      venue: "Studio Nine",
      seats: 5,
      days: 9,
      time: "17:30",
      deadline: "2026-11-21T17:00:00+05:30",
      organizer: org2,
      registrations: 5,
      banner_url:
        "https://res.cloudinary.com/dz5o4me4n/image/upload/v1794211419/535293a3-1bcd-4a0c-a8e7-010111f5a304.png",
    },
    {
      title: "Cloud Cost Clinic",
      description:
        "Bring your cloud bill and get practical tips for cutting costs. This session has been cancelled.",
      venue: "Online / Video Call",
      seats: 25,
      days: 14,
      time: "15:00",
      deadline: "2026-11-25T17:00:00+05:30",
      organizer: org2,
      cancelled: true,
      registrations: 2,
      banner_url:
        "https://res.cloudinary.com/dz5o4me4n/image/upload/v1794211227/0955e5a8-eb1b-439b-86b1-f75ec09e0eb8.png",
    },
    {
      title: "Intro to TypeScript Evening",
      description:
        "A relaxed beginner evening introducing types, generics and tooling. This event has already taken place.",
      venue: "Lantern Hall, Riverside Campus",
      seats: 30,
      days: -20,
      time: "18:00",
      deadline: "2026-10-23T17:00:00+05:30",
      organizer: org,
      registrations: 3,
      banner_url:
        "https://res.cloudinary.com/dz5o4me4n/image/upload/v1794211227/66c8433d-335b-4380-92f0-14f5f3bc3877.png",
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
      `INSERT INTO events (
     organizer_id,
     title,
     description,
     event_date,
     event_time,
     event_deadline,
     venue,
     seat_limit,
     banner_url
   )
   VALUES (
     $1,
     $2,
     $3,
     (now() AT TIME ZONE $8)::date + $4::int,
     $5,
     $7::timestamptz,
     $6,
     $9,
     $10
   )
   RETURNING id`,
      [
        e.organizer, // $1
        e.title, // $2
        e.description, // $3
        e.days, // $4
        e.time, // $5
        e.venue, // $6
        e.deadline, // $7
        process.env.APP_TIMEZONE || "UTC", // $8
        e.seats, // $9
        e.banner_url, // $10
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
