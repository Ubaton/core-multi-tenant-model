/**
 * ════════════════════════════════════════════════════════════════════════════
 * SYSTEM CACHE API
 * POST /api/system/cache - Purge server-rendered route caches (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { revalidatePath } from 'next/cache';
import { withSuperAdmin, successResponse, logAudit } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const POST = withSuperAdmin(async (request, { user }) => {
  revalidatePath('/', 'layout');

  await logAudit(
    user.id,
    null, // Platform-wide action, no tenant
    'CLEAR_SYSTEM_CACHE',
    'System',
    'cache',
    null,
    null,
    request
  );

  return successResponse({ clearedAt: new Date().toISOString() });
});
