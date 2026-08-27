/**
 * ════════════════════════════════════════════════════════════════════════════
 * SUPER ADMIN AUDIT TRAIL API
 * GET /api/super-admin/audit-logs - List audit log entries (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Every mutating route calls logAudit(), so this table is the permanent record
 * of who changed what. Deleted tenants and users are soft deleted, which means
 * the actor and the affected record both stay resolvable here forever.
 */

import { query } from '@/lib/db';
import {
  withSuperAdmin,
  successResponse,
  calculatePagination,
  createPaginationMeta,
} from '@/lib/api';

type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: unknown;
  new_data: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  user_id: string;
  user_email: string | null;
  user_first_name: string | null;
  user_last_name: string | null;
  user_role: string | null;
  user_deleted_at: Date | null;
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_deleted_at: Date | null;
};

function mapAuditLog(row: AuditLogRow) {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldData: row.old_data ?? null,
    newData: row.new_data ?? null,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    actor: {
      id: row.user_id,
      email: row.user_email,
      firstName: row.user_first_name,
      lastName: row.user_last_name,
      role: row.user_role,
      isDeleted: row.user_deleted_at !== null,
    },
    tenant: row.tenant_id
      ? {
          id: row.tenant_id,
          name: row.tenant_name,
          isDeleted: row.tenant_deleted_at !== null,
        }
      : null,
  };
}

export type AuditLogEntry = ReturnType<typeof mapAuditLog>;

/**
 * GET /api/super-admin/audit-logs
 *
 * Filters: action, entityType, entityId, userId, tenantId, from, to, search.
 * Newest first, paginated.
 */
export const GET = withSuperAdmin(async (request) => {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 25) || 25));
  const { skip, take } = calculatePagination(page, pageSize);

  const conditions: string[] = [];
  const params: unknown[] = [];

  const pushCondition = (sql: (idx: number) => string, value: unknown) => {
    params.push(value);
    conditions.push(sql(params.length));
  };

  const action = searchParams.get('action');
  if (action) pushCondition((i) => `a.action = $${i}`, action);

  const entityType = searchParams.get('entityType');
  if (entityType) pushCondition((i) => `a.entity_type = $${i}`, entityType);

  const entityId = searchParams.get('entityId');
  if (entityId) pushCondition((i) => `a.entity_id = $${i}`, entityId);

  const userId = searchParams.get('userId');
  if (userId) pushCondition((i) => `a.user_id = $${i}`, userId);

  const tenantId = searchParams.get('tenantId');
  if (tenantId) pushCondition((i) => `a.tenant_id = $${i}`, tenantId);

  const from = searchParams.get('from');
  if (from) pushCondition((i) => `a.created_at >= $${i}`, from);

  const to = searchParams.get('to');
  if (to) pushCondition((i) => `a.created_at <= $${i}`, to);

  const search = searchParams.get('search');
  if (search) {
    params.push(`%${search}%`);
    const i = params.length;
    conditions.push(
      `(a.action ILIKE $${i} OR a.entity_type ILIKE $${i} OR a.entity_id ILIKE $${i}
        OR u.email ILIKE $${i} OR u.first_name ILIKE $${i} OR u.last_name ILIKE $${i}
        OR t.name ILIKE $${i})`
    );
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // The joins deliberately do NOT filter deleted_at: an audit entry must stay
  // readable even once its actor or tenant has been deleted.
  const fromClause = `
    FROM audit_log a
    LEFT JOIN "user" u ON u.id = a.user_id
    LEFT JOIN tenant t ON t.id = a.tenant_id
  `;

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const [rows, countRows] = await Promise.all([
    query<AuditLogRow>(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.old_data, a.new_data,
              a.ip_address, a.user_agent, a.created_at,
              a.user_id, u.email AS user_email, u.first_name AS user_first_name,
              u.last_name AS user_last_name, u.role AS user_role,
              u.deleted_at AS user_deleted_at,
              a.tenant_id, t.name AS tenant_name, t.deleted_at AS tenant_deleted_at
       ${fromClause}
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, take, skip]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count ${fromClause} ${whereClause}`,
      params
    ),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);

  return successResponse(
    rows.map(mapAuditLog),
    createPaginationMeta(page, pageSize, totalCount)
  );
});
