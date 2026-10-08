/**
 * Apply every pending hand-written SQL migration in prisma/migrations, in order.
 *
 *   npm run db:migrate
 *
 * This replaces `prisma migrate deploy` for this project. The migrations are
 * plain .sql files (not Prisma migration folders), so Prisma's own command has
 * nothing to run and Prisma 6 rejects the Prisma 7 schema outright.
 *
 * Applied files are recorded in a `schema_migration` table, so re-running is a
 * no-op. On a database that predates this runner (the app's tables already
 * exist but nothing is recorded), files 000-005 are recorded as applied
 * without being re-run; only newer files are executed.
 */
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import pg from 'pg';

const MIGRATIONS_DIR = 'prisma/migrations';
/** Files that were applied by hand before this runner existed. */
const BASELINE_THROUGH = '005_session_invalidation.sql';

// Prefer the real environment (hosting platforms); fall back to .env locally.
if (!process.env.DATABASE_URL) {
  try {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
      if (match) {
        process.env.DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, '');
        break;
      }
    }
  } catch {
    // no .env file; handled below
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
console.log(`Migrating ${new URL(process.env.DATABASE_URL).hostname} ...`);

await client.connect();
try {
  // Multiple container instances can start together. Only one migrates at a time.
  await client.query('SELECT pg_advisory_lock(73642108)');
  await client.query(
    `CREATE TABLE IF NOT EXISTS schema_migration (
       name TEXT PRIMARY KEY,
       applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );

  const recorded = await client.query('SELECT COUNT(*)::int AS n FROM schema_migration');
  if (recorded.rows[0].n === 0) {
    const existing = await client.query(`SELECT to_regclass('tenant') AS t`);
    if (existing.rows[0].t) {
      const baseline = files.filter((f) => f <= BASELINE_THROUGH);
      for (const name of baseline) {
        await client.query('INSERT INTO schema_migration (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
      }
      console.log(`Existing database detected: baselined ${baseline.length} earlier migrations.`);
    }
  }

  const done = new Set((await client.query('SELECT name FROM schema_migration')).rows.map((r) => r.name));
  const pending = files.filter((f) => !done.has(f));

  if (pending.length === 0) {
    console.log('Database is up to date.');
  }

  for (const name of pending) {
    console.log(`Applying ${name} ...`);
    await client.query('BEGIN');
    try {
      await client.query(readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8'));
      await client.query('INSERT INTO schema_migration (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
  if (pending.length > 0) console.log(`Applied ${pending.length} migration(s).`);
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  // Closing the session also releases the advisory lock on failure.
  await client.end();
}
