import { NextResponse } from "next/server";
import { route, readJson, parseWith } from "@/lib/http";
import { signupSchema } from "@/lib/validation/schemas";
import { signupUser } from "@/server/services/auth.service";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export const POST = route(
  async (req) => {
    const input = parseWith(signupSchema, await readJson(req));
    const user = await signupUser(input, { autoConfirm: false });
    const { token, expires } = await createSession(user.id);
    await setSessionCookie(token, expires);
    return NextResponse.json({ user }, { status: 201 });
  },
  { mutation: true },
);
