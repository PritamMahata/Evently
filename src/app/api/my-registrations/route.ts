import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import {
  listMyRegistrations,
  registrationStatus,
} from "@/server/services/registrations.service";
import { getSessionUser } from "@/lib/auth/session";

export const GET = route(async () => {
  const regs = await listMyRegistrations(await getSessionUser());
  return NextResponse.json({
    registrations: regs.map((r) => ({
      ...r,
      status: registrationStatus(r.event),
    })),
  });
});
