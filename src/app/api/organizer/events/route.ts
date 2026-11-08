import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import { listOrganizerEvents } from "@/server/services/events.service";
import { getSessionUser } from "@/lib/auth/session";

export const GET = route(async () =>
  NextResponse.json({
    events: await listOrganizerEvents(await getSessionUser()),
  }),
);
