/**
 * ════════════════════════════════════════════════════════════════════════════
 * REGISTRATION LINK API (authenticated)
 * GET  /api/registrations/link - Current shareable link token for this church
 * POST /api/registrations/link - Create the link, or rotate it (revokes the old URL/QR)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { randomUUID } from 'crypto';
import { query } from '@/lib/db';
import { withAuth, withPermission, successResponse, errorResponse, logAudit } from '@/lib/api';
import { generateRegistrationToken } from '@/lib/registration/server';
import { canManageRegistrationLink } from '@/lib/registration/permissions';

interface LinkRow {
  token: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function toLink(row: LinkRow) {
  return {
    token: row.token,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const GET = withPermission('list', 'member', async (_request, context) => {
  const rows = await query<LinkRow>(
    `SELECT token, is_active, created_at, updated_at FROM registration_link WHERE tenant_id = $1`,
    [context.tenantId]
  );
  return successResponse(rows[0] ? toLink(rows[0]) : null);
});

export const POST = withAuth(async (request, context) => {
  if (!canManageRegistrationLink(context.user.role)) {
    return errorResponse('FORBIDDEN', 'Only super admins and church admins can generate registration QR codes', 403);
  }

  if (!context.tenantId) {
    return errorResponse('TENANT_REQUIRED', 'Select a church first', 400);
  }

  const rows = await query<LinkRow>(
    `INSERT INTO registration_link (id, tenant_id, token, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id) DO UPDATE
       SET token = EXCLUDED.token, is_active = TRUE, expires_at = NULL,
           created_by = EXCLUDED.created_by, updated_at = NOW()
     RETURNING token, is_active, created_at, updated_at`,
    [randomUUID(), context.tenantId, generateRegistrationToken(), context.user.id]
  );

  // The token itself is a credential: never write it to the audit trail.
  await logAudit(context.user.id, context.tenantId, 'ROTATE_REGISTRATION_LINK', 'RegistrationLink', context.tenantId, null, null, request);

  return successResponse(toLink(rows[0]), undefined, 201);
});
