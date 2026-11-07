import crypto from "crypto";
import { query, queryOne } from "@/lib/db/pool";
import { getEnv } from "@/lib/env";
import { AppError, mapDbError } from "@/lib/errors";
import { getDummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import type { LoginInput, SignupInput } from "@/lib/validation/schemas";
import type { Role, SessionUser } from "@/types";

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

export async function signupUser(input: SignupInput): Promise<SessionUser> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await queryOne<SessionUser>(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [input.name, input.email, passwordHash, input.role],
    );
    return user!;
  } catch (err) {
    mapDbError(err);
  }
}

function attemptKey(email: string, ip: string) {
  return crypto.createHmac("sha256", getEnv().authSecret || "dev").update(`${email}|${ip}`).digest("hex");
}

/** Verifies credentials with a DB-backed failed-attempt limit (5 per 15 minutes per email+IP). */
export async function authenticate(input: LoginInput, ip: string): Promise<SessionUser> {
  const key = attemptKey(input.email, ip);
  const recent = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM login_attempts WHERE key_hash = $1 AND created_at > now() - make_interval(mins => $2)`,
    [key, WINDOW_MINUTES],
  );
  if ((recent?.n ?? 0) >= MAX_FAILED_ATTEMPTS)
    throw new AppError("RATE_LIMITED", `Too many failed attempts. Try again in ${WINDOW_MINUTES} minutes.`);

  const row = await queryOne<SessionUser & { password_hash: string }>(
    "SELECT id, name, email, role, password_hash FROM users WHERE lower(email) = lower($1)",
    [input.email],
  );
  const ok = await verifyPassword(input.password, row?.password_hash ?? (await getDummyHash()));
  if (!row || !ok) {
    await query("INSERT INTO login_attempts (key_hash) VALUES ($1)", [key]);
    await query("DELETE FROM login_attempts WHERE created_at < now() - interval '1 day'");
    throw new AppError("INVALID_CREDENTIALS", "Incorrect email or password.");
  }
  await query("DELETE FROM login_attempts WHERE key_hash = $1", [key]);
  return { id: row.id, name: row.name, email: row.email, role: row.role as Role };
}
