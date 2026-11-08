import { NextResponse } from "next/server";
import { route, readJson, parseWith, type IdCtx } from "@/lib/http";
import { eventSchema } from "@/lib/validation/schemas";
import { getEvent, updateEvent } from "@/server/services/events.service";
import { getSessionUser } from "@/lib/auth/session";

export const GET = route<IdCtx>(async (_req, { params }) =>
  NextResponse.json({ event: await getEvent((await params).id) }),
);

export const PATCH = route<IdCtx>(
  async (req, { params }) => {
    const user = await getSessionUser();
    const event = await updateEvent(
      user,
      (await params).id,
      parseWith(eventSchema, await readJson(req)),
    );
    return NextResponse.json({ event });
  },
  { mutation: true },
);
