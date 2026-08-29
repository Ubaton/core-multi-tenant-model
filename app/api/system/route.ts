/**
 * ════════════════════════════════════════════════════════════════════════════
 * SYSTEM INFORMATION API
 * GET /api/system - Runtime versions and environment (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { withSuperAdmin, successResponse } from '@/lib/api';
import { checkDatabaseHealth } from '@/lib/system/health';
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
  const [nextVersion, health] = await Promise.all([
    getNextVersion(),
    checkDatabaseHealth(),
  ]);

  return successResponse({
    appVersion: pkg.version,
    nodeVersion: process.version.replace(/^v/, ''),
    nextVersion,
    database: health.database ?? 'PostgreSQL (unreachable)',
    health,
    environment: process.env.NODE_ENV ?? 'development',
    uptimeSeconds: Math.floor(process.uptime()),
  });
});
