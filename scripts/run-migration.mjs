/**
 * Apply a hand-written SQL migration to DATABASE_URL.
 *
 * There is no psql on this machine and the migrations are plain .sql files, so
 * this runs one through the pg pool the app already uses.
 *
 *   node scripts/run-migration.mjs prisma/migrations/005_session_invalidation.sql
 */
import { readFileSync } from 'fs';
import pg from 'pg';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-migration.mjs <path-to-.sql>');
  process.exit(1);
}

// Load DATABASE_URL from .env without adding a dotenv dependency.
if (!process.env.DATABASE_URL) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
    if (match) {
      process.env.DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, '');
      break;
    }
  }
}

const sql = readFileSync(file, 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

const host = new URL(process.env.DATABASE_URL).hostname;
console.log(`Applying ${file} to ${host} ...`);

await client.connect();
try {
  await client.query(sql);
  console.log('Applied successfully.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
