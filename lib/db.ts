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
import { Pool } from 'pg';

export { Prisma };

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
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
  // Reuse pool in development to avoid connection exhaustion
  const pool = globalForPrisma.pool ?? new Pool({ 
    connectionString,
    max: 10, // Maximum connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 10000, // Timeout after 10s trying to connect
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });

  // Create the Prisma adapter using the pg pool
  const adapter = new PrismaPg(pool);

  prismaClient = globalForPrisma.prisma ?? new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool;
  }
}

export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
