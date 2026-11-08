import { NextResponse } from "next/server";
import { route, readJson, parseWith } from "@/lib/http";
import { eventFiltersSchema, eventSchema } from "@/lib/validation/schemas";
import {
  createEvent,
  listUpcomingEvents,
} from "@/server/services/events.service";
import { getSessionUser } from "@/lib/auth/session";

export const GET = route(async (req) => {
  const filters = parseWith(
    eventFiltersSchema,
    Object.fromEntries(req.nextUrl.searchParams),
  );
  return NextResponse.json(await listUpcomingEvents(filters));
});

export const POST = route(
  async (req) => {
    const user = await getSessionUser();
    // Organizer id is taken from the session, never from the request body.
    const event = await createEvent(
      user,
      parseWith(eventSchema, await readJson(req)),
    );
    return NextResponse.json({ event }, { status: 201 });
  },
  { mutation: true },
);
