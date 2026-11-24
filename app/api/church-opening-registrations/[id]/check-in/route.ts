import { errorResponse, successResponse, withPermission } from '@/lib/api';
import { query } from '@/lib/db';

export const POST = withPermission<{ id: string }>('update', 'member', async (_request, context, { id }) => {
  const [registration] = await query<{ checked_in_at: Date }>(
    `UPDATE church_opening_registration
     SET checked_in_at = COALESCE(checked_in_at, CURRENT_TIMESTAMP),
         updated_at = CASE WHEN checked_in_at IS NULL THEN CURRENT_TIMESTAMP ELSE updated_at END
     WHERE id = $1 AND tenant_id = $2
     RETURNING checked_in_at`,
    [id, context.tenantId]
  );

  if (!registration) return errorResponse('NOT_FOUND', 'Registration not found', 404);
  return successResponse({ checkedInAt: registration.checked_in_at });
});
