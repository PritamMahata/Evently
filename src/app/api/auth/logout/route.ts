import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import { clearSession } from "@/lib/auth/session";

export const POST = route(
  async () => {
    await clearSession();
    return NextResponse.json({ ok: true });
  },
  { mutation: true },
);
