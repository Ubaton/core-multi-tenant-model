/**
 * ════════════════════════════════════════════════════════════════════════════
 * DATABASE SEED SCRIPT
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Creates a SUPER_ADMIN user for system administration.
 * Run with: npx tsx prisma/seed.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });

  console.log('🌱 Starting database seed...');

  // Create HQ Tenant for SUPER_ADMIN
  const tenantRows = await pool.query<{ id: string; name: string }>(
    `INSERT INTO tenant (id, name, slug, description, country, timezone, is_active, is_hq)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (slug) DO UPDATE SET
       description = EXCLUDED.description
     RETURNING id, name`,
    [
      randomUUID(),
      'ChurchHub HQ',
      'churchhub-hq',
      'ChurchHub System Administration',
      'South Africa',
      'Africa/Johannesburg',
      true,
      true,
    ]
  );
  const hqTenant = tenantRows.rows[0];

  console.log('✅ HQ Tenant created:', hqTenant.name);

  // Create SUPER_ADMIN user
  const passwordHash = await bcrypt.hash('SuperAdmin@123', 12);

  const userRows = await pool.query<{ id: string; email: string }>(
    `INSERT INTO "user" (id, email, password_hash, first_name, last_name, role, is_active, email_verified, tenant_id, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       role = EXCLUDED.role,
       is_active = EXCLUDED.is_active,
       email_verified = EXCLUDED.email_verified,
       tenant_id = EXCLUDED.tenant_id,
       must_change_password = EXCLUDED.must_change_password
     RETURNING id, email`,
    [
      randomUUID(),
      'superadmin@churchhub.com',
      passwordHash,
      'Super',
      'Admin',
      'SUPER_ADMIN',
      true,
      true,
      hqTenant.id,
      true,
    ]
  );
  const superAdmin = userRows.rows[0];

  console.log('✅ SUPER_ADMIN user created:', superAdmin.email);
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('  SUPER_ADMIN CREDENTIALS');
  console.log('════════════════════════════════════════════════════════════');
  console.log('  Email:    superadmin@churchhub.com');
  console.log('  Password: SuperAdmin@123');
  console.log('════════════════════════════════════════════════════════════');
  console.log('');
  console.log('⚠️  IMPORTANT: Change this password after first login!');
  console.log('');

  await pool.end();
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  });
