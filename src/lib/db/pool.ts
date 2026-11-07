import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { getEnv } from "@/lib/env";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };

export function getPool(): Pool {
  if (!globalForPg.__pgPool) {
    const env = getEnv();
    globalForPg.__pgPool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
      max: env.isProd ? 5 : 10,
    });
  }
  return globalForPg.__pgPool;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await getPool().query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Runs `fn` in a single transaction; rolls back on any thrown error. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (globalForPg.__pgPool) {
    await globalForPg.__pgPool.end();
    globalForPg.__pgPool = undefined;
  }
}
