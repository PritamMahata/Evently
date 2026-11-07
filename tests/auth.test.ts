import { describe, expect, it } from "vitest";
import { queryOne } from "@/lib/db/pool";
import { authenticate, signupUser } from "@/server/services/auth.service";
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
});
