import { NextResponse } from "next/server";
import { route, type IdCtx } from "@/lib/http";
import { cancelEvent } from "@/server/services/events.service";
import { getSessionUser } from "@/lib/auth/session";

export const POST = route<IdCtx>(
  async (_req, { params }) => {
    const event = await cancelEvent(await getSessionUser(), (await params).id);
    return NextResponse.json({ event });
  },
  { mutation: true },
);
