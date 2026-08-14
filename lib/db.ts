/**
 * ════════════════════════════════════════════════════════════════════════════
 * POSTGRES DATABASE CLIENT (raw pg)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Singleton pg Pool with connection pooling for production use.
 * Prevents multiple instances during development hot reloads.
 */

import { Pool, type QueryResultRow, type PoolClient } from 'pg';
import { config as loadEnv } from 'dotenv';

// Fallback for non-Next runtimes where .env is not auto-loaded.
loadEnv({ quiet: true });

const globalForPg = globalThis as unknown as {
  pgPool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

function createPool(): Pool {
  return new Pool({
    connectionString: connectionString as string,
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 15000),
    ssl: (connectionString as string).includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });
}

const pool = globalForPg.pgPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

export { pool };
export default pool;

/**
 * Run a parameterized query and return the rows.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

/**
 * Run a parameterized query and return the full result (rowCount, rows, etc).
 */
export async function queryResult<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}

/**
 * Run a callback within a transaction. Automatically BEGIN/COMMIT/ROLLBACK.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    client.release();
  }
}
