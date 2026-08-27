/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUDIT TRAIL FILTER OPTIONS
 * GET /api/super-admin/audit-logs/filters - Distinct values for the filter UI
 * ════════════════════════════════════════════════════════════════════════════
 */

import { query } from '@/lib/db';
import { withSuperAdmin, successResponse } from '@/lib/api';

export const GET = withSuperAdmin(async () => {
  const [actions, entityTypes, actors] = await Promise.all([
    query<{ action: string }>(`SELECT DISTINCT action FROM audit_log ORDER BY action ASC`),
    query<{ entity_type: string }>(
      `SELECT DISTINCT entity_type FROM audit_log ORDER BY entity_type ASC`
    ),
    // Actors include deleted users - their past actions still need attributing.
    query<{ id: string; email: string; first_name: string; last_name: string }>(
      `SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
       FROM audit_log a JOIN "user" u ON u.id = a.user_id
       ORDER BY u.first_name ASC`
    ),
  ]);

  return successResponse({
    actions: actions.map((r) => r.action),
    entityTypes: entityTypes.map((r) => r.entity_type),
    actors: actors.map((r) => ({
      id: r.id,
      email: r.email,
      name: `${r.first_name} ${r.last_name}`.trim(),
    })),
  });
});
