import { NextResponse, type NextRequest } from "next/server";
import { route, readJson } from "@/lib/http";
import { confirmUserEmail } from "@/server/services/auth.service";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

export const POST = route(
  async (req) => {
    const body = (await readJson(req).catch(() => ({}))) as { token?: string };
    const token = body.token?.trim();
    if (!token) {
      throw new AppError("INVALID_TOKEN", "Confirmation token is required.");
    }

    const user = await confirmUserEmail(token);
    const { token: sessionToken, expires } = await createSession(user.id);
    await setSessionCookie(sessionToken, expires);

    return NextResponse.json({ ok: true, user });
  },
  { mutation: true },
);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(new URL("/confirm-email?error=missing_token", req.url));
  }

  try {
    const user = await confirmUserEmail(token);
    const { token: sessionToken, expires } = await createSession(user.id);
    await setSessionCookie(sessionToken, expires);
    return NextResponse.redirect(new URL("/confirm-email?status=success", req.url));
  } catch (err) {
    const code = err instanceof AppError ? err.code.toLowerCase() : "invalid_token";
    return NextResponse.redirect(new URL(`/confirm-email?error=${code}`, req.url));
  }
}

