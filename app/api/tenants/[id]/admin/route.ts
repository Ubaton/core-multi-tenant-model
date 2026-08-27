/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT ADMIN API - Add admin user to existing tenant
 * POST /api/tenants/[id]/admin - Create admin user for tenant
 * GET  /api/tenants/[id]/admin - Get admin users for tenant
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';
import { hashPassword } from '@/lib/auth';
import {
  withSuperAdmin,
  successResponse,
  createdResponse,
  errorResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { idParamSchema } from '@/lib/validations';
import { z } from 'zod';

type RouteParams = { id: string };

const createTenantAdminSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().max(20).optional(),
});

/**
 * GET /api/tenants/[id]/admin
 * Get all admin users for a tenant
 */
export const GET = withSuperAdmin<RouteParams>(async (request, { user }, params) => {
  const { id } = idParamSchema.parse(params);

  // Check if tenant exists
  const tenantRows = await query<{ id: string; name: string }>(
    `SELECT id, name FROM tenant WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const tenant = tenantRows[0];

  if (!tenant) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }

  // Get all admin users for this tenant
  const adminUserRows = await query<{
    id: string; email: string; first_name: string; last_name: string;
    phone: string | null; is_active: boolean; last_login_at: Date | null; created_at: Date;
  }>(
    `SELECT id, email, first_name, last_name, phone, is_active, last_login_at, created_at
     FROM "user" WHERE tenant_id = $1 AND role = 'CHURCH_ADMIN' AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [id]
  );

  const adminUsers = adminUserRows.map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  }));

  return successResponse({
    tenant: { id: tenant.id, name: tenant.name },
    adminUsers,
    hasAdmin: adminUsers.length > 0,
  });
});

/**
 * POST /api/tenants/[id]/admin
 * Create an admin user for an existing tenant
 */
export const POST = withSuperAdmin<RouteParams>(async (request, { user }, params) => {
  const { id } = idParamSchema.parse(params);
  const data = await parseBody(request, createTenantAdminSchema);

  // Check if tenant exists
  const tenantRows = await query<{ id: string; name: string }>(
    `SELECT id, name FROM tenant WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const tenant = tenantRows[0];

  if (!tenant) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }

  // Check if email already exists
  const existingUserRows = await query<{ id: string }>(
    `SELECT id FROM "user" WHERE email = $1`,
    [data.email]
  );

  if (existingUserRows.length > 0) {
    return errorResponse(
      'EMAIL_EXISTS',
      'A user account with this email already exists',
      400
    );
  }

  // Hash password
  const hashedPassword = await hashPassword(data.password);

  // Create admin user
  const userId = randomUUID();
  const createdRows = await query<{
    id: string; email: string; first_name: string; last_name: string;
    role: string; is_active: boolean; created_at: Date;
  }>(
    `INSERT INTO "user" (id, email, password_hash, first_name, last_name, phone, role, tenant_id, is_active, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, 'CHURCH_ADMIN', $7, true, true)
     RETURNING id, email, first_name, last_name, role, is_active, created_at`,
    [
      userId,
      data.email,
      hashedPassword,
      data.firstName,
      data.lastName,
      data.phone ?? null,
      id,
    ]
  );
  const createdRow = createdRows[0];
  const adminUser = {
    id: createdRow.id,
    email: createdRow.email,
    firstName: createdRow.first_name,
    lastName: createdRow.last_name,
    role: createdRow.role,
    isActive: createdRow.is_active,
    createdAt: createdRow.created_at,
  };

  // Log audit
  await logAudit(
    user.id,
    null,
    'CREATE_TENANT_ADMIN',
    'User',
    adminUser.id,
    null,
    {
      user: adminUser,
      tenantId: id,
      tenantName: tenant.name,
    },
    request
  );

  return createdResponse({
    adminUser,
    tenant: { id: tenant.id, name: tenant.name },
    generatedPassword: data.password, // Return password so Super Admin can share it
  });
});
