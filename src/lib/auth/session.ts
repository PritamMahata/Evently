import crypto from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { query, queryOne } from "@/lib/db/pool";
import { getEnv } from "@/lib/env";
import type { Role, SessionUser } from "@/types";

export const SESSION_COOKIE = "evently_session";
const SESSION_DAYS = 7;

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

/** Creates a DB-backed session and returns the raw token (stored only in the cookie). */
export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [userId, sha256(token), expires]);
  // Opportunistic cleanup of expired sessions.
  await query("DELETE FROM sessions WHERE expires_at < now()");
  return { token, expires };
}

export async function setSessionCookie(token: string, expires: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().isProd,
    path: "/",
    expires,
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
  jar.delete(SESSION_COOKIE);
}

/** Resolves the logged-in user from the HTTP-only cookie. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await queryOne<{ id: string; name: string; email: string; role: Role; email_confirmed_at: Date | null }>(
    `SELECT u.id, u.name, u.email, u.role, u.email_confirmed_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  );
  return row;
});
