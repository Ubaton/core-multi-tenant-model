/**
 * ════════════════════════════════════════════════════════════════════════════
 * SYSTEM INFORMATION API
 * GET /api/system - Runtime versions and environment (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { query } from '@/lib/db';
import { withSuperAdmin, successResponse } from '@/lib/api';
import pkg from '@/package.json';

export const dynamic = 'force-dynamic';

/** Installed Next.js version, falling back to the range declared in package.json. */
async function getNextVersion(): Promise<string> {
  try {
    const { version } = await import('next/package.json');
    if (typeof version === 'string') return version;
  } catch {
    // fall through to the declared range
  }
  return pkg.dependencies.next.replace(/^[\^~]/, '');
}

export const GET = withSuperAdmin(async () => {
  const [nextVersion, database] = await Promise.all([
    getNextVersion(),
    getDatabaseVersion(),
  ]);

  return successResponse({
    appVersion: pkg.version,
    nodeVersion: process.version.replace(/^v/, ''),
    nextVersion,
    database,
    environment: process.env.NODE_ENV ?? 'development',
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

/** Read the PostgreSQL server version, e.g. "PostgreSQL 16.4". */
async function getDatabaseVersion(): Promise<string> {
  try {
    const rows = await query<{ version: string }>('SELECT version()');
    const raw = rows[0]?.version ?? '';
    const match = raw.match(/^PostgreSQL\s+([\d.]+)/i);
    return match ? `PostgreSQL ${match[1]}` : 'PostgreSQL';
  } catch {
    return 'PostgreSQL';
  }
}
