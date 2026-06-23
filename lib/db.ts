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
import { withAccelerate } from '@prisma/extension-accelerate';
import { config as loadEnv } from 'dotenv';

export { Prisma };

// Fallback for non-Next runtimes where .env is not auto-loaded.
loadEnv();

// The withAccelerate() extension changes the return type, so we infer it.
const createExtendedClient = () => new PrismaClient({ log: ['error'] }).$extends(withAccelerate());
type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

// Create a connection pool for PostgreSQL
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const logLevel = process.env.NODE_ENV === 'development'
  ? (['query', 'error', 'warn'] as const)
  : (['error'] as const);

function createPrismaClient(): ExtendedPrismaClient {
  if (connectionString.startsWith('prisma://') || connectionString.startsWith('prisma+postgres://')) {
    // Use Accelerate for connection pooling + caching
    return new PrismaClient({
      accelerateUrl: connectionString,
      log: logLevel,
    }).$extends(withAccelerate()) as unknown as ExtendedPrismaClient;
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
  }).$extends(withAccelerate()) as unknown as ExtendedPrismaClient;
}

const prismaClient = globalForPrisma.prisma ?? createPrismaClient();

export const prisma = prismaClient;
export type { ExtendedPrismaClient };

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
