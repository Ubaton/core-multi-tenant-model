/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT ADMIN API - Add admin user to existing tenant
 * POST /api/tenants/[id]/admin - Create admin user for tenant
 * GET  /api/tenants/[id]/admin - Get admin users for tenant
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
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
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!tenant) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }

  // Get all admin users for this tenant
  const adminUsers = await prisma.user.findMany({
    where: {
      tenantId: id,
      role: 'CHURCH_ADMIN',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

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
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!tenant) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    return errorResponse(
      'EMAIL_EXISTS',
      'A user account with this email already exists',
      400
    );
  }

  // Hash password
  const hashedPassword = await hashPassword(data.password);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: 'CHURCH_ADMIN',
      tenantId: id,
      isActive: true,
      mustChangePassword: true, // Enforce password change on first login
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

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
