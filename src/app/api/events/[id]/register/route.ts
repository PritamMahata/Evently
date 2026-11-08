import { NextResponse } from "next/server";
import { route, type IdCtx } from "@/lib/http";
import { registerForEvent } from "@/server/services/registrations.service";
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
