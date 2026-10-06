/**
 * Create (or reset) a SUPER_ADMIN user in the database named by DATABASE_URL.
 *
 *   DATABASE_URL=... SEED_EMAIL=... SEED_PASSWORD=... node scripts/seed-super-admin.mjs
 *
 * Credentials come from the environment so they never land in the repo.
 * The user is attached to the existing HQ tenant (is_hq = true) and is forced
 * to change the password on first login.
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const { DATABASE_URL, SEED_EMAIL, SEED_PASSWORD } = process.env;
const SEED_FIRST_NAME = process.env.SEED_FIRST_NAME || 'Super';
const SEED_LAST_NAME = process.env.SEED_LAST_NAME || 'Admin';
const BCRYPT_ROUNDS = 12;

if (!DATABASE_URL || !SEED_EMAIL || !SEED_PASSWORD) {
  console.error('DATABASE_URL, SEED_EMAIL and SEED_PASSWORD must all be set.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
});

try {
  const tenant = await pool.query('SELECT id, name FROM tenant WHERE is_hq = true LIMIT 1');
  if (tenant.rowCount === 0) {
    throw new Error('No HQ tenant (is_hq = true) found; run the base seed first.');
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);
  const email = SEED_EMAIL.trim().toLowerCase();

  const result = await pool.query(
    `INSERT INTO "user" (id, email, password_hash, first_name, last_name, role, is_active, email_verified, tenant_id, must_change_password)
     VALUES ($1, $2, $3, $4, $5, 'SUPER_ADMIN', true, true, $6, true)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = 'SUPER_ADMIN',
       is_active = true,
       email_verified = true,
       tenant_id = EXCLUDED.tenant_id,
       must_change_password = true
     RETURNING id, email, role, (xmax = 0) AS inserted`,
    [randomUUID(), email, passwordHash, SEED_FIRST_NAME, SEED_LAST_NAME, tenant.rows[0].id]
  );

  const row = result.rows[0];
  console.log(`${row.inserted ? 'Created' : 'Updated'} ${row.role} ${row.email} in tenant "${tenant.rows[0].name}"`);
} catch (error) {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
