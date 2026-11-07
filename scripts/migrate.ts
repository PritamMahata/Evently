import "dotenv/config";
// Migrations and seeding use the direct (non-pooled) connection when one is provided.
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;
import { runMigrations, resetDatabase } from "@/lib/db/migrate";
import { closePool } from "@/lib/db/pool";

async function main() {
  if (process.argv.includes("--reset")) {
    if (process.env.NODE_ENV === "production") throw new Error("Refusing to reset a production database");
    await resetDatabase();
    console.log("Schema dropped.");
  }
  const applied = await runMigrations();
  console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Database is up to date.");
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(closePool);
