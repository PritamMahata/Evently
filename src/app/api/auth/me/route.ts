import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import { getSessionUser } from "@/lib/auth/session";

export const GET = route(async () =>
  NextResponse.json({ user: await getSessionUser() }),
);
