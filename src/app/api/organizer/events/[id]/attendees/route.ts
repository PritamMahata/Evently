import { NextResponse } from "next/server";
import { route, type IdCtx } from "@/lib/http";
import { getOrganizerEventWithAttendees } from "@/server/services/events.service";
import { getSessionUser } from "@/lib/auth/session";

export const GET = route<IdCtx>(async (_req, { params }) => {
  const { event, attendees } = await getOrganizerEventWithAttendees(
    await getSessionUser(),
    (await params).id,
  );
  return NextResponse.json({ event, attendees });
});
