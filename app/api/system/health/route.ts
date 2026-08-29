/**
 * ════════════════════════════════════════════════════════════════════════════
 * SYSTEM HEALTH API
 * GET  /api/system/health - Last recorded probe (Super Admin only)
 * POST /api/system/health - Run a fresh probe (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { withSuperAdmin, successResponse } from '@/lib/api';
import { checkDatabaseHealth, getLastHealthReport } from '@/lib/system/health';

export const dynamic = 'force-dynamic';

export const GET = withSuperAdmin(async () => {
  const report = getLastHealthReport() ?? (await checkDatabaseHealth());
  return successResponse(report);
});

export const POST = withSuperAdmin(async () => {
  return successResponse(await checkDatabaseHealth());
});
