import fs from "fs";
import path from "path";
import { getPool } from "./pool";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

export async function resetDatabase() {
  const pool = getPool();
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
}

/** Applies any migrations not yet recorded in schema_migrations. Returns applied names. */
export async function runMigrations(): Promise<string[]> {
  const pool = getPool();
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const done = new Set((await pool.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      applied.push(file);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }
  return applied;
}
