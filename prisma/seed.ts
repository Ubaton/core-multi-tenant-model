/**
 * ════════════════════════════════════════════════════════════════════════════
 * DATABASE SEED SCRIPT
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Creates a SUPER_ADMIN user for system administration.
 * Run with: npx tsx prisma/seed.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../lib/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log('🌱 Starting database seed...');

  // Create HQ Tenant for SUPER_ADMIN
  const hqTenant = await prisma.tenant.upsert({
    where: { slug: 'churchhub-hq' },
    update: {},
    create: {
      name: 'ChurchHub HQ',
      slug: 'churchhub-hq',
      description: 'ChurchHub System Administration',
      country: 'South Africa',
      timezone: 'Africa/Johannesburg',
      isActive: true,
      isHQ: true,
    },
  });

  console.log('✅ HQ Tenant created:', hqTenant.name);

  // Create SUPER_ADMIN user
  const passwordHash = await bcrypt.hash('SuperAdmin@123', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@churchhub.com' },
    update: {},
    create: {
      email: 'superadmin@churchhub.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
      emailVerified: true,
      tenantId: hqTenant.id,
    },
  });

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

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  });
