import crypto from "crypto";
import { query, queryOne } from "@/lib/db/pool";
import { getEnv } from "@/lib/env";
import { AppError, mapDbError } from "@/lib/errors";
import { sendConfirmationEmail } from "@/server/services/email.service";
import { getDummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import type { LoginInput, SignupInput } from "@/lib/validation/schemas";
import type { Role, SessionUser } from "@/types";

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
const CONFIRMATION_TOKEN_HOURS = 24;

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

/** Creates an email confirmation token in Supabase Postgres and returns the raw token */
export async function createEmailConfirmationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + CONFIRMATION_TOKEN_HOURS * 3600_000);
  // Clean up any existing tokens for this user first
  await query("DELETE FROM email_confirmations WHERE user_id = $1", [userId]);
  await query(
    `INSERT INTO email_confirmations (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, sha256(token), expires],
  );
  return token;
}

/** Confirms a user's email using a valid token in Supabase Postgres */
export async function confirmUserEmail(rawToken: string): Promise<SessionUser> {
  const tokenHash = sha256(rawToken.trim());
  const confirmation = await queryOne<{ id: string; user_id: string; expires_at: Date }>(
    `SELECT id, user_id, expires_at
       FROM email_confirmations
      WHERE token_hash = $1`,
    [tokenHash],
  );

  if (!confirmation) {
    throw new AppError("INVALID_TOKEN", "Confirmation token is invalid or has already been used.");
  }

  if (new Date(confirmation.expires_at).getTime() < Date.now()) {
    await query("DELETE FROM email_confirmations WHERE id = $1", [confirmation.id]);
    throw new AppError("TOKEN_EXPIRED", "Confirmation token has expired. Please request a new one.");
  }

  // Atomically mark user confirmed and remove the token
  const user = await queryOne<{
    id: string;
    name: string;
    email: string;
    role: Role;
    email_confirmed_at: Date | null;
  }>(
    `UPDATE users
        SET email_confirmed_at = now(), updated_at = now()
      WHERE id = $1
      RETURNING id, name, email, role, email_confirmed_at`,
    [confirmation.user_id],
  );

  await query("DELETE FROM email_confirmations WHERE id = $1", [confirmation.id]);

  if (!user) {
    throw new AppError("NOT_FOUND", "User associated with this token no longer exists.");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    email_confirmed_at: user.email_confirmed_at,
  };
}

/** Resends an email confirmation token for an unconfirmed user */
export async function resendConfirmationEmail(email: string): Promise<{ sent: boolean; token?: string }> {
  const user = await queryOne<{ id: string; name: string; email_confirmed_at: Date | null }>(
    "SELECT id, name, email_confirmed_at FROM users WHERE lower(email) = lower($1)",
    [email],
  );

  // Return success even if not found or already confirmed to prevent email enumeration
  if (!user || user.email_confirmed_at !== null) {
    return { sent: true };
  }

  const token = await createEmailConfirmationToken(user.id);
  await sendConfirmationEmail({
    to: email,
    name: user.name,
    token,
  });

  return { sent: true, token };
}

export async function signupUser(
  input: SignupInput,
  options?: { autoConfirm?: boolean },
): Promise<SessionUser & { confirmationToken?: string }> {
  const passwordHash = await hashPassword(input.password);
  const autoConfirm = options?.autoConfirm ?? true;
  try {
    const user = await queryOne<{
      id: string;
      name: string;
      email: string;
      role: Role;
      email_confirmed_at: Date | null;
    }>(
      `INSERT INTO users (name, email, password_hash, role, email_confirmed_at)
       VALUES ($1, $2, $3, $4, ${autoConfirm ? "now()" : "NULL"})
       RETURNING id, name, email, role, email_confirmed_at`,
      [input.name, input.email, passwordHash, input.role],
    );

    let confirmationToken: string | undefined;
    if (!autoConfirm) {
      confirmationToken = await createEmailConfirmationToken(user!.id);
      await sendConfirmationEmail({
        to: user!.email,
        name: user!.name,
        token: confirmationToken,
      });
    }

    return {
      id: user!.id,
      name: user!.name,
      email: user!.email,
      role: user!.role,
      email_confirmed_at: user!.email_confirmed_at,
      confirmationToken,
    };
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

  const row = await queryOne<SessionUser & { password_hash: string; email_confirmed_at: Date | null }>(
    "SELECT id, name, email, role, password_hash, email_confirmed_at FROM users WHERE lower(email) = lower($1)",
    [input.email],
  );
  const ok = await verifyPassword(input.password, row?.password_hash ?? (await getDummyHash()));
  if (!row || !ok) {
    await query("INSERT INTO login_attempts (key_hash) VALUES ($1)", [key]);
    await query("DELETE FROM login_attempts WHERE created_at < now() - interval '1 day'");
    throw new AppError("INVALID_CREDENTIALS", "Incorrect email or password.");
  }
  await query("DELETE FROM login_attempts WHERE key_hash = $1", [key]);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as Role,
    email_confirmed_at: row.email_confirmed_at,
  };
}
