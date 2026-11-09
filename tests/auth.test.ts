import { describe, expect, it } from "vitest";
import { queryOne } from "@/lib/db/pool";
import {
  authenticate,
  signupUser,
  confirmUserEmail,
  resendConfirmationEmail,
} from "@/server/services/auth.service";
import { loginSchema, signupSchema } from "@/lib/validation/schemas";
import { AppError } from "@/lib/errors";

const base = { name: "Ada Lovelace", password: "Sup3rSecret", confirmPassword: "Sup3rSecret" };

describe("authentication", () => {
  it("AUTH-01 signs up an attendee and an organizer with the chosen role", async () => {
    const a = await signupUser({ ...base, email: "ada@example.com", role: "ATTENDEE" });
    const o = await signupUser({ ...base, email: "org@example.com", role: "ORGANIZER" });
    expect(a.role).toBe("ATTENDEE");
    expect(o.role).toBe("ORGANIZER");
  });

  it("AUTH-04 never stores the plaintext password (bcrypt hash)", async () => {
    const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE email = 'ada@example.com'");
    expect(row!.password_hash).not.toContain("Sup3rSecret");
    expect(row!.password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it("rejects duplicate emails regardless of case", async () => {
    await expect(signupUser({ ...base, email: "ADA@example.com", role: "ATTENDEE" })).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("AUTH-02 logs in with correct credentials", async () => {
    const u = await authenticate({ email: "ada@example.com", password: "Sup3rSecret" }, "1.1.1.1");
    expect(u.email).toBe("ada@example.com");
    expect(u).not.toHaveProperty("password_hash");
  });

  it("rejects invalid credentials with a generic message", async () => {
    const bad = await authenticate({ email: "ada@example.com", password: "wrong" }, "2.2.2.2").catch((e) => e);
    const unknown = await authenticate({ email: "nobody@example.com", password: "wrong" }, "2.2.2.2").catch((e) => e);
    expect(bad).toBeInstanceOf(AppError);
    expect(bad.code).toBe("INVALID_CREDENTIALS");
    expect(unknown.message).toBe(bad.message);
  });

  it("rate-limits repeated failed logins", async () => {
    for (let i = 0; i < 5; i++) await authenticate({ email: "ada@example.com", password: "nope" }, "3.3.3.3").catch(() => null);
    await expect(authenticate({ email: "ada@example.com", password: "Sup3rSecret" }, "3.3.3.3")).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("validates signup input (password rules, match, role, email)", () => {
    const bad = (o: object) => signupSchema.safeParse({ ...base, email: "x@example.com", role: "ATTENDEE", ...o }).success;
    expect(bad({})).toBe(true);
    expect(bad({ password: "short1", confirmPassword: "short1" })).toBe(false);
    expect(bad({ password: "onlyletters", confirmPassword: "onlyletters" })).toBe(false);
    expect(bad({ confirmPassword: "different1" })).toBe(false);
    expect(bad({ role: "ADMIN" })).toBe(false);
    expect(bad({ email: "not-an-email" })).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  describe("email confirmation", () => {
    it("generates a confirmation token when autoConfirm is false", async () => {
      const user = await signupUser(
        { ...base, email: "unconfirmed@example.com", role: "ATTENDEE" },
        { autoConfirm: false },
      );
      expect(user.email_confirmed_at).toBeNull();
      expect(user.confirmationToken).toBeDefined();
      expect(typeof user.confirmationToken).toBe("string");

      const dbUser = await queryOne<{ email_confirmed_at: Date | null }>(
        "SELECT email_confirmed_at FROM users WHERE id = $1",
        [user.id],
      );
      expect(dbUser?.email_confirmed_at).toBeNull();

      const confRow = await queryOne<{ id: string; user_id: string }>(
        "SELECT id, user_id FROM email_confirmations WHERE user_id = $1",
        [user.id],
      );
      expect(confRow).toBeDefined();
      expect(confRow?.user_id).toBe(user.id);
    });

    it("confirms user email with valid token and deletes token row", async () => {
      const user = await signupUser(
        { ...base, email: "confirmme@example.com", role: "ATTENDEE" },
        { autoConfirm: false },
      );
      const token = user.confirmationToken!;

      const confirmed = await confirmUserEmail(token);
      expect(confirmed.id).toBe(user.id);
      expect(confirmed.email_confirmed_at).not.toBeNull();

      // Ensure token row is deleted after use (single-use token)
      const confRow = await queryOne<{ id: string }>(
        "SELECT id FROM email_confirmations WHERE user_id = $1",
        [user.id],
      );
      expect(confRow).toBeNull();

      // Trying to confirm again with the same token fails
      await expect(confirmUserEmail(token)).rejects.toMatchObject({
        code: "INVALID_TOKEN",
      });
    });

    it("resendConfirmationEmail issues a new token for unconfirmed user", async () => {
      const res = await resendConfirmationEmail("unconfirmed@example.com");
      expect(res.sent).toBe(true);
      expect(res.token).toBeDefined();

      // Resending for non-existent or confirmed user returns sent: true without token
      const resFake = await resendConfirmationEmail("nobody_here_12345@example.com");
      expect(resFake.sent).toBe(true);
      expect(resFake.token).toBeUndefined();

      const resAlreadyConfirmed = await resendConfirmationEmail("ada@example.com");
      expect(resAlreadyConfirmed.sent).toBe(true);
      expect(resAlreadyConfirmed.token).toBeUndefined();
    });
  });
});
