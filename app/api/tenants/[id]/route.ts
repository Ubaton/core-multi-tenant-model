/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANTS API - SINGLE TENANT OPERATIONS
 * GET    /api/tenants/[id] - Get tenant details
 * PATCH  /api/tenants/[id] - Update tenant
 * DELETE /api/tenants/[id] - Delete tenant (soft delete)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  withSuperAdmin, 
  successResponse,
  errorResponse,
  noContentResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { updateTenantSchema, idParamSchema } from '@/lib/validations';

type RouteParams = { id: string };

/**
 * GET /api/tenants/[id]
 * Get tenant details
 */
export const GET = withSuperAdmin<RouteParams>(async (request, { user }, params) => {
  const { id } = idParamSchema.parse(params);

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      branches: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
      _count: {
        select: {
          users: true,
          members: true,
          leads: true,
          offerings: true,
          prayerRequests: true,
        },
      },
    },
  });

  if (!tenant) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }

  // Get total offerings amount for this tenant
  const offeringTotal = await prisma.offering.aggregate({
    where: { tenantId: id },
    _sum: { amount: true },
  });

  // Get this month's offerings
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthOfferings = await prisma.offering.aggregate({
    where: { 
      tenantId: id,
      givenAt: { gte: startOfMonth },
    },
    _sum: { amount: true },
    _count: true,
  });

  return successResponse({
    ...tenant,
    totalOfferings: offeringTotal._sum.amount?.toString() ?? '0',
    thisMonthOfferings: {
      total: thisMonthOfferings._sum.amount?.toString() ?? '0',
      count: thisMonthOfferings._count,
    },
  });
});

/**
 * PATCH /api/tenants/[id]
 * Update tenant
 */
export const PATCH = withSuperAdmin<RouteParams>(async (request, { user }, params) => {
  const { id } = idParamSchema.parse(params);
  const data = await parseBody(request, updateTenantSchema);

  // Get current tenant for audit
  const existingTenant = await prisma.tenant.findUnique({
    where: { id },
  });

  if (!existingTenant) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }

  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      ...data,
      slug: data.slug?.toLowerCase(),
    },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  // Log audit
  await logAudit(
    user.id,
    null,
    'UPDATE_TENANT',
    'Tenant',
    tenant.id,
    existingTenant,
    tenant,
    request
  );

  return successResponse(tenant);
});

/**
 * DELETE /api/tenants/[id]
 * Soft delete tenant (set isActive to false)
 */
export const DELETE = withSuperAdmin<RouteParams>(async (request, { user }, params) => {
  const { id } = idParamSchema.parse(params);

  const existingTenant = await prisma.tenant.findUnique({
    where: { id },
  });

  if (!existingTenant) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }

  // Soft delete - set isActive to false
  await prisma.tenant.update({
    where: { id },
    data: { isActive: false },
  });

  // Log audit
  await logAudit(
    user.id,
    null,
    'DELETE_TENANT',
    'Tenant',
    id,
    existingTenant,
    { isActive: false },
    request
  );

  return noContentResponse();
});
