/**
 * ════════════════════════════════════════════════════════════════════════════
 * USERS API - GET, UPDATE, DELETE SINGLE USER
 * GET    /api/users/[id] - Get user details
 * PATCH  /api/users/[id] - Update user
 * DELETE /api/users/[id] - Delete user
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import {
  withSuperAdmin,
  successResponse,
  errorResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { z } from 'zod';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(['SUPER_ADMIN', 'CHURCH_ADMIN', 'STAFF', 'CALL_CENTER', 'SUBSCRIBER', 'MEMBER']).optional(),
  tenantId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  id: string;
}

const FIELD_TO_COLUMN: Record<string, string> = {
  email: 'email',
  firstName: 'first_name',
  lastName: 'last_name',
  phone: 'phone',
  role: 'role',
  tenantId: 'tenant_id',
  isActive: 'is_active',
  passwordHash: 'password_hash',
};

/**
 * GET /api/users/[id]
 * Get a single user's details
 */
export const GET = withSuperAdmin<RouteParams>(async (request: NextRequest, { user }, params) => {
  const { id } = params;

  const rows = await query<{
    id: string; email: string; first_name: string; last_name: string;
    phone: string | null; avatar: string | null; role: string; is_active: boolean;
    email_verified: boolean; last_login_at: Date | null; tenant_id: string | null;
    created_at: Date; updated_at: Date;
    tenant_name: string | null; tenant_slug: string | null;
  }>(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar, u.role,
            u.is_active, u.email_verified, u.last_login_at, u.tenant_id, u.created_at, u.updated_at,
            t.name AS tenant_name, t.slug AS tenant_slug
     FROM "user" u
     LEFT JOIN tenant t ON t.id = u.tenant_id
     WHERE u.id = $1`,
    [id]
  );

  const row = rows[0];
  if (!row) {
    return errorResponse('NOT_FOUND', 'User not found', 404);
  }

  const [callLogCount, assignedLeadCount, sentCommCount] = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM call_log WHERE operator_id = $1`, [id]),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM lead WHERE assigned_to_id = $1`, [id]),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM communication WHERE sender_id = $1`, [id]),
  ]);

  const targetUser = {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    avatar: row.avatar,
    role: row.role,
    isActive: row.is_active,
    emailVerified: row.email_verified,
    lastLoginAt: row.last_login_at,
    tenantId: row.tenant_id,
    tenant: row.tenant_id ? { id: row.tenant_id, name: row.tenant_name, slug: row.tenant_slug } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _count: {
      callLogs: Number(callLogCount[0]?.count ?? 0),
      assignedLeads: Number(assignedLeadCount[0]?.count ?? 0),
      sentCommunications: Number(sentCommCount[0]?.count ?? 0),
    },
  };

  return successResponse(targetUser);
});

/**
 * PATCH /api/users/[id]
 * Update a user
 */
export const PATCH = withSuperAdmin<RouteParams>(async (request: NextRequest, { user }, params) => {
  const { id } = params;
  const body = await parseBody(request, updateUserSchema);

  const existingRows = await query<{ id: string; email: string; role: string }>(
    `SELECT id, email, role FROM "user" WHERE id = $1`,
    [id]
  );
  const existingUser = existingRows[0];

  if (!existingUser) {
    return errorResponse('NOT_FOUND', 'User not found', 404);
  }

  // Check for email uniqueness if changing email
  if (body.email && body.email !== existingUser.email) {
    const emailTaken = await query<{ id: string }>(
      `SELECT id FROM "user" WHERE email = $1`,
      [body.email]
    );
    if (emailTaken.length > 0) {
      return errorResponse('CONFLICT', 'Email already exists', 409);
    }
  }

  // Prepare update data
  const updateData: Record<string, unknown> = { ...body };

  // Hash password if provided
  if (body.password) {
    updateData.passwordHash = await bcrypt.hash(body.password, 12);
    delete updateData.password;
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(updateData)) {
    const column = FIELD_TO_COLUMN[key];
    if (!column) continue;
    values.push(value);
    setClauses.push(`${column} = $${values.length}`);
  }

  if (setClauses.length === 0) {
    // Nothing to update; fetch current state to return
    setClauses.push(`updated_at = updated_at`);
  }

  values.push(id);

  const updatedRows = await query<{
    id: string; email: string; first_name: string; last_name: string;
    phone: string | null; avatar: string | null; role: string; is_active: boolean;
    email_verified: boolean; tenant_id: string | null; updated_at: Date;
  }>(
    `UPDATE "user" SET ${setClauses.join(', ')} WHERE id = $${values.length}
     RETURNING id, email, first_name, last_name, phone, avatar, role, is_active, email_verified, tenant_id, updated_at`,
    values
  );

  const row = updatedRows[0];

  let tenant: { id: string; name: string; slug: string } | null = null;
  if (row.tenant_id) {
    const tenantRows = await query<{ id: string; name: string; slug: string }>(
      `SELECT id, name, slug FROM tenant WHERE id = $1`,
      [row.tenant_id]
    );
    tenant = tenantRows[0] ?? null;
  }

  const updatedUser = {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    avatar: row.avatar,
    role: row.role,
    isActive: row.is_active,
    emailVerified: row.email_verified,
    tenantId: row.tenant_id,
    tenant,
    updatedAt: row.updated_at,
  };

  await logAudit(
    user.id,
    user.tenantId,
    'UPDATE',
    'User',
    id,
    { email: existingUser.email, role: existingUser.role },
    { email: updatedUser.email, role: updatedUser.role }
  );

  return successResponse(updatedUser);
});

/**
 * DELETE /api/users/[id]
 * Delete a user
 */
export const DELETE = withSuperAdmin<RouteParams>(async (request: NextRequest, { user }, params) => {
  const { id } = params;

  // Prevent self-deletion
  if (id === user.id) {
    return errorResponse('BAD_REQUEST', 'Cannot delete your own account', 400);
  }

  const existingRows = await query<{ id: string; email: string; role: string }>(
    `SELECT id, email, role FROM "user" WHERE id = $1`,
    [id]
  );
  const existingUser = existingRows[0];

  if (!existingUser) {
    return errorResponse('NOT_FOUND', 'User not found', 404);
  }

  await query(`DELETE FROM "user" WHERE id = $1`, [id]);

  await logAudit(
    user.id,
    user.tenantId,
    'DELETE',
    'User',
    id,
    { email: existingUser.email, role: existingUser.role }
  );

  return successResponse({ message: 'User deleted successfully' });
});
