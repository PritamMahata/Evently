import { NextResponse } from "next/server";
import { route, type IdCtx } from "@/lib/http";
import { cancelRsvp, registerForEvent } from "@/server/services/registrations.service";
import { getSessionUser } from "@/lib/auth/session";

export const POST = route<IdCtx>(
  async (_req, { params }) => {
    const result = await registerForEvent(
      await getSessionUser(),
      (await params).id,
    );
    return NextResponse.json(result, { status: 201 });
  },
  { mutation: true },
);

export const DELETE = route<IdCtx>(
  async (_req, { params }) => {
    const result = await cancelRsvp(
      await getSessionUser(),
      (await params).id,
    );
    return NextResponse.json(result);
  },
  { mutation: true },
);
