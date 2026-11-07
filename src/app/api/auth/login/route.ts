import { NextResponse } from "next/server";
import { route, readJson, parseWith } from "@/lib/http";
import { loginSchema } from "@/lib/validation/schemas";
import { authenticate } from "@/server/services/auth.service";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export const POST = route(
  async (req) => {
    const input = parseWith(loginSchema, await readJson(req));
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const user = await authenticate(input, ip);
    const { token, expires } = await createSession(user.id);
    await setSessionCookie(token, expires);
    return NextResponse.json({ user });
  },
  { mutation: true },
);
