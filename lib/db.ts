/**
 * ════════════════════════════════════════════════════════════════════════════
 * PRISMA DATABASE CLIENT
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Singleton Prisma client with connection pooling for production use.
 * Prevents multiple instances during development hot reloads.
 * 
 * Prisma 7+ requires a database adapter for the client engine.
 * Using @prisma/adapter-pg with the pg driver.
 */

import { PrismaClient, Prisma } from './generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnv } from 'dotenv';

export { Prisma };

// Fallback for non-Next runtimes where .env is not auto-loaded.
loadEnv();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create a connection pool for PostgreSQL
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const logLevel = process.env.NODE_ENV === 'development'
  ? ['query', 'error', 'warn']
  : ['error'];

function createPrismaClient(): PrismaClient {
  if (connectionString.startsWith('prisma+postgres://')) {
    // Use accelerateUrl for Prisma Postgres / Accelerate
    return new PrismaClient({
      accelerateUrl: connectionString,
      log: logLevel,
    });
  }

  // Create the pool only when we actually instantiate PrismaClient.
  // This avoids leaking pools during Next.js hot-reload cycles.
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 15000),
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });

  return new PrismaClient({
    adapter,
    log: logLevel,
  });
}

const prismaClient = globalForPrisma.prisma ?? createPrismaClient();

export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
