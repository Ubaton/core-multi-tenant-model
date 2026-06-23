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

let prismaClient: PrismaClient;

if (connectionString.startsWith('prisma+postgres://')) {
  // Use accelerateUrl for Prisma Postgres / Accelerate
  prismaClient = globalForPrisma.prisma ?? new PrismaClient({
    accelerateUrl: connectionString,
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });
} else {
  const adapter = new PrismaPg({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });

  prismaClient = globalForPrisma.prisma ?? new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });
}

export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
