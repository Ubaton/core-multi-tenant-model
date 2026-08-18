/**
 * ════════════════════════════════════════════════════════════════════════════
 * PRISMA CLIENT (driver adapter: @prisma/adapter-pg)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Singleton PrismaClient backed by the PostgreSQL driver adapter, as required
 * by Prisma ORM 7 for SQL providers. Prevents multiple instances during
 * development hot reloads.
 *
 * Coexists with the raw `pg` pool in lib/db.ts; both read DATABASE_URL.
 */

import { PrismaClient } from './generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnv } from 'dotenv';

// Fallback for non-Next runtimes where .env is not auto-loaded.
loadEnv({ quiet: true });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { prisma };
export default prisma;
