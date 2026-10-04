/**
 * ════════════════════════════════════════════════════════════════════════════
 * REGISTRATION API (authenticated, tenant-scoped)
 * PATCH /api/registrations/[id] - Mark a submission as reviewed
 * ════════════════════════════════════════════════════════════════════════════
 */

import { query } from '@/lib/db';
import { withPermission, successResponse, errorResponse } from '@/lib/api';

export const PATCH = withPermission<{ id: string }>('update', 'member', async (_request, context, { id }) => {
  const rows = await query<{ id: string; status: string }>(
    `UPDATE member_registration SET status = 'REVIEWED', updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING id, status`,
    [id, context.tenantId]
  );

  if (!rows[0]) return errorResponse('NOT_FOUND', 'Registration not found', 404);
  return successResponse(rows[0]);
});
