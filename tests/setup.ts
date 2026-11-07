import { afterAll, beforeAll } from "vitest";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

// Always run against a dedicated test database, never the dev/prod one.
const base = process.env.TEST_DATABASE_URL || (process.env.DATABASE_URL ?? "").replace(/\/([^/?]+)(\?.*)?$/, "/$1_test$2");
process.env.DATABASE_URL = base;
process.env.BCRYPT_ROUNDS = "4";
process.env.APP_TIMEZONE = "UTC";

beforeAll(async () => {
  const { resetDatabase, runMigrations } = await import("@/lib/db/migrate");
  await resetDatabase();
  await runMigrations();
});

afterAll(async () => {
  const { closePool } = await import("@/lib/db/pool");
  await closePool();
});
